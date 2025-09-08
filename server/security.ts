import type { Request, Response, NextFunction } from 'express';
import express, { type Express } from 'express';
import helmet from 'helmet';

import { moderationSystem } from './moderation';
import { getDeviceIdFromHeaders } from './utils/device';
import { OperationalError } from './middleware/errorHandler';

// Rate limiting maps
const authRequestCounts = new Map<string, { count: number; resetTime: number }>();
const messageRequestCounts = new Map<string, { count: number; resetTime: number }>();
const friendRequestCounts = new Map<string, { count: number; resetTime: number }>();
const blockedIPs = new Set<string>();

// Helper to apply a simple sliding window limiter
function applyLimiter(
  key: string,
  store: Map<string, { count: number; resetTime: number }>,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetTime) {
    store.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  if (entry.count >= limit) {
    return false;
  }
  entry.count++;
  return true;
}

/* Rate limiters removed per user request */

// IP security check middleware
export function checkIPSecurity(req: Request, res: Response, next: NextFunction): void {
  // Honor reverse proxy headers first
  const forwarded = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
  const real = (req.headers['x-real-ip'] as string | undefined)?.trim();
  const clientIp =
    forwarded || real || req.ip || (req.connection as any)?.remoteAddress || 'unknown';

  // Check if IP or device is blocked (device based on header)
  const deviceId = getDeviceIdFromHeaders(req.headers as any);
  
  // تجاهل القيم العامة/غير المحددة لتجنب حظر الجميع
  const validClientIp = clientIp && clientIp !== 'unknown' && clientIp !== '::1' && clientIp !== '127.0.0.1' ? clientIp : undefined;
  const validDeviceId = deviceId && deviceId !== 'unknown' ? deviceId : undefined;
  
  // فحص الحظر فقط للقيم الصحيحة
  const isLocallyBlocked = validClientIp && blockedIPs.has(validClientIp);
  const isModerationBlocked = moderationSystem.isBlocked(validClientIp, validDeviceId);
  
  if (isLocallyBlocked || isModerationBlocked) {
    res.status(403).json({ error: 'عذراً، تم حظر هذا العنوان أو جهازك' });
    return;
  }

  next();
}

// Message content validation
export function validateMessageContent(content: string): { isValid: boolean; reason?: string } {
  if (!content || typeof content !== 'string') {
    return { isValid: false, reason: 'المحتوى غير صالح' };
  }

  const trimmedContent = content.trim();

  if (trimmedContent.length === 0) {
    return { isValid: false, reason: 'لا يمكن إرسال رسالة فارغة' };
  }

  if (trimmedContent.length > SecurityConfig.MAX_MESSAGE_LENGTH) {
    return {
      isValid: false,
      reason: `الرسالة طويلة جداً (الحد الأقصى ${SecurityConfig.MAX_MESSAGE_LENGTH} حرف)`,
    };
  }

  // روابط مسموح بها فقط: YouTube (youtube.com و youtu.be)
  // - امنع أي روابط أخرى
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;
  const matches = trimmedContent.match(urlRegex) || [];

  if (matches.length > 0) {
    const isAllowedYouTube = (u: string): boolean => {
      try {
        let url = u;
        if (!/^https?:\/\//i.test(url)) {
          url = 'https://' + url;
        }
        const parsed = new URL(url);
        const host = parsed.hostname.toLowerCase();
        return (
          host === 'youtube.com' ||
          host === 'www.youtube.com' ||
          host === 'm.youtube.com' ||
          host === 'youtu.be' ||
          host === 'www.youtu.be' ||
          host === 'youtube-nocookie.com' ||
          host === 'www.youtube-nocookie.com'
        );
      } catch {
        return false;
      }
    };

    const allAllowed = matches.every((m) => isAllowedYouTube(m));
    if (!allAllowed) {
      return {
        isValid: false,
        reason: 'الرسالة تحتوي على روابط غير مسموحة. يُسمح فقط بروابط YouTube',
      };
    }
  }

  return { isValid: true };
}

// Add IP to block list
export function blockIP(ip: string): void {
  // تجاهل القيم العامة/غير المحددة لتجنب حظر الجميع
  if (ip && ip !== 'unknown' && ip !== '::1' && ip !== '127.0.0.1') {
    blockedIPs.add(ip);
  }
}

// Remove IP from block list
export function unblockIP(ip: string): void {
  blockedIPs.delete(ip);
}

// Clear all blocked IPs (للطوارئ)
export function clearAllBlockedIPs(): void {
  blockedIPs.clear();
  console.log('🧹 تم تنظيف جميع IPs المحجوبة محلياً');
}

// Get blocked IPs count
export function getBlockedIPsCount(): number {
  return blockedIPs.size;
}

// Security middleware to prevent common attacks
export function setupSecurity(app: Express): void {
  const isProd = process.env.NODE_ENV === 'production';

  // استخدام Helmet للأمان المحسّن
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: isProd ? ["'self'"] : ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'ws:', 'wss:', 'https:'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          // السماح بتضمين YouTube داخل iframes
          frameSrc: [
            "'self'",
            'https://www.youtube.com',
            'https://youtube.com',
            'https://www.youtube-nocookie.com',
          ],
        },
      },
      crossOriginEmbedderPolicy: false, // للسماح بتحميل الصور من مصادر خارجية
      strictTransportSecurity: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    })
  );

  // Security headers إضافية (إذا لزم الأمر)
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // XSS Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Content Security Policy
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        isProd ? "script-src 'self'" : "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: https:",
        // allow connect to same-origin + websockets on same-origin
        "connect-src 'self' ws: wss: https:",
        "font-src 'self' https://fonts.gstatic.com",
        "object-src 'none'",
        "media-src 'self'",
        "frame-src 'self' https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com",
      ].join('; ')
    );

    // Enforce HTTPS strictly in production
    if (isProd) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    next();
  });

  // CORS configuration (same-origin by default, allow env-configured origins)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const originHeader = req.headers.origin as string | undefined;
    const hostHeader = req.headers.host || '';

    // في حالة Render، قبول جميع الأصول من نفس النطاق
    const renderUrl = process.env.RENDER_EXTERNAL_URL;
    const isRenderDomain = renderUrl && (
      originHeader?.includes('.onrender.com') || 
      hostHeader?.includes('.onrender.com')
    );

    const envOrigins = [
      process.env.RENDER_EXTERNAL_URL,
      process.env.FRONTEND_URL,
      process.env.CORS_ORIGIN,
      // إضافة دعم صريح لـ Render
      renderUrl ? new URL(renderUrl).origin : null,
    ].filter(Boolean) as string[];

    const envHosts = envOrigins
      .map((u) => {
        try {
          return new URL(u).host;
        } catch {
          return '';
        }
      })
      .filter(Boolean);

    const originHost = (() => {
      try {
        return originHeader ? new URL(originHeader).host : '';
      } catch {
        return '';
      }
    })();

    const isDev = process.env.NODE_ENV === 'development';
    const isSameHost = originHost && hostHeader && originHost === hostHeader;
    const isEnvAllowed = originHost && envHosts.includes(originHost);

    // السماح بـ CORS في حالات أكثر مرونة
    if (originHeader && (isDev || isSameHost || isEnvAllowed || isRenderDomain)) {
      res.setHeader('Access-Control-Allow-Origin', originHeader);
    } else if (!originHeader && process.env.NODE_ENV === 'production') {
      // عند غياب Origin، لا نستخدم * مع credentials=true
      // احسب origin الفعلي من البروتوكول والمضيف
      try {
        const xfProtoRaw = (req.headers['x-forwarded-proto'] as string | undefined) || '';
        const xfProto = xfProtoRaw.split(',')[0]?.trim().toLowerCase();
        const isHttps = !!(req as any).secure || xfProto === 'https';
        const proto = isHttps ? 'https' : 'http';
        const host = (req.headers.host as string) || '';
        if (host) {
          const computedOrigin = `${proto}://${host}`;
          res.setHeader('Access-Control-Allow-Origin', computedOrigin);
        }
      } catch {}
    }

    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-device-id'
    );
    res.setHeader('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours

    if (req.method === 'OPTIONS') {
      res.sendStatus(204); // Use 204 No Content for OPTIONS
    } else {
      next();
    }
  });

  // Input sanitization
  app.use(
    express.json({
      limit: '10mb',
      verify: (req: any, res: Response, buf: Buffer) => {
        // Prevent JSON pollution attacks, but only when body is non-empty and method expects a body
        try {
          const method = (req.method || 'GET').toUpperCase();
          const hasBody = buf && buf.length > 0;
          const shouldParse = hasBody && method !== 'GET' && method !== 'HEAD';
          if (!shouldParse) {
            return;
          }
          JSON.parse(buf.toString());
        } catch (e) {
          // Throw an operational 400 error and let the global error handler respond
          throw new OperationalError('Invalid JSON format', 400, 'BAD_JSON');
        }
      },
    })
  );
}

// Utility function to validate user input
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';

  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .slice(0, 5000); // Allow larger payloads for data:image URLs and emojis
}

// Check if IP is blocked
export function isIpBlocked(ip: string, blockedIPs: Set<string>): boolean {
  return blockedIPs.has(ip);
}

// Validate session
export function validateSession(session: any): boolean {
  if (!session || !session.userId) return false;

  // Check session expiry
  const sessionAge = Date.now() - (session.lastAccess || 0);
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  if (sessionAge > maxAge) return false;

  // Update last access
  session.lastAccess = Date.now();

  return true;
}

export const SecurityConfig = {
  MAX_MESSAGE_LENGTH: 5000,
  MAX_USERNAME_LENGTH: 50,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
};

// Simple, dependency-free rate limiter factory (per key sliding window)
type RateStoreEntry = { count: number; resetTime: number };
const rateLimiterStores = new Map<string, Map<string, RateStoreEntry>>();

function getRateStore(name: string): Map<string, RateStoreEntry> {
  let store = rateLimiterStores.get(name);
  if (!store) {
    store = new Map<string, RateStoreEntry>();
    rateLimiterStores.set(name, store);
  }
  return store;
}

export function createRateLimiter(
  name: string,
  limit: number,
  windowMs: number
) {
  const store = getRateStore(name);
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const forwarded = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
      const real = (req.headers['x-real-ip'] as string | undefined)?.trim();
      const ip = forwarded || real || (req.ip as string) || 'unknown';
      const deviceId = getDeviceIdFromHeaders(req.headers as any) || 'unknown-device';
      const userId = (req as any).user?.id ? String((req as any).user.id) : 'anon';
      const key = `${userId}:${deviceId}:${ip}`;

      const allowed = applyLimiter(key, store, limit, windowMs);
      if (!allowed) {
        const now = Date.now();
        const entry = store.get(key)!;
        const retryAfterSec = Math.max(1, Math.ceil((entry.resetTime - now) / 1000));
        res.setHeader('Retry-After', String(retryAfterSec));
        return res.status(429).json({ error: 'Too many requests, please slow down' });
      }

      next();
    } catch {
      // Fail open on limiter errors
      next();
    }
  };
}

// Common limiters for sensitive endpoints
export const limiters = {
  // Messaging: protect against spam bursts
  sendMessage: createRateLimiter('sendMessage', 20, 60_000),
  pmSend: createRateLimiter('pmSend', 16, 60_000),
  reaction: createRateLimiter('reaction', 60, 60_000),
  // Reads that can be abused
  roomMessagesRead: createRateLimiter('roomMessagesRead', 90, 60_000),
  search: createRateLimiter('search', 30, 60_000),
  // Upload endpoints
  upload: createRateLimiter('upload', 8, 60_000),
  // Auth and moderation
  auth: createRateLimiter('auth', 10, 60_000),
  modReport: createRateLimiter('modReport', 10, 60_000),
};
