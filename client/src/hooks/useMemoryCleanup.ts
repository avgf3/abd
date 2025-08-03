import { useEffect, useCallback, useRef } from 'react';

interface MemoryCleanupOptions {
  cleanupInterval?: number; // بالمللي ثانية
  maxMemoryUsage?: number; // بالميجابايت
  enableConsoleLogs?: boolean;
}

// Hook لتنظيف الذاكرة التلقائي
export function useMemoryCleanup(options: MemoryCleanupOptions = {}) {
  const {
    cleanupInterval = 30000, // 30 ثانية
    maxMemoryUsage = 100, // 100 ميجابايت
    enableConsoleLogs = false
  } = options;

  const cleanupRef = useRef<NodeJS.Timeout>();
  const lastCleanupRef = useRef<number>(0);

  // دالة تنظيف الذاكرة
  const cleanupMemory = useCallback(() => {
    const now = Date.now();
    
    // منع التنظيف المتكرر
    if (now - lastCleanupRef.current < 5000) {
      return;
    }
    
    lastCleanupRef.current = now;

    if (enableConsoleLogs) {
      console.log('🧹 بدء تنظيف الذاكرة...');
    }

    // تنظيف timeouts
    const highestTimeoutId = setTimeout(';');
    for (let i = 0; i < highestTimeoutId; i++) {
      clearTimeout(i);
    }

    // تنظيف intervals
    const highestIntervalId = setInterval(';');
    for (let i = 0; i < highestIntervalId; i++) {
      clearInterval(i);
    }

    // تنظيف event listeners غير المستخدمة
    const events = ['resize', 'scroll', 'beforeunload', 'visibilitychange'];
    events.forEach(event => {
      window.removeEventListener(event, () => {});
    });

    // تنظيف localStorage إذا كان كبيراً جداً
    try {
      const localStorageSize = JSON.stringify(localStorage).length;
      if (localStorageSize > 1024 * 1024) { // أكثر من 1MB
        const keys = Object.keys(localStorage);
        const oldKeys = keys.slice(0, Math.floor(keys.length / 2));
        oldKeys.forEach(key => localStorage.removeItem(key));
        
        if (enableConsoleLogs) {
          console.log('🗑️ تم تنظيف localStorage');
        }
      }
    } catch (error) {
      // تجاهل الأخطاء
    }

    // تنظيف sessionStorage
    try {
      sessionStorage.clear();
    } catch (error) {
      // تجاهل الأخطاء
    }

    // تنظيف cache API إذا كان متاحاً
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          if (cacheName.includes('chat-cache')) {
            caches.delete(cacheName);
          }
        });
      });
    }

    // تنظيف IndexedDB إذا كان متاحاً
    if ('indexedDB' in window) {
      const databases = indexedDB.databases?.();
      if (databases) {
        databases.then(dbList => {
          dbList.forEach(db => {
            if (db.name.includes('chat')) {
              indexedDB.deleteDatabase(db.name);
            }
          });
        });
      }
    }

    if (enableConsoleLogs) {
      console.log('✅ تم تنظيف الذاكرة بنجاح');
    }
  }, [enableConsoleLogs]);

  // دالة مراقبة استخدام الذاكرة
  const checkMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;
      
      if (enableConsoleLogs) {
        console.log(`📊 استخدام الذاكرة: ${usedMB.toFixed(2)} MB`);
      }
      
      if (usedMB > maxMemoryUsage) {
        if (enableConsoleLogs) {
          console.warn(`⚠️ استخدام الذاكرة مرتفع: ${usedMB.toFixed(2)} MB`);
        }
        cleanupMemory();
      }
    }
  }, [maxMemoryUsage, cleanupMemory, enableConsoleLogs]);

  // دالة تنظيف شاملة
  const forceCleanup = useCallback(() => {
    cleanupMemory();
    
    // تنظيف إضافي للذاكرة
    if (window.gc) {
      window.gc();
    }
    
    // تنظيف React DevTools
    if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      const hook = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
      if (hook.renderers) {
        hook.renderers.clear();
      }
    }
  }, [cleanupMemory]);

  // إعداد التنظيف التلقائي
  useEffect(() => {
    // تنظيف دوري
    cleanupRef.current = setInterval(() => {
      checkMemoryUsage();
      cleanupMemory();
    }, cleanupInterval);

    // تنظيف عند تغيير الصفحة
    const handleBeforeUnload = () => {
      cleanupMemory();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // تنظيف عند إخفاء الصفحة
        setTimeout(cleanupMemory, 1000);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // تنظيف عند فقدان التركيز
    const handleBlur = () => {
      setTimeout(cleanupMemory, 5000);
    };

    window.addEventListener('blur', handleBlur);

    return () => {
      if (cleanupRef.current) {
        clearInterval(cleanupRef.current);
      }
      
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      
      // تنظيف نهائي
      cleanupMemory();
    };
  }, [cleanupInterval, checkMemoryUsage, cleanupMemory]);

  return {
    cleanupMemory,
    forceCleanup,
    checkMemoryUsage
  };
}

// Hook لتنظيف المكونات
export function useComponentCleanup(componentName: string) {
  const cleanupRef = useRef<(() => void)[]>([]);

  const addCleanup = useCallback((cleanupFn: () => void) => {
    cleanupRef.current.push(cleanupFn);
  }, []);

  useEffect(() => {
    return () => {
      // تنظيف جميع الدوال المسجلة
      cleanupRef.current.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.warn(`خطأ في تنظيف المكون ${componentName}:`, error);
        }
      });
      
      cleanupRef.current = [];
    };
  }, [componentName]);

  return { addCleanup };
}

// Hook لتنظيف البيانات المخزنة
export function useDataCleanup<T>(
  data: T[],
  maxItems: number = 100,
  cleanupKey?: keyof T
) {
  const cleanupData = useCallback(() => {
    if (data.length > maxItems) {
      // إزالة العناصر القديمة
      const itemsToRemove = data.length - maxItems;
      return data.slice(itemsToRemove);
    }
    return data;
  }, [data, maxItems]);

  return { cleanupData };
}

// Hook لتنظيف Cache
export function useCacheCleanup() {
  const cleanupCache = useCallback(async () => {
    // تنظيف Service Worker cache
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        const cacheKeys = await caches.keys();
                  for (const cacheName of cacheKeys) {
          if (cacheName.includes('chat') || cacheName.includes('v1')) {
            await caches.delete(cacheName);
          }
        }
      }
    }

    // تنظيف localStorage cache
    const keys = Object.keys(localStorage);
    const cacheKeys = keys.filter(key => 
      key.includes('cache') || 
      key.includes('query') || 
      key.includes('temp')
    );
    
    cacheKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        // تجاهل الأخطاء
      }
    });
  }, []);

  return { cleanupCache };
}