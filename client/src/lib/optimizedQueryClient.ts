import { QueryClient } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";

// تكوين محسن لـ React Query
export const optimizedQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // دالة الاستعلام الافتراضية
      queryFn: async ({ queryKey }) => {
        const [url, params] = queryKey as [string, Record<string, any>?];
        if (params) {
          const searchParams = new URLSearchParams();
          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              searchParams.append(key, String(value));
            }
          });
          const paramString = searchParams.toString();
          return apiRequest(`${url}${paramString ? `?${paramString}` : ''}`);
        }
        return apiRequest(url);
      },

      // إعدادات التخزين المؤقت
      staleTime: 5 * 60 * 1000, // 5 دقائق
      gcTime: 10 * 60 * 1000, // 10 دقائق (previously cacheTime)
      
      // إعدادات إعادة المحاولة
      retry: (failureCount, error: any) => {
        // عدم إعادة المحاولة للأخطاء 401 و 403
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        // إعادة المحاولة مرتين فقط
        return failureCount < 2;
      },
      
      // إعدادات إعادة الجلب
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
      
      // إعدادات الأداء
      networkMode: 'online',
      throwOnError: false,
      
      // إعدادات التحديث
      notifyOnChangeProps: ['data', 'error', 'isLoading'],
    },
    
    mutations: {
      // إعدادات الطفرات
      retry: 1,
      networkMode: 'online',
      throwOnError: false,
    },
  },
});

// تكوين خاص للرسائل
export const messageQueryConfig = {
  staleTime: 30 * 1000, // 30 ثانية للرسائل
  gcTime: 5 * 60 * 1000, // 5 دقائق
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
};

// تكوين خاص للمستخدمين
export const userQueryConfig = {
  staleTime: 2 * 60 * 1000, // دقيقتان للمستخدمين
  gcTime: 10 * 60 * 1000, // 10 دقائق
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
};

// تكوين خاص للغرف
export const roomQueryConfig = {
  staleTime: 5 * 60 * 1000, // 5 دقائق للغرف
  gcTime: 15 * 60 * 1000, // 15 دقيقة
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
};

// تكوين خاص للإشعارات
export const notificationQueryConfig = {
  staleTime: 10 * 1000, // 10 ثوان للإشعارات
  gcTime: 2 * 60 * 1000, // دقيقتان
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
};

// دالة لتنظيف Cache
export const cleanupQueryCache = () => {
  // تنظيف الاستعلامات القديمة
  optimizedQueryClient.removeQueries({
    predicate: (query) => {
      const queryKey = query.queryKey;
      const isOld = query.state.dataUpdatedAt < Date.now() - 30 * 60 * 1000; // 30 دقيقة
      const isUnused = !(query.state as any).isFetching && !(query.state as any).isStale;
      return isOld || isUnused;
    },
  });
  
  // تنظيف الطفرات القديمة
  // optimizedQueryClient.removeMutations({
  //   predicate: (mutation) => {
  //     return mutation.state.submittedAt < Date.now() - 10 * 60 * 1000; // 10 دقائق
  //   },
  // });
};

// دالة لتنظيف Cache حسب النوع
export const cleanupQueryCacheByType = (type: 'messages' | 'users' | 'rooms' | 'notifications') => {
  const configs = {
    messages: messageQueryConfig,
    users: userQueryConfig,
    rooms: roomQueryConfig,
    notifications: notificationQueryConfig,
  };
  
  optimizedQueryClient.removeQueries({
    predicate: (query) => {
      const queryKey = query.queryKey;
      return Array.isArray(queryKey) && queryKey[0]?.includes(type);
    },
  });
};

// دالة لتنظيف Cache تلقائياً
export const setupAutoCacheCleanup = () => {
  // تنظيف كل 5 دقائق
  setInterval(() => {
    cleanupQueryCache();
  }, 5 * 60 * 1000);
  
  // تنظيف عند تغيير الصفحة
  window.addEventListener('beforeunload', () => {
    cleanupQueryCache();
  });
  
  // تنظيف عند إخفاء الصفحة
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      setTimeout(cleanupQueryCache, 1000);
    }
  });
};

// دالة لتحسين الأداء
export const optimizeQueryPerformance = () => {
  // إعداد مراقبة الأداء
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'measure') {
        const duration = entry.duration;
        if (duration > 1000) { // أكثر من ثانية واحدة
          console.warn(`🐌 استعلام بطيء: ${entry.name} استغرق ${duration.toFixed(2)}ms`);
        }
      }
    }
  });
  
  observer.observe({ entryTypes: ['measure'] });
  
  // إعداد مراقبة الذاكرة
  if ('memory' in performance) {
    setInterval(() => {
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;
      
      if (usedMB > 100) {
        console.warn(`💾 استخدام ذاكرة مرتفع: ${usedMB.toFixed(2)} MB`);
        cleanupQueryCache();
      }
    }, 30000); // كل 30 ثانية
  }
};

// دالة لتحسين الاستعلامات
export const optimizeQueries = () => {
  // إعداد التكوين المحسن
  setupAutoCacheCleanup();
  optimizeQueryPerformance();
  
  // إعداد مراقبة الأخطاء
  optimizedQueryClient.setDefaultOptions({
    queries: {
      ...optimizedQueryClient.getDefaultOptions().queries,
      // onError: (error: any) => {
      //   console.error('خطأ في الاستعلام:', error);
      // },
    },
    mutations: {
      ...optimizedQueryClient.getDefaultOptions().mutations,
      onError: (error: any) => {
        console.error('خطأ في الطفرة:', error);
      },
    },
  });
};

// تم إزالة التصديرات المكررة