import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Middleware لتحسينات الأداء تحت الضغط
 */

// كاش بسيط للاستجابات
const responseCache = new Map<string, {
  data: any;
  headers: Record<string, string>;
  statusCode: number;
  expiresAt: number;
}>();

/**
 * Middleware لإضافة رؤوس الأداء
 */
export function performanceHeaders(req: Request, res: Response, next: NextFunction) {
  // تسجيل وقت البداية
  const startTime = process.hrtime.bigint();
  
  // إضافة رؤوس الأداء الأساسية
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  
  // تسجيل وقت الاستجابة عند الانتهاء
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // تحويل إلى ميلي ثانية
    res.setHeader('X-Response-Time', `${duration.toFixed(2)}ms`);
  });
  
  next();
}

/**
 * Middleware للكاش الذكي للاستجابات
 */
export function smartCache(ttlSeconds: number = 5) {
  return (req: Request, res: Response, next: NextFunction) => {
    // تخطي الكاش للطلبات غير GET
    if (req.method !== 'GET') {
      return next();
    }
    
    // إنشاء مفتاح الكاش
    const cacheKey = `${req.method}:${req.originalUrl}`;
    const now = Date.now();
    
    // التحقق من الكاش
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      // إرسال الاستجابة من الكاش
      Object.entries(cached.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Age', Math.floor((now - (cached.expiresAt - ttlSeconds * 1000)) / 1000).toString());
      return res.status(cached.statusCode).json(cached.data);
    }
    
    // حفظ الاستجابة الأصلية
    const originalJson = res.json.bind(res);
    
    res.json = function(data: any) {
      // حفظ في الكاش إذا كانت الاستجابة ناجحة
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const headers: Record<string, string> = {};
        ['Content-Type', 'ETag', 'Cache-Control'].forEach(header => {
          const value = res.getHeader(header);
          if (value) headers[header] = value.toString();
        });
        
        responseCache.set(cacheKey, {
          data,
          headers,
          statusCode: res.statusCode,
          expiresAt: now + (ttlSeconds * 1000)
        });
        
        // تنظيف الكاش القديم
        if (responseCache.size > 1000) {
          const entries = Array.from(responseCache.entries());
          entries
            .filter(([_, value]) => value.expiresAt <= now)
            .forEach(([key]) => responseCache.delete(key));
        }
      }
      
      res.setHeader('X-Cache', 'MISS');
      return originalJson(data);
    };
    
    next();
  };
}

/**
 * Middleware لتوليد ETag للاستجابات
 */
export function generateETag(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);
  
  res.json = function(data: any) {
    // توليد ETag بناءً على المحتوى
    const content = JSON.stringify(data);
    const hash = crypto
      .createHash('md5')
      .update(content)
      .digest('hex');
    const etag = `"${hash}"`;
    
    // إضافة ETag للاستجابة
    res.setHeader('ETag', etag);
    
    // التحقق من If-None-Match
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }
    
    return originalJson(data);
  };
  
  next();
}

/**
 * Middleware لتحديد معدل الطلبات (Rate Limiting) خفيف
 */
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function lightRateLimit(
  maxRequests: number = 100,
  windowMs: number = 60000 // دقيقة واحدة
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    
    const record = requestCounts.get(key);
    
    if (!record || record.resetAt <= now) {
      // إنشاء سجل جديد
      requestCounts.set(key, {
        count: 1,
        resetAt: now + windowMs
      });
      return next();
    }
    
    if (record.count >= maxRequests) {
      res.setHeader('Retry-After', Math.ceil((record.resetAt - now) / 1000).toString());
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((record.resetAt - now) / 1000)
      });
    }
    
    record.count++;
    next();
  };
}

/**
 * Middleware لضغط JSON يدوياً للاستجابات الكبيرة
 */
export function compressLargeJSON(threshold: number = 10240) { // 10KB
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    
    res.json = function(data: any) {
      const content = JSON.stringify(data);
      
      // إذا كان المحتوى كبيراً، قم بإزالة المسافات الزائدة
      if (content.length > threshold) {
        // إزالة المسافات والأسطر الجديدة غير الضرورية
        const compressed = JSON.stringify(data, null, 0);
        res.setHeader('X-JSON-Compressed', 'true');
        return originalJson(JSON.parse(compressed));
      }
      
      return originalJson(data);
    };
    
    next();
  };
}

/**
 * Middleware لتحسين استعلامات قاعدة البيانات
 */
export function dbQueryOptimizer(req: Request, res: Response, next: NextFunction) {
  // إضافة معلومات تحسين الاستعلام للطلب
  (req as any).queryHints = {
    // تلميحات للاستعلامات
    useIndex: true,
    limitResults: true,
    cacheResults: true,
    // حد أقصى للنتائج
    maxLimit: 100,
    defaultLimit: 20
  };
  
  // تحسين معاملات الاستعلام
  if (req.query.limit) {
    const limit = parseInt(req.query.limit as string);
    req.query.limit = Math.min(limit, 100).toString();
  }
  
  if (req.query.offset) {
    const offset = parseInt(req.query.offset as string);
    req.query.offset = Math.max(0, offset).toString();
  }
  
  next();
}

/**
 * تصدير جميع middleware الأداء
 */
export const performanceMiddleware = {
  headers: performanceHeaders,
  cache: smartCache,
  etag: generateETag,
  rateLimit: lightRateLimit,
  compressJSON: compressLargeJSON,
  optimizeDB: dbQueryOptimizer
};