import type { Express, Request, Response, NextFunction } from 'express';
import type { Server } from 'http';
import express from 'express';

/**
 * ضبط مهلات وحدود الخادم لتحسين الأمان والأداء
 */
export function configureServerLimits(app: Express, server: Server): void {
  // ضبط مهلات الخادم
  try {
    server.keepAliveTimeout = 65_000; // موحد مع index/routes
    server.headersTimeout = 70_000;
  } catch {}
  
  // تعطيل المهلات لطلبات الرفع الطويلة
  try { (server as any).timeout = 0; } catch {}
  try { (server as any).requestTimeout = 0; } catch {}
  
  // حد أقصى للاتصالات المتزامنة
  try { server.maxHeadersCount = 100; } catch {}
  
}

/**
 * ضبط حدود حجم الطلبات
 */
export function configureRequestLimits(app: Express): void {
  // حد حجم JSON - محسن لدعم رفع الموسيقى
  app.use(express.json({ 
    limit: '15mb', // زيادة الحد لدعم رفع الموسيقى (حتى 12MB + margin)
    strict: true,
    type: ['application/json', 'text/plain']
  }));
  
  // حد حجم URL encoded
  app.use(express.urlencoded({ 
    extended: true, 
    limit: '16mb',
    parameterLimit: 5000
  }));
  
  // حد حجم النص الخام
  app.use(express.text({ 
    limit: '100kb',
    type: 'text/*'
  }));
  
  // حد حجم البيانات الخام
  app.use(express.raw({ 
    limit: '16mb',
    type: 'application/octet-stream'
  }));
  
  }

/**
 * Middleware لفرض حد أقصى لطول URL
 */
export function urlLengthLimit(maxLength: number = 2048) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.originalUrl.length > maxLength) {
      res.status(414).json({ 
        error: 'URI Too Long',
        message: `طول URL يتجاوز الحد المسموح (${maxLength} حرف)`
      });
      return;
    }
    next();
  };
}

/**
 * Middleware لفرض حد أقصى لعدد headers
 */
export function headerCountLimit(maxHeaders: number = 50) {
  return (req: Request, res: Response, next: NextFunction) => {
    const headerCount = Object.keys(req.headers).length;
    if (headerCount > maxHeaders) {
      res.status(431).json({ 
        error: 'Request Header Fields Too Large',
        message: `عدد الـ headers يتجاوز الحد المسموح (${maxHeaders})`
      });
      return;
    }
    next();
  };
}

/**
 * Middleware لمهلة الطلبات
 */
export function requestTimeout(_ms: number = 0) {
  // تعطيل مهلة الطلبات بالكامل
  return (_req: Request, _res: Response, next: NextFunction) => next();
}

/**
 * Middleware للحماية من Slowloris attacks
 */
export function slowlorisProtection(options: {
  windowMs?: number;
  delayAfter?: number;
  delayMs?: number;
  maxDelayMs?: number;
} = {}) {
  const {
    windowMs = 60000, // نافذة زمنية: دقيقة واحدة
    delayAfter = 5, // بدء التأخير بعد 5 طلبات
    delayMs = 500, // تأخير أولي 500ms
    maxDelayMs = 20000 // حد أقصى للتأخير 20 ثانية
  } = options;
  
  const requests = new Map<string, { count: number; resetTime: number }>();
  
  // تنظيف الذاكرة كل دقيقة
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of requests.entries()) {
      if (now > data.resetTime) {
        requests.delete(key);
      }
    }
  }, 60000);
  
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    
    let requestData = requests.get(key);
    if (!requestData || now > requestData.resetTime) {
      requestData = { count: 0, resetTime: now + windowMs };
      requests.set(key, requestData);
    }
    
    requestData.count++;
    
    if (requestData.count > delayAfter) {
      const delay = Math.min(
        delayMs * (requestData.count - delayAfter),
        maxDelayMs
      );
      
      setTimeout(() => next(), delay);
    } else {
      next();
    }
  };
}

/**
 * تطبيق جميع إعدادات الأمان والحدود
 */
export function applyServerSecurity(app: Express, server: Server): void {
  // ضبط الخادم
  configureServerLimits(app, server);
  configureRequestLimits(app);
  
  // تطبيق middlewares الأمان
  app.use(urlLengthLimit());
  app.use(headerCountLimit());
  app.use(requestTimeout());
  app.use(slowlorisProtection());
  
  }