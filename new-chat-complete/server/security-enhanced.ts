import type { Request, Response, NextFunction } from 'express';
import express, { type Express } from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

// استيراد التحسينات الجديدة
import { csrfMiddleware, csrfTokenEndpoint } from './middleware/csrf';
import { 
  authRateLimitMiddleware, 
  apiRateLimitMiddleware,
  messageRateLimitMiddleware,
  friendRequestRateLimitMiddleware 
} from './middleware/rateLimiter';
import { applyServerSecurity } from './middleware/serverConfig';
import { logger } from './utils/logger';
import { monitoring } from './utils/monitoring';
import { initializeRedis } from './utils/redis';
import { setupSocketRedisAdapter } from './utils/socketRedisAdapter';

// الإعدادات الأمنية الأصلية
import { moderationSystem } from './moderation';
import { getDeviceIdFromHeaders } from './utils/device';

// Security configuration
export const SecurityConfig = {
  // حدود حجم البيانات
  MAX_MESSAGE_LENGTH: 1000,
  MAX_USERNAME_LENGTH: 20,
  MAX_DISPLAY_NAME_LENGTH: 50,
  MAX_BIO_LENGTH: 200,
  MAX_UPLOAD_SIZE: 10 * 1024 * 1024, // 10MB
  
  // إعدادات الجلسة
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 ساعة
  SESSION_SECRET: process.env.SESSION_SECRET || 'default-secret-change-in-production',
  
  // إعدادات CORS
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  
  // إعدادات أخرى
  BCRYPT_ROUNDS: 10,
  JWT_SECRET: process.env.JWT_SECRET || 'jwt-secret-change-in-production',
  JWT_EXPIRES_IN: '7d'
};

// Rate limiting maps محلية (للاحتفاظ بالوظائف الأصلية)
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

// IP security check middleware
export function checkIPSecurity(req: Request, res: Response, next: NextFunction): void {
  const forwarded = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
  const real = (req.headers['x-real-ip'] as string | undefined)?.trim();
  const clientIp =
    forwarded || real || req.ip || (req.connection as any)?.remoteAddress || 'unknown';

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
    /https?:\/\/[^\s]+/gi, // URLs
    /[^\w\s\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/gi,
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
  logger.warn('IP blocked', { ip });
}

// Remove IP from block list
export function unblockIP(ip: string): void {
  blockedIPs.delete(ip);
  logger.info('IP unblocked', { ip });
}

// Enhanced security middleware setup
export async function setupSecurity(app: Express): Promise<void> {
  logger.info('Setting up enhanced security...');
  
  // إعداد Redis للجلسات و Rate Limiting
  const { store: sessionStore } = initializeRedis();
  
  // استخدام cookie parser
  app.use(cookieParser());
  
  // تطبيق Helmet مع إعدادات محسّنة
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "blob:", "https:"],
          connectSrc: ["'self'", "wss:", "ws:", "https:"],
          mediaSrc: ["'self'", "blob:"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : undefined,
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    })
  );

  // CORS configuration
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && SecurityConfig.ALLOWED_ORIGINS.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    
    next();
  });

  // تطبيق معدل التقييد المحسّن
  app.use('/api/auth/login', authRateLimitMiddleware);
  app.use('/api/auth/register', authRateLimitMiddleware);
  app.use('/api/messages', messageRateLimitMiddleware);
  app.use('/api/friends', friendRequestRateLimitMiddleware);
  app.use('/api', apiRateLimitMiddleware);
  
  // تطبيق حماية CSRF
  app.get('/api/csrf-token', csrfTokenEndpoint);
  app.use('/api', csrfMiddleware);
  
  // تطبيق المراقبة
  app.use(monitoring.middleware());
  app.use(logger.requestLogger());
  
  // IP security check
  app.use(checkIPSecurity);

  // Clean up old rate limit entries periodically
  setInterval(() => {
    const now = Date.now();
    const maps = [authRequestCounts, messageRequestCounts, friendRequestCounts];
    
    maps.forEach(map => {
      map.forEach((value, key) => {
        if (now > value.resetTime) {
          map.delete(key);
        }
      });
    });
  }, 60000); // كل دقيقة

  logger.info('Enhanced security setup completed');
}

// Enhanced health endpoint with monitoring data
export function setupHealthEndpoint(app: Express): void {
  app.get('/health', (_req, res) => {
    try {
      const healthData = monitoring.getHealthData();
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.status(200).json(healthData);
    } catch (error) {
      logger.error('Health check failed', error);
      res.status(503).json({ status: 'unhealthy', error: 'Internal error' });
    }
  });
}

// Graceful shutdown handler
export async function gracefulShutdown(): Promise<void> {
  logger.info('Starting graceful shutdown...');
  
  try {
    // إيقاف المراقبة
    monitoring.stopMonitoring();
    
    // إغلاق اتصالات Redis
    const { closeRedis } = await import('./utils/redis');
    await closeRedis();
    
    // إغلاق Socket.IO Redis Adapter
    const { closeSocketRedisAdapter } = await import('./utils/socketRedisAdapter');
    await closeSocketRedisAdapter();
    
    logger.info('Graceful shutdown completed');
  } catch (error) {
    logger.error('Error during graceful shutdown', error);
  }
}