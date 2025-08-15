// ===== تحسينات الأداء للنظام الموحد =====
// يحسن الأداء ويقلل التأخير في تطبيق الثيمات والتأثيرات

import { applyUnifiedTheme, getUnifiedTheme } from './unifiedThemeSystem';

/**
 * كلاس لإدارة تحسينات الأداء
 */
export class PerformanceOptimizer {
  private animationFrameId: number | null = null;
  private pendingUpdates = new Set<() => void>();
  private lastRenderTime = 0;
  private readonly MIN_RENDER_INTERVAL = 16; // ~60fps

  /**
   * تطبيق التحديثات مع تحسين الأداء
   */
  scheduleUpdate(updateFunction: () => void): void {
    this.pendingUpdates.add(updateFunction);
    
    if (this.animationFrameId === null) {
      this.animationFrameId = requestAnimationFrame(() => {
        this.processPendingUpdates();
      });
    }
  }

  /**
   * معالجة التحديثات المعلقة
   */
  private processPendingUpdates(): void {
    const now = performance.now();
    
    if (now - this.lastRenderTime >= this.MIN_RENDER_INTERVAL) {
      this.pendingUpdates.forEach(update => update());
      this.pendingUpdates.clear();
      this.lastRenderTime = now;
    } else {
      // إعادة الجدولة إذا كان التحديث مبكراً جداً
      this.animationFrameId = requestAnimationFrame(() => {
        this.processPendingUpdates();
      });
      return;
    }

    this.animationFrameId = null;
  }

  /**
   * تنظيف الموارد
   */
  cleanup(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.pendingUpdates.clear();
  }
}

// Instance مشترك
export const performanceOptimizer = new PerformanceOptimizer();

/**
 * تطبيق الثيم مع تحسين الأداء
 */
export function applyThemeOptimized(themeId: string): void {
  performanceOptimizer.scheduleUpdate(() => {
    applyUnifiedTheme(themeId);
  });
}

/**
 * تحسين الذاكرة بإزالة العقد غير المستخدمة
 */
export function optimizeMemory(): void {
  // إزالة العقد المحملة ديناميكياً التي لم تعد مستخدمة
  const unusedStyleSheets = document.querySelectorAll('style[data-theme-dynamic]');
  unusedStyleSheets.forEach(sheet => {
    if (sheet.textContent && sheet.textContent.trim() === '') {
      sheet.remove();
    }
  });

  // تنظيف event listeners القديمة
  const oldThemeElements = document.querySelectorAll('[data-old-theme]');
  oldThemeElements.forEach(element => {
    element.removeAttribute('data-old-theme');
  });
}

/**
 * تقليل تأثير الحركات على الأداء
 */
export function optimizeAnimations(): void {
  // فحص دعم الحركات المتقدمة
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if (prefersReducedMotion) {
    // تعطيل الحركات المعقدة للمستخدمين الذين يفضلون تقليل الحركة
    document.body.classList.add('reduce-motion');
  }

  // تحسين حركات CSS بواسطة will-change
  const animatedElements = document.querySelectorAll('.theme-animated, [class*="effect-"]');
  animatedElements.forEach(element => {
    const htmlElement = element as HTMLElement;
    htmlElement.style.willChange = 'transform, opacity, filter';
    
    // إزالة will-change بعد انتهاء الحركة
    setTimeout(() => {
      htmlElement.style.willChange = 'auto';
    }, 3000);
  });
}

/**
 * تحسين تحميل الثيمات
 */
export function optimizeThemeLoading(): void {
  // Pre-load critical theme data
  const criticalThemes = ['default', 'dark'];
  
  criticalThemes.forEach(themeId => {
    const theme = getUnifiedTheme(themeId);
    if (theme) {
      // إنشاء StyleSheet مؤقت للثيمات الحرجة
      const styleElement = document.createElement('style');
      styleElement.setAttribute('data-theme-preload', themeId);
      
      const cssVariables = Object.entries(theme.cssVars)
        .map(([property, value]) => `${property}: ${value};`)
        .join('\n');
      
      styleElement.textContent = `:root.preload-${themeId} { ${cssVariables} }`;
      document.head.appendChild(styleElement);
    }
  });
}

/**
 * تحسين الشفافية لتجنب مشاكل الأداء
 */
export function optimizeTransparency(): void {
  const style = document.createElement('style');
  style.setAttribute('data-transparency-optimization', 'true');
  
  style.textContent = `
    /* تحسين الشفافية لتحسين الأداء */
    .optimized-transparency {
      backface-visibility: hidden;
      transform: translateZ(0);
      will-change: opacity;
    }
    
    /* تحسين الكشطة للعناصر شبه الشفافة */
    .semi-transparent {
      isolation: isolate;
    }
    
    /* تقليل الإفراط في الرسم */
    .reduce-overdraw {
      contain: layout style paint;
    }
  `;
  
  document.head.appendChild(style);
}

/**
 * مراقب أداء للثيمات
 */
export class ThemePerformanceMonitor {
  private metrics = {
    themeChanges: 0,
    averageChangeTime: 0,
    lastChangeTime: 0,
    slowChanges: 0
  };

  /**
   * قياس أداء تغيير الثيم
   */
  measureThemeChange<T>(themeChangeFunction: () => T): T {
    const startTime = performance.now();
    
    const result = themeChangeFunction();
    
    const endTime = performance.now();
    const changeTime = endTime - startTime;
    
    this.updateMetrics(changeTime);
    
    if (changeTime > 100) { // أبطأ من 100ms
      console.warn(`⚠️ تغيير الثيم كان بطيئاً: ${changeTime.toFixed(2)}ms`);
      this.metrics.slowChanges++;
    }
    
    return result;
  }

  /**
   * تحديث إحصائيات الأداء
   */
  private updateMetrics(changeTime: number): void {
    this.metrics.themeChanges++;
    this.metrics.lastChangeTime = changeTime;
    
    // حساب المتوسط المتحرك
    const alpha = 0.1; // عامل التنعيم
    this.metrics.averageChangeTime = 
      (alpha * changeTime) + ((1 - alpha) * this.metrics.averageChangeTime);
  }

  /**
   * الحصول على تقرير الأداء
   */
  getPerformanceReport(): typeof this.metrics {
    return { ...this.metrics };
  }

  /**
   * إعادة تعيين الإحصائيات
   */
  reset(): void {
    this.metrics = {
      themeChanges: 0,
      averageChangeTime: 0,
      lastChangeTime: 0,
      slowChanges: 0
    };
  }
}

// Instance مشترك لمراقب الأداء
export const themePerformanceMonitor = new ThemePerformanceMonitor();

/**
 * تطبيق الثيم مع قياس الأداء
 */
export function applyThemeWithMonitoring(themeId: string): void {
  themePerformanceMonitor.measureThemeChange(() => {
    applyUnifiedTheme(themeId);
  });
}

/**
 * تحسين شامل للأداء - يجب استدعاؤه عند تهيئة التطبيق
 */
export function initializePerformanceOptimizations(): void {
  // تحسين الحركات
  optimizeAnimations();
  
  // تحسين الشفافية
  optimizeTransparency();
  
  // تحسين تحميل الثيمات
  optimizeThemeLoading();
  
  // تنظيف دوري للذاكرة
  setInterval(optimizeMemory, 30000); // كل 30 ثانية
  
  // إضافة مراقب الأداء في وضع التطوير
  if (process.env.NODE_ENV === 'development') {
    (window as any).themePerformanceMonitor = themePerformanceMonitor;
    console.log('🔧 تم تمكين مراقب أداء الثيمات في وضع التطوير');
  }
}

/**
 * تنظيف الموارد عند إغلاق التطبيق
 */
export function cleanupPerformanceOptimizations(): void {
  performanceOptimizer.cleanup();
  
  // إزالة الـ stylesheets المؤقتة
  const tempStyles = document.querySelectorAll('style[data-theme-preload], style[data-transparency-optimization]');
  tempStyles.forEach(style => style.remove());
}

/**
 * خطاف لتحسين التحديثات الكثيرة
 */
export function useOptimizedUpdates() {
  return {
    scheduleUpdate: (updateFn: () => void) => performanceOptimizer.scheduleUpdate(updateFn),
    cleanup: () => performanceOptimizer.cleanup()
  };
}