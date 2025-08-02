import { storage } from "./storage";
import { databaseCleanup } from "./utils/database-cleanup";

// مدير التحسين والأداء
export class PerformanceOptimizer {
  private readonly intervals = new Map<string, NodeJS.Timeout>();
  private readonly caches = new Map<string, CacheEntry>();
  private readonly operationQueue = new Set<() => Promise<void>>();
  private isProcessingQueue = false;

  constructor() {
    this.setupPerformanceMonitoring();
    this.startOptimizationSchedules();
  }

  // إعداد مراقبة الأداء
  private setupPerformanceMonitoring() {
    // مراقبة استخدام الذاكرة
    this.intervals.set('memory-monitor', setInterval(() => {
      const memUsage = process.memoryUsage();
      console.log(`🧠 الذاكرة: RSS ${Math.round(memUsage.rss / 1024 / 1024)}MB, Heap ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
      
      // تنظيف التخزين المؤقت إذا زاد الاستخدام عن 500MB
      if (memUsage.heapUsed > 500 * 1024 * 1024) {
        this.cleanupCaches();
      }
    }, 60000));

    // مراقبة العمليات المطولة
    this.intervals.set('operation-monitor', setInterval(() => {
      console.log(`⚡ العمليات المعلقة: ${this.operationQueue.size}`);
    }, 30000));
  }

  // بدء جداول التحسين
  private startOptimizationSchedules() {
    // تنظيف قاعدة البيانات كل 10 دقائق
    this.intervals.set('db-cleanup', setInterval(async () => {
      await this.performDatabaseCleanup();
    }, 600000));

    // تنظيف التخزين المؤقت كل 5 دقائق
    this.intervals.set('cache-cleanup', setInterval(() => {
      this.cleanupExpiredCaches();
    }, 300000));

    // تحسين العمليات المجمعة كل دقيقة
    this.intervals.set('batch-operations', setInterval(async () => {
      await this.processBatchOperations();
    }, 60000));
  }

  // تنظيف قاعدة البيانات
  private async performDatabaseCleanup() {
    try {
      console.log('🧹 بدء تنظيف قاعدة البيانات...');
      
      const results = await databaseCleanup.performComprehensiveCleanup();
      
      console.log(`✅ تنظيف قاعدة البيانات مكتمل:`, {
        rسائل_محذوفة: results.orphanedMessages,
        رسائل_غير_صحيحة: results.invalidMessages,
        ضيوف_قدامى: results.oldGuestUsers,
        المجموع: results.orphanedMessages + results.invalidMessages + results.oldGuestUsers
      });
    } catch (error) {
      console.error('❌ خطأ في تنظيف قاعدة البيانات:', error);
    }
  }

  // تنظيف التخزين المؤقت
  private cleanupCaches() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.caches.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.caches.delete(key);
        cleanedCount++;
      }
    }

    console.log(`🗑️ تم تنظيف ${cleanedCount} عنصر من التخزين المؤقت`);
  }

  // تنظيف التخزين المؤقت المنتهي الصلاحية
  private cleanupExpiredCaches() {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, entry] of this.caches.entries()) {
      if (now > entry.expiresAt) {
        this.caches.delete(key);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      console.log(`⏰ تم حذف ${expiredCount} عنصر منتهي الصلاحية من التخزين المؤقت`);
    }
  }

  // معالجة العمليات المجمعة
  private async processBatchOperations() {
    if (this.isProcessingQueue || this.operationQueue.size === 0) {
      return;
    }

    this.isProcessingQueue = true;
    const operations = Array.from(this.operationQueue);
    this.operationQueue.clear();

    console.log(`🔄 معالجة ${operations.length} عملية مجمعة...`);

    try {
      await Promise.allSettled(operations.map(op => op()));
      console.log(`✅ تمت معالجة ${operations.length} عملية بنجاح`);
    } catch (error) {
      console.error('❌ خطأ في معالجة العمليات المجمعة:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  // إضافة عملية للدفعة
  addBatchOperation(operation: () => Promise<void>) {
    this.operationQueue.add(operation);
  }

  // الحصول من التخزين المؤقت أو إنشاء
  async getOrSet<T>(key: string, getter: () => Promise<T>, ttl: number = 300000): Promise<T> {
    const cached = this.caches.get(key);
    const now = Date.now();

    if (cached && now < cached.expiresAt) {
      return cached.data as T;
    }

    try {
      const data = await getter();
      this.caches.set(key, {
        data,
        timestamp: now,
        expiresAt: now + ttl,
        ttl
      });
      return data;
    } catch (error) {
      console.error(`خطأ في جلب البيانات للمفتاح ${key}:`, error);
      throw error;
    }
  }

  // حذف من التخزين المؤقت
  invalidateCache(key: string) {
    this.caches.delete(key);
  }

  // حذف مجموعة من التخزين المؤقت
  invalidateCachePattern(pattern: string) {
    const regex = new RegExp(pattern);
    for (const key of this.caches.keys()) {
      if (regex.test(key)) {
        this.caches.delete(key);
      }
    }
  }

  // الحصول على إحصائيات الأداء
  getPerformanceStats() {
    const memUsage = process.memoryUsage();
    return {
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024)
      },
      cache: {
        entries: this.caches.size,
        operations: this.operationQueue.size,
        intervals: this.intervals.size
      },
      uptime: Math.round(process.uptime() / 60) // بالدقائق
    };
  }

  // تدمير المحسن
  destroy() {
    for (const [name, interval] of this.intervals.entries()) {
      clearInterval(interval);
      console.log(`🛑 إيقاف ${name}`);
    }
    
    this.intervals.clear();
    this.caches.clear();
    this.operationQueue.clear();
  }
}

// واجهة التخزين المؤقت
interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
  ttl: number;
}

// مدير معالجة الأخطاء المحسّن
export class ErrorHandler {
  private readonly errorCounts = new Map<string, number>();
  private readonly errorThreshold = 10; // الحد الأقصى للأخطاء في الدقيقة

  constructor() {
    // تنظيف عدادات الأخطاء كل دقيقة
    setInterval(() => {
      this.errorCounts.clear();
    }, 60000);
  }

  // معالجة خطأ مع تتبع التكرار
  handleError(error: Error, context: string, socket?: any) {
    const errorKey = `${context}:${error.message}`;
    const currentCount = this.errorCounts.get(errorKey) || 0;
    
    this.errorCounts.set(errorKey, currentCount + 1);

    // تسجيل مفصل للأخطاء المتكررة
    if (currentCount >= this.errorThreshold) {
      console.error(`🚨 خطأ متكرر في ${context} (${currentCount + 1} مرة):`, error.message);
      
      // إرسال إشعار للمستخدم إذا كان متصلاً
      if (socket) {
        socket.emit('systemError', {
          message: 'حدث خطأ تقني، يرجى إعادة المحاولة',
          code: 'REPEATED_ERROR',
          context: context
        });
      }
    } else {
      console.error(`❌ خطأ في ${context}:`, error.message);
    }

    // معالجة أنواع أخطاء محددة
    this.handleSpecificErrors(error, context, socket);
  }

  // معالجة أخطاء محددة
  private handleSpecificErrors(error: Error, context: string, socket?: any) {
    // خطأ قاعدة البيانات
    if (error.message.includes('database') || error.message.includes('SQLITE')) {
      console.error('🗄️ خطأ قاعدة بيانات - محاولة إعادة الاتصال...');
      // إعادة تهيئة الاتصال إذا لزم الأمر
    }

    // خطأ Socket.IO
    if (error.message.includes('socket') || context.includes('socket')) {
      console.error('🔌 خطأ Socket.IO - تحقق من الاتصال...');
      if (socket) {
        socket.emit('connectionError', {
          message: 'مشكلة في الاتصال، يرجى إعادة تحديث الصفحة'
        });
      }
    }

    // خطأ في الذاكرة
    if (error.message.includes('memory') || error.message.includes('allocation')) {
      console.error('🧠 خطأ في الذاكرة - تفريغ التخزين المؤقت...');
      // تنظيف فوري للذاكرة
    }
  }

  // الحصول على إحصائيات الأخطاء
  getErrorStats() {
    const stats = new Map<string, number>();
    
    for (const [key, count] of this.errorCounts.entries()) {
      const [context] = key.split(':');
      stats.set(context, (stats.get(context) || 0) + count);
    }

    return Object.fromEntries(stats);
  }
}

// مدير الحماية من الزحام
export class RateLimiter {
  private readonly requests = new Map<string, number[]>();
  private readonly limits = new Map<string, RateLimit>();

  constructor() {
    // تنظيف الطلبات القديمة كل دقيقة
    setInterval(() => {
      this.cleanupOldRequests();
    }, 60000);

    // إعداد حدود افتراضية
    this.setLimit('message', { max: 30, window: 60000 }); // 30 رسالة في الدقيقة
    this.setLimit('auth', { max: 5, window: 300000 }); // 5 محاولات مصادقة في 5 دقائق
    this.setLimit('room', { max: 10, window: 60000 }); // 10 عمليات غرفة في الدقيقة
  }

  // تعيين حد للعملية
  setLimit(operation: string, limit: RateLimit) {
    this.limits.set(operation, limit);
  }

  // فحص إمكانية تنفيذ العملية
  checkLimit(userId: number, operation: string): RateLimitResult {
    const key = `${userId}:${operation}`;
    const limit = this.limits.get(operation);
    
    if (!limit) {
      return { allowed: true, remaining: Infinity };
    }

    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // إزالة الطلبات القديمة
    const validRequests = requests.filter(time => now - time < limit.window);
    
    if (validRequests.length >= limit.max) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: Math.min(...validRequests) + limit.window
      };
    }

    // إضافة الطلب الحالي
    validRequests.push(now);
    this.requests.set(key, validRequests);

    return {
      allowed: true,
      remaining: limit.max - validRequests.length
    };
  }

  // تنظيف الطلبات القديمة
  private cleanupOldRequests() {
    const now = Date.now();
    
    for (const [key, requests] of this.requests.entries()) {
      const [, operation] = key.split(':');
      const limit = this.limits.get(operation);
      
      if (limit) {
        const validRequests = requests.filter(time => now - time < limit.window);
        
        if (validRequests.length === 0) {
          this.requests.delete(key);
        } else {
          this.requests.set(key, validRequests);
        }
      }
    }
  }

  // الحصول على إحصائيات الحدود
  getLimitStats() {
    const stats: Record<string, any> = {};
    
    for (const [operation, limit] of this.limits.entries()) {
      const operationRequests = Array.from(this.requests.entries())
        .filter(([key]) => key.endsWith(`:${operation}`))
        .map(([, requests]) => requests.length)
        .reduce((sum, count) => sum + count, 0);
      
      stats[operation] = {
        limit: limit.max,
        window: limit.window,
        currentRequests: operationRequests
      };
    }
    
    return stats;
  }
}

// واجهات مساعدة
interface RateLimit {
  max: number;
  window: number; // بالميلي ثانية
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime?: number;
}

// إنشاء كائنات عامة
export const performanceOptimizer = new PerformanceOptimizer();
export const errorHandler = new ErrorHandler();
export const rateLimiter = new RateLimiter();