// تحسينات شاملة لنظام الدردشة
export class MessageCacheManager {
  private cache = new Map<string, { messages: any[]; timestamp: number; maxAge: number }>();
  private maxCacheSize = 50; // عدد العناصر في cache

  set(key: string, messages: any[], maxAge: number = 300000) { // 5 دقائق افتراضياً
    // تنظيف cache إذا كان ممتلئ
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      messages,
      timestamp: Date.now(),
      maxAge
    });
  }

  get(key: string): any[] | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const isExpired = Date.now() - item.timestamp > item.maxAge;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return item.messages;
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

export class NetworkOptimizer {
  private pendingRequests = new Set<string>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private requestCounts = new Map<string, number>();
  private lastRequestTimes = new Map<string, number>();

  // منع الطلبات المتكررة
  canMakeRequest(key: string, minInterval: number = 1000): boolean {
    const lastTime = this.lastRequestTimes.get(key) || 0;
    const now = Date.now();
    
    if (now - lastTime < minInterval) {
      return false;
    }

    this.lastRequestTimes.set(key, now);
    return true;
  }

  // إضافة طلب معلق
  addPendingRequest(key: string) {
    this.pendingRequests.add(key);
  }

  // إزالة طلب معلق
  removePendingRequest(key: string) {
    this.pendingRequests.delete(key);
  }

  // التحقق من وجود طلب معلق
  hasPendingRequest(key: string): boolean {
    return this.pendingRequests.has(key);
  }

  // debounce للطلبات
  debounce(key: string, fn: () => void, delay: number = 1000) {
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key)!);
    }

    const timer = setTimeout(() => {
      fn();
      this.debounceTimers.delete(key);
    }, delay);

    this.debounceTimers.set(key, timer);
  }

  // تنظيف timers
  cleanup() {
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
  }
}

export class globalNotificationManager {
  private static instance: globalNotificationManager;
  private notifications: any[] = [];
  private maxNotifications = 10;

  static getInstance(): globalNotificationManager {
    if (!globalNotificationManager.instance) {
      globalNotificationManager.instance = new globalNotificationManager();
    }
    return globalNotificationManager.instance;
  }

  addNotification(notification: any) {
    this.notifications.push(notification);
    
    // إزالة الإشعارات القديمة
    if (this.notifications.length > this.maxNotifications) {
      this.notifications.shift();
    }
  }

  getNotifications() {
    return this.notifications;
  }

  clearNotifications() {
    this.notifications = [];
  }
}

// تحسينات الأداء
export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private renderCounts = new Map<string, number>();
  private lastRenderTimes = new Map<string, number>();

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  // تتبع عدد مرات التحديث
  trackRender(componentName: string) {
    const count = this.renderCounts.get(componentName) || 0;
    this.renderCounts.set(componentName, count + 1);
    
    const now = Date.now();
    this.lastRenderTimes.set(componentName, now);
  }

  // التحقق من الحاجة للتحديث
  shouldUpdate(componentName: string, minInterval: number = 100): boolean {
    const lastTime = this.lastRenderTimes.get(componentName) || 0;
    const now = Date.now();
    
    return now - lastTime >= minInterval;
  }

  // إحصائيات الأداء
  getPerformanceStats() {
    return {
      renderCounts: Object.fromEntries(this.renderCounts),
      lastRenderTimes: Object.fromEntries(this.lastRenderTimes)
    };
  }
}

// تحسينات الذاكرة
export class MemoryOptimizer {
  private static instance: MemoryOptimizer;
  private largeObjects = new Map<string, any>();
  private objectSizes = new Map<string, number>();

  static getInstance(): MemoryOptimizer {
    if (!MemoryOptimizer.instance) {
      MemoryOptimizer.instance = new MemoryOptimizer();
    }
    return MemoryOptimizer.instance;
  }

  // تخزين كائن كبير مع تتبع الحجم
  storeLargeObject(key: string, obj: any) {
    const size = this.estimateObjectSize(obj);
    this.largeObjects.set(key, obj);
    this.objectSizes.set(key, size);
  }

  // الحصول على كائن كبير
  getLargeObject(key: string): any | null {
    return this.largeObjects.get(key) || null;
  }

  // إزالة كائن كبير
  removeLargeObject(key: string) {
    this.largeObjects.delete(key);
    this.objectSizes.delete(key);
  }

  // تقدير حجم الكائن
  private estimateObjectSize(obj: any): number {
    try {
      return JSON.stringify(obj).length;
    } catch {
      return 0;
    }
  }

  // تنظيف الكائنات الكبيرة
  cleanupLargeObjects(maxSize: number = 1000000) { // 1MB
    const entries = Array.from(this.objectSizes.entries());
    entries.sort((a, b) => b[1] - a[1]); // ترتيب تنازلي حسب الحجم

    let totalSize = 0;
    for (const [key, size] of entries) {
      totalSize += size;
      if (totalSize > maxSize) {
        this.removeLargeObject(key);
      }
    }
  }
}

// تحسينات الاتصال
export class ConnectionOptimizer {
  private static instance: ConnectionOptimizer;
  private connectionAttempts = new Map<string, number>();
  private lastConnectionTime = 0;
  private reconnectDelay = 1000;

  static getInstance(): ConnectionOptimizer {
    if (!ConnectionOptimizer.instance) {
      ConnectionOptimizer.instance = new ConnectionOptimizer();
    }
    return ConnectionOptimizer.instance;
  }

  // تسجيل محاولة اتصال
  recordConnectionAttempt(url: string) {
    const attempts = this.connectionAttempts.get(url) || 0;
    this.connectionAttempts.set(url, attempts + 1);
    this.lastConnectionTime = Date.now();
  }

  // التحقق من إمكانية إعادة الاتصال
  canReconnect(url: string, maxAttempts: number = 5): boolean {
    const attempts = this.connectionAttempts.get(url) || 0;
    const timeSinceLastAttempt = Date.now() - this.lastConnectionTime;
    
    return attempts < maxAttempts && timeSinceLastAttempt > this.reconnectDelay;
  }

  // إعادة تعيين محاولات الاتصال
  resetConnectionAttempts(url: string) {
    this.connectionAttempts.delete(url);
  }

  // زيادة تأخير إعادة الاتصال
  increaseReconnectDelay() {
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // أقصى 30 ثانية
  }

  // إعادة تعيين تأخير إعادة الاتصال
  resetReconnectDelay() {
    this.reconnectDelay = 1000;
  }
}

// تصدير المدراء كـ singletons
export const messageCache = new MessageCacheManager();
export const networkOptimizer = new NetworkOptimizer();
export const notificationManager = globalNotificationManager.getInstance();
export const performanceOptimizer = PerformanceOptimizer.getInstance();
export const memoryOptimizer = MemoryOptimizer.getInstance();
export const connectionOptimizer = ConnectionOptimizer.getInstance();