// تحسينات الأداء
import { useCallback, useEffect, useRef } from 'react';

// تحسين التمرير السلس
export const useSmoothScroll = () => {
  const scrollToBottom = useCallback((element: HTMLElement) => {
    if (!element) return;
    
    // استخدام requestAnimationFrame لتحسين الأداء
    requestAnimationFrame(() => {
      element.scrollTo({
        top: element.scrollHeight,
        behavior: 'smooth'
      });
    });
  }, []);

  return { scrollToBottom };
};

// تحسين تحديث الرسائل
export const useOptimizedUpdates = () => {
  const updateQueue = useRef<(() => void)[]>([]);
  const isProcessing = useRef(false);

  const queueUpdate = useCallback((updateFn: () => void) => {
    updateQueue.current.push(updateFn);
    
    if (!isProcessing.current) {
      isProcessing.current = true;
      
      // معالجة التحديثات في الدفعة التالية
      requestAnimationFrame(() => {
        while (updateQueue.current.length > 0) {
          const update = updateQueue.current.shift();
          if (update) update();
        }
        isProcessing.current = false;
      });
    }
  }, []);

  return { queueUpdate };
};

// تحسين ذاكرة التخزين المؤقت
export class MessageCache {
  private cache = new Map<string, any>();
  private maxSize = 1000;

  set(key: string, value: any) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  get(key: string) {
    return this.cache.get(key);
  }

  clear() {
    this.cache.clear();
  }
}

// تحسين التحميل التدريجي
export const useLazyLoading = () => {
  const observerRef = useRef<IntersectionObserver>();

  const setupObserver = useCallback((callback: () => void) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            callback();
          }
        });
      },
      { threshold: 0.1 }
    );

    return observerRef.current;
  }, []);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return { setupObserver };
};

// تحسين شبكة الاتصال
export const useNetworkOptimization = () => {
  const isOnline = useRef(navigator.onLine);
  const connectionQuality = useRef<'fast' | 'slow' | 'offline'>('fast');

  const checkConnection = useCallback(() => {
    const connection = (navigator as any).connection;
    
    if (!navigator.onLine) {
      connectionQuality.current = 'offline';
    } else if (connection) {
      // فحص سرعة الاتصال
      const effectiveType = connection.effectiveType;
      if (effectiveType === '4g' || effectiveType === '3g') {
        connectionQuality.current = 'fast';
      } else {
        connectionQuality.current = 'slow';
      }
    }

    return connectionQuality.current;
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      isOnline.current = true;
      checkConnection();
    };

    const handleOffline = () => {
      isOnline.current = false;
      connectionQuality.current = 'offline';
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnection]);

  return { 
    isOnline: isOnline.current, 
    connectionQuality: connectionQuality.current,
    checkConnection 
  };
};