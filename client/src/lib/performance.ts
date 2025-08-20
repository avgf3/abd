// مكتبة تحسين الأداء المتقدمة
export class PerformanceManager {
  private observers: {
    intersection?: IntersectionObserver;
    resize?: ResizeObserver;
    mutation?: MutationObserver;
  } = {};

  private metrics = {
    renderTimes: [] as number[],
    memoryUsage: [] as number[],
    networkLatency: [] as number[],
  };

  // تحسين التمرير باستخدام Intersection Observer
  optimizeScrolling(container: HTMLElement, threshold = 0.1) {
    if (this.observers.intersection) {
      this.observers.intersection.disconnect();
    }

    this.observers.intersection = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const element = entry.target as HTMLElement;

          if (entry.isIntersecting) {
            // العنصر مرئي - تفعيل التحديثات
            element.style.visibility = 'visible';
            element.classList.remove('performance-hidden');
          } else {
            // العنصر غير مرئي - تعطيل التحديثات غير الضرورية
            element.classList.add('performance-hidden');
          }
        });
      },
      {
        root: container,
        threshold,
        rootMargin: '50px', // تحميل مسبق للعناصر القريبة
      }
    );

    return this.observers.intersection;
  }

  // تحسين الصور بالتحميل التدريجي
  lazyLoadImages(container: HTMLElement) {
    const images = container.querySelectorAll('img[data-src]');

    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          img.src = img.dataset.src || '';
          img.classList.remove('lazy');
          imageObserver.unobserve(img);
        }
      });
    });

    images.forEach((img) => imageObserver.observe(img));
    return imageObserver;
  }

  // مراقبة استخدام الذاكرة
  monitorMemoryUsage(interval = 5000) {
    const monitor = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usage = {
          used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
        };

        this.metrics.memoryUsage.push(usage.used);

        // تنبيه إذا تجاوز الاستخدام 150MB
        if (usage.used > 150) {
          console.warn(`⚠️ استخدام ذاكرة عالي: ${usage.used}MB`);
          this.triggerMemoryCleanup();
        }

        // الاحتفاظ بآخر 100 قياس فقط
        if (this.metrics.memoryUsage.length > 100) {
          this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-100);
        }
      }
    };

    monitor(); // قياس فوري
    return setInterval(monitor, interval);
  }

  // تنظيف الذاكرة
  private triggerMemoryCleanup() {
    // تنظيف event listeners غير المستخدمة
    this.cleanupEventListeners();

    // تنظيف DOM elements المخفية
    this.cleanupHiddenElements();

    // إجبار garbage collection إذا كان متاحاً
    if ('gc' in window) {
      (window as any).gc();
    }
  }

  // تنظيف المستمعين
  private cleanupEventListeners() {
    // إزالة مستمعي الأحداث من العناصر المحذوفة
    const elements = document.querySelectorAll('[data-cleanup="true"]');
    elements.forEach((element) => {
      const clonedElement = element.cloneNode(true);
      element.parentNode?.replaceChild(clonedElement, element);
    });
  }

  // تنظيف العناصر المخفية
  private cleanupHiddenElements() {
    const hiddenElements = document.querySelectorAll('.performance-hidden');
    hiddenElements.forEach((element) => {
      if (element.parentElement && !element.parentElement.isConnected) {
        element.remove();
      }
    });
  }

  // قياس أداء الشبكة
  async measureNetworkLatency(endpoint = '/api/ping') {
    const start = performance.now();

    try {
      await fetch(endpoint, {
        method: 'GET',
        cache: 'no-cache',
      });

      const latency = performance.now() - start;
      this.metrics.networkLatency.push(latency);

      // الاحتفاظ بآخر 50 قياس
      if (this.metrics.networkLatency.length > 50) {
        this.metrics.networkLatency = this.metrics.networkLatency.slice(-50);
      }

      return latency;
    } catch (error) {
      console.warn('فشل في قياس زمن الاستجابة:', error);
      return -1;
    }
  }

  // تحسين الرسوم البيانية
  async optimizeAnimations() {
    // تقليل معدل الإطارات للعتاد الضعيف
    const fps = await this.detectFrameRate();

    const fpsValue = await fps;
    if (fpsValue < 30) {
      document.documentElement.style.setProperty('--animation-duration', '0.5s');
      document.documentElement.classList.add('reduce-motion');
    } else if (fpsValue < 50) {
      document.documentElement.style.setProperty('--animation-duration', '0.3s');
    }
  }

  // اكتشاف معدل الإطارات
  private detectFrameRate(): Promise<number> {
    return new Promise((resolve) => {
      let frames = 0;
      const start = performance.now();

      const count = () => {
        frames++;
        if (performance.now() - start < 1000) {
          requestAnimationFrame(count);
        } else {
          resolve(frames);
        }
      };

      requestAnimationFrame(count);
    });
  }

  // تحليل الأداء العام
  getPerformanceReport() {
    const avgMemory =
      this.metrics.memoryUsage.length > 0
        ? this.metrics.memoryUsage.reduce((a, b) => a + b, 0) / this.metrics.memoryUsage.length
        : 0;

    const avgLatency =
      this.metrics.networkLatency.length > 0
        ? this.metrics.networkLatency.reduce((a, b) => a + b, 0) /
          this.metrics.networkLatency.length
        : 0;

    return {
      memory: {
        average: Math.round(avgMemory),
        current: this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1] || 0,
        trend: this.calculateTrend(this.metrics.memoryUsage),
      },
      network: {
        average: Math.round(avgLatency),
        current: this.metrics.networkLatency[this.metrics.networkLatency.length - 1] || 0,
        trend: this.calculateTrend(this.metrics.networkLatency),
      },
      recommendations: this.generateRecommendations(),
    };
  }

  // حساب الاتجاه
  private calculateTrend(data: number[]): 'improving' | 'stable' | 'degrading' {
    if (data.length < 10) return 'stable';

    const recent = data.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const older = data.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;

    const change = (recent - older) / older;

    if (change > 0.1) return 'degrading';
    if (change < -0.1) return 'improving';
    return 'stable';
  }

  // توليد توصيات التحسين
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const report = this.getPerformanceReport();

    if (report.memory.current > 100) {
      recommendations.push('استخدام الذاكرة عالي - فكر في إغلاق علامات تبويب أخرى');
    }

    if (report.network.current > 500) {
      recommendations.push('اتصال الشبكة بطيء - تحقق من اتصال الإنترنت');
    }

    if (report.memory.trend === 'degrading') {
      recommendations.push('أداء الذاكرة يتدهور - أعد تحميل الصفحة');
    }

    return recommendations;
  }

  // تنظيف شامل
  cleanup() {
    Object.values(this.observers).forEach((observer) => {
      if (observer) {
        observer.disconnect();
      }
    });

    this.observers = {};
    this.metrics = {
      renderTimes: [],
      memoryUsage: [],
      networkLatency: [],
    };
  }
}

// Hook React للأداء
import { useEffect } from 'react';

export function usePerformanceManager() {
  const manager = new PerformanceManager();

  useEffect(() => {
    // بدء مراقبة الأداء
    const memoryInterval = manager.monitorMemoryUsage();

    // تحسين الرسوم البيانية
    manager.optimizeAnimations();

    return () => {
      clearInterval(memoryInterval);
      manager.cleanup();
    };
  }, []);

  return manager;
}

// مثيل عام لمدير الأداء
export const globalPerformanceManager = new PerformanceManager();
