/**
 * مُحسِّن الأداء - Performance Optimizer
 * يحتوي على middleware لتحسين أداء التطبيق
 */

import type { Request, Response, NextFunction } from 'express';
import compression from 'compression';

// Cache middleware
export function setupCaching(app: any) {
  // Static assets caching
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
    } else if (req.path.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    next();
  });
}

// Request rate limiting per user
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimiter(maxRequests: number = 100, windowMs: number = 60000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    
    const clientData = requestCounts.get(clientId);
    
    if (!clientData || now > clientData.resetTime) {
      requestCounts.set(clientId, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (clientData.count >= maxRequests) {
      return res.status(429).json({ 
        error: 'معدل الطلبات مرتفع جداً، يرجى المحاولة لاحقاً',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
      });
    }
    
    clientData.count++;
    next();
  };
}

// Response time logger
export function responseTimeLogger() {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (duration > 1000) { // Log slow requests
        console.warn(`🐌 بطء في الاستجابة: ${req.method} ${req.path} - ${duration}ms`);
      }
    });
    
    next();
  };
}

// Memory usage monitoring
let lastMemoryCheck = Date.now();
export function memoryMonitor() {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    
    // Check every 30 seconds
    if (now - lastMemoryCheck > 30000) {
      const usage = process.memoryUsage();
      const mbUsed = Math.round(usage.heapUsed / 1024 / 1024);
      
      if (mbUsed > 512) { // Alert if memory usage is high
        console.warn(`🔥 استخدام ذاكرة مرتفع: ${mbUsed}MB`);
      }
      
      lastMemoryCheck = now;
    }
    
    next();
  };
}

// Optimized compression settings
export function setupOptimizedCompression(app: any) {
  app.use(compression({
    level: 6, // Balanced compression level
    threshold: 1024, // Only compress responses > 1KB
    filter: (req: Request, res: Response) => {
      // Don't compress responses with no-transform cache control
      if (res.getHeader('Cache-Control')?.toString().includes('no-transform')) {
        return false;
      }
      return compression.filter(req, res);
    }
  }));
}

// Database query optimization helper
export function queryOptimizer<T>(queryFn: () => Promise<T>, cacheKey?: string, ttl: number = 30000) {
  const cache = new Map<string, { data: T; expiry: number }>();
  
  return async (): Promise<T> => {
    if (cacheKey) {
      const cached = cache.get(cacheKey);
      if (cached && Date.now() < cached.expiry) {
        return cached.data;
      }
    }
    
    const result = await queryFn();
    
    if (cacheKey) {
      cache.set(cacheKey, { data: result, expiry: Date.now() + ttl });
    }
    
    return result;
  };
}

// Clean up old data periodically
export function startPeriodicCleanup() {
  setInterval(() => {
    // Clean up rate limiting data
    const now = Date.now();
    for (const [clientId, data] of requestCounts.entries()) {
      if (now > data.resetTime) {
        requestCounts.delete(clientId);
      }
    }
  }, 300000); // Every 5 minutes
}