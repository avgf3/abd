import type { Request, Response, NextFunction } from 'express';
import express, { type Express } from 'express';
import helmet from 'helmet';

import { moderationSystem } from './moderation';
import { getDeviceIdFromHeaders } from './utils/device';

// Removed rate limiting maps and limiters to avoid throttling
const blockedIPs = new Set<string>();

// IP security check middleware
export function checkIPSecurity(req: Request, res: Response, next: NextFunction): void {
  // Honor reverse proxy headers first
  const forwarded = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
  const real = (req.headers['x-real-ip'] as string | undefined)?.trim();
  const clientIp =
    forwarded || real || req.ip || (req.connection as any)?.remoteAddress || 'unknown';

  // Check if IP or device is blocked (device based on header)
  const deviceId = getDeviceIdFromHeaders(req.headers as any);
  if (blockedIPs.has(clientIp) || moderationSystem.isBlocked(clientIp, deviceId)) {
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

  // Check for spam patterns
  const spamPatterns = [
    /(.)\1{10,}/gi, // Repeated characters
    /https?:\/\/[^\s]+/gi, // URLs (adjust based on your needs)
    /[^\w\s\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/gi, // Non-Arabic/alphanumeric chars (allowing Arabic)
  ];

  for (const pattern of spamPatterns) {
    if (pattern.test(trimmedContent)) {
      return { isValid: false, reason: 'المحتوى يحتوي على نص مشبوه' };
    }
  }

  return { isValid: true };
}

// Add IP to block list
export function blockIP(ip: string): void {
  blockedIPs.add(ip);
}

// Remove IP from block list
export function unblockIP(ip: string): void {
  blockedIPs.delete(ip);
}

// Security middleware to prevent common attacks
export function setupSecurity(app: Express): void {
  // Removed global API rate limiter

  // استخدام Helmet للأمان المحسّن
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'ws:', 'wss:', 'https:'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
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
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: https:",
        // allow connect to same-origin + websockets on same-origin
        "connect-src 'self' ws: wss: https:",
        "font-src 'self' https://fonts.gstatic.com",
        "object-src 'none'",
        "media-src 'self'",
        "frame-src 'none'",
      ].join('; ')
    );

    // Enforce HTTPS strictly in production
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    next();
  });

  // CORS configuration (same-origin by default, allow env-configured origins)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const originHeader = req.headers.origin as string | undefined;
    const hostHeader = req.headers.host || '';

    const envOrigins = [
      process.env.RENDER_EXTERNAL_URL,
      process.env.FRONTEND_URL,
      process.env.CORS_ORIGIN,
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

    if (originHeader && (isDev || isSameHost || isEnvAllowed)) {
      res.setHeader('Access-Control-Allow-Origin', originHeader);
    }

    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );

    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
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
          res.status(400).json({ error: 'Invalid JSON format' });
          throw new Error('Invalid JSON');
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
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX: 100,
};
