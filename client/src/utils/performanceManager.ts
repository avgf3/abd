/**
 * نظام إدارة الأداء المحسن
 * يحل مشاكل الأداء والتكرارات في الملف الشخصي
 */

interface PerformanceMetrics {
  renderTime: number;
  apiCallTime: number;
  memoryUsage: number;
  componentMounts: number;
  lastUpdate: number;
}

interface DebounceOptions {
  delay: number;
  maxWait?: number;
  leading?: boolean;
  trailing?: boolean;
}

class PerformanceManager {
  private static instance: PerformanceManager;
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private throttleTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly MAX_METRICS = 50;

  private constructor() {
    // تنظيف المقاييس القديمة كل 5 دقائق
    setInterval(() => this.cleanupOldMetrics(), 5 * 60 * 1000);
  }

  static getInstance(): PerformanceManager {
    if (!PerformanceManager.instance) {
      PerformanceManager.instance = new PerformanceManager();
    }
    return PerformanceManager.instance;
  }

  /**
   * تسجيل وقت التصيير
   */
  recordRenderTime(componentName: string, startTime: number): void {
    const renderTime = performance.now() - startTime;
    this.updateMetrics(componentName, { renderTime });
  }

  /**
   * تسجيل وقت استدعاء API
   */
  recordApiCallTime(apiName: string, startTime: number): void {
    const apiCallTime = performance.now() - startTime;
    this.updateMetrics(apiName, { apiCallTime });
  }

  /**
   * تسجيل استخدام الذاكرة
   */
  recordMemoryUsage(componentName: string): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
      this.updateMetrics(componentName, { memoryUsage });
    }
  }

  /**
   * تسجيل عدد مرات التحميل
   */
  recordComponentMount(componentName: string): void {
    const current = this.metrics.get(componentName);
    const componentMounts = (current?.componentMounts || 0) + 1;
    this.updateMetrics(componentName, { componentMounts });
  }

  /**
   * تحديث المقاييس
   */
  private updateMetrics(key: string, updates: Partial<PerformanceMetrics>): void {
    const current = this.metrics.get(key) || {
      renderTime: 0,
      apiCallTime: 0,
      memoryUsage: 0,
      componentMounts: 0,
      lastUpdate: Date.now(),
    };

    const updated = {
      ...current,
      ...updates,
      lastUpdate: Date.now(),
    };

    this.metrics.set(key, updated);

    // تحديد حجم المقاييس
    if (this.metrics.size > this.MAX_METRICS) {
      const oldestKey = Array.from(this.metrics.entries())
        .sort((a, b) => a[1].lastUpdate - b[1].lastUpdate)[0][0];
      this.metrics.delete(oldestKey);
    }
  }

  /**
   * دالة debounce محسنة
   */
  debounce<T extends (...args: any[]) => any>(
    key: string,
    func: T,
    options: DebounceOptions = { delay: 300 }
  ): T {
    const { delay, maxWait, leading, trailing = true } = options;
    let lastCallTime = 0;
    let maxWaitTimer: NodeJS.Timeout | null = null;

    return ((...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallTime;

      // إلغاء المهلة السابقة
      const existingTimer = this.debounceTimers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // تشغيل فوري إذا كان leading
      if (leading && timeSinceLastCall >= delay) {
        lastCallTime = now;
        return func(...args);
      }

      // إعداد مهلة maxWait
      if (maxWait && !maxWaitTimer) {
        maxWaitTimer = setTimeout(() => {
          maxWaitTimer = null;
          if (trailing) {
            lastCallTime = Date.now();
            func(...args);
          }
        }, maxWait);
      }

      // إعداد المهلة العادية
      const timer = setTimeout(() => {
        this.debounceTimers.delete(key);
        if (trailing) {
          lastCallTime = Date.now();
          func(...args);
        }
      }, delay);

      this.debounceTimers.set(key, timer);
    }) as T;
  }

  /**
   * دالة throttle محسنة
   */
  throttle<T extends (...args: any[]) => any>(
    key: string,
    func: T,
    delay: number = 300
  ): T {
    return ((...args: Parameters<T>) => {
      const existingTimer = this.throttleTimers.get(key);
      if (existingTimer) {
        return;
      }

      const timer = setTimeout(() => {
        this.throttleTimers.delete(key);
        func(...args);
      }, delay);

      this.throttleTimers.set(key, timer);
    }) as T;
  }

  /**
   * تنظيف المقاييس القديمة
   */
  private cleanupOldMetrics(): void {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    for (const [key, metrics] of this.metrics.entries()) {
      if (metrics.lastUpdate < fiveMinutesAgo) {
        this.metrics.delete(key);
      }
    }
  }

  /**
   * الحصول على إحصائيات الأداء
   */
  getPerformanceStats(): {
    totalComponents: number;
    averageRenderTime: number;
    averageApiCallTime: number;
    totalMounts: number;
    slowestComponents: Array<{ name: string; renderTime: number }>;
  } {
    const components = Array.from(this.metrics.values());
    
    if (components.length === 0) {
      return {
        totalComponents: 0,
        averageRenderTime: 0,
        averageApiCallTime: 0,
        totalMounts: 0,
        slowestComponents: [],
      };
    }

    const totalRenderTime = components.reduce((sum, c) => sum + c.renderTime, 0);
    const totalApiCallTime = components.reduce((sum, c) => sum + c.apiCallTime, 0);
    const totalMounts = components.reduce((sum, c) => sum + c.componentMounts, 0);

    const slowestComponents = Array.from(this.metrics.entries())
      .filter(([_, metrics]) => metrics.renderTime > 0)
      .sort((a, b) => b[1].renderTime - a[1].renderTime)
      .slice(0, 5)
      .map(([name, metrics]) => ({ name, renderTime: metrics.renderTime }));

    return {
      totalComponents: components.length,
      averageRenderTime: totalRenderTime / components.length,
      averageApiCallTime: totalApiCallTime / components.length,
      totalMounts,
      slowestComponents,
    };
  }

  /**
   * تنظيف جميع المهلات
   */
  clearAllTimers(): void {
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.throttleTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    this.throttleTimers.clear();
  }

  /**
   * مسح جميع المقاييس
   */
  clearMetrics(): void {
    this.metrics.clear();
  }
}

// تصدير instance واحد فقط
export const performanceManager = PerformanceManager.getInstance();

// تصدير دوال مساعدة للاستخدام المباشر
export const debounce = <T extends (...args: any[]) => any>(
  key: string,
  func: T,
  options?: DebounceOptions
): T => {
  return performanceManager.debounce(key, func, options);
};

export const throttle = <T extends (...args: any[]) => any>(
  key: string,
  func: T,
  delay?: number
): T => {
  return performanceManager.throttle(key, func, delay);
};

export const recordRenderTime = (componentName: string, startTime: number): void => {
  performanceManager.recordRenderTime(componentName, startTime);
};

export const recordApiCallTime = (apiName: string, startTime: number): void => {
  performanceManager.recordApiCallTime(apiName, startTime);
};

export const getPerformanceStats = () => {
  return performanceManager.getPerformanceStats();
};