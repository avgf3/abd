import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import type { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

// إعداد Redis client
let redisClient: Redis | null = null;

if (process.env.REDIS_URL) {
  try {
    redisClient = new Redis(process.env.REDIS_URL, {
      enableOfflineQueue: false,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 50, 2000);
      }
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      });
  } catch (error) {
    console.error('Failed to initialize Redis client:', error);
    redisClient = null;
  }
}

// إنشاء Rate Limiters مختلفة للعمليات المختلفة
const createRateLimiter = (options: any) => {
  if (redisClient) {
    return new RateLimiterRedis({
      storeClient: redisClient,
      ...options
    });
  }
  // Fallback to memory if Redis not available
  return new RateLimiterMemory(options);
};

// Rate limiter للمصادقة (تسجيل دخول/تسجيل)
export const authLimiter = createRateLimiter({
  keyPrefix: 'auth',
  points: 5, // 5 محاولات
  duration: 900, // 15 دقيقة
  blockDuration: 900, // حظر لمدة 15 دقيقة عند تجاوز الحد
});

// Rate limiter عام لـ API
export const apiLimiter = createRateLimiter({
  keyPrefix: 'api',
  points: 100, // 100 طلب
  duration: 60, // في الدقيقة
  blockDuration: 60,
});

// Rate limiter للرسائل
export const messageLimiter = createRateLimiter({
  keyPrefix: 'msg',
  points: 30, // 30 رسالة
  duration: 60, // في الدقيقة
  blockDuration: 300, // حظر 5 دقائق عند تجاوز الحد
});

// Rate limiter لطلبات الصداقة
export const friendRequestLimiter = createRateLimiter({
  keyPrefix: 'friend',
  points: 10, // 10 طلبات
  duration: 300, // في 5 دقائق
  blockDuration: 600, // حظر 10 دقائق
});

// Rate limiter للملفات/الصور
export const uploadLimiter = createRateLimiter({
  keyPrefix: 'upload',
  points: 10, // 10 ملفات
  duration: 600, // في 10 دقائق
  blockDuration: 1800, // حظر 30 دقيقة
});

// Middleware factory
export function createRateLimitMiddleware(
  rateLimiter: any,
  keyGenerator?: (req: Request) => string
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // توليد المفتاح بناءً على IP أو معرف المستخدم
      const key = keyGenerator ? keyGenerator(req) : 
        (req.user as any)?.id || 
        req.ip || 
        req.headers['x-forwarded-for']?.toString().split(',')[0] || 
        'unknown';

      await rateLimiter.consume(key);
      next();
    } catch (rejRes: any) {
      // إضافة headers للإشارة إلى حالة Rate Limit
      res.setHeader('Retry-After', String(Math.round(rejRes.msBeforeNext / 1000)) || '60');
      res.setHeader('X-RateLimit-Limit', String(rateLimiter.points));
      res.setHeader('X-RateLimit-Remaining', String(rejRes.remainingPoints || 0));
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rejRes.msBeforeNext).toISOString());
      
      res.status(429).json({
        error: 'تم تجاوز عدد الطلبات المسموح به',
        retryAfter: Math.round(rejRes.msBeforeNext / 1000)
      });
    }
  };
}

// Middlewares جاهزة للاستخدام
export const authRateLimitMiddleware = createRateLimitMiddleware(authLimiter);
export const apiRateLimitMiddleware = createRateLimitMiddleware(apiLimiter);
export const messageRateLimitMiddleware = createRateLimitMiddleware(messageLimiter);
export const friendRequestRateLimitMiddleware = createRateLimitMiddleware(friendRequestLimiter);
export const uploadRateLimitMiddleware = createRateLimitMiddleware(uploadLimiter);

// دالة لإعادة تعيين محاولات مستخدم معين (مثلاً بعد نجاح تسجيل الدخول)
export async function resetRateLimit(limiter: any, key: string) {
  try {
    await limiter.delete(key);
  } catch (error) {
    console.error('Error resetting rate limit:', error);
  }
}