import { QueryClient, QueryFunction } from "@tanstack/react-query";

// تعريف ApiResponse محلي لتجنب مشاكل الاستيراد
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// معالجة محسنة للأخطاء
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      const errorData = await res.json();
      
      // إذا كان الخطأ يحتوي على رسالة عربية، استخدمها
      const message = errorData.message || errorData.error || res.statusText;
      
      const error = new Error(message) as any;
      error.status = res.status;
      error.code = errorData.code;
      error.details = errorData.details;
      error.timestamp = errorData.timestamp;
      
      throw error;
    } catch (parseError) {
      // إذا فشل في parse JSON، استخدم النص العادي
      const text = await res.text() || res.statusText;
      const error = new Error(text) as any;
      error.status = res.status;
      throw error;
    }
  }
}

// دالة apiRequest محسّنة وموحدة
export async function apiRequest<T = any>(
  endpoint: string,
  options?: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
    timeout?: number;
    signal?: AbortSignal;
  }
): Promise<T> {
  const { method = 'GET', body, headers = {}, timeout = 30000, signal } = options || {};
  
  // تحديد نوع المحتوى والجسم بناءً على نوع البيانات
  const requestHeaders: Record<string, string> = { ...headers };
  let requestBody: any = body;
  
  // إذا كان FormData، لا نضيف Content-Type (المتصفح يضيفه تلقائياً مع boundary)
  if (!(body instanceof FormData)) {
    // لا تقم بتعيين Content-Type لطلبات GET أو عندما لا يكون هناك جسم
    if (body !== undefined && body !== null && method.toUpperCase() !== 'GET') {
      requestHeaders['Content-Type'] = 'application/json';
    }
    requestBody = body !== undefined ? JSON.stringify(body) : undefined;
  }

  // إرفاق رمز المصادقة تلقائياً إن وجد
  try {
    const token = localStorage.getItem('auth_token');
    if (token && !requestHeaders['Authorization']) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
  } catch {}
  
  // إضافة timeout للطلبات مع دعم signal خارجي
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      const onAbort = () => controller.abort();
      signal.addEventListener('abort', onAbort, { once: true });
    }
  }
  
  try {
    const res = await fetch(endpoint, {
      method,
      headers: requestHeaders,
      body: requestBody,
      credentials: "include",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    await throwIfResNotOk(res);
    
    // التحقق من نوع المحتوى المُعاد
    const contentType = res.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return await res.json();
    }
    
    return await res.text() as any;
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    // معالجة أخطاء مختلفة بطريقة أفضل
    if (error.name === 'AbortError') {
      const timeoutError = new Error('انتهت مهلة الطلب - يرجى المحاولة مرة أخرى') as any;
      timeoutError.code = 'TIMEOUT';
      timeoutError.status = 408;
      throw timeoutError;
    }
    
    if (!navigator.onLine) {
      const networkError = new Error('لا يوجد اتصال بالإنترنت') as any;
      networkError.code = 'NETWORK_ERROR';
      networkError.status = 0;
      throw networkError;
    }
    
    // تحسين رسائل الأخطاء الشائعة
    if (error.status === 401) {
      error.message = 'يجب تسجيل الدخول للوصول لهذه الصفحة';
    } else if (error.status === 403) {
      error.message = 'ليس لديك صلاحية للوصول لهذا المحتوى';
    } else if (error.status === 404) {
      error.message = 'المورد المطلوب غير موجود';
    } else if (error.status === 500) {
      error.message = 'خطأ في الخادم - يرجى المحاولة لاحقاً';
    } else if (error.status === 503) {
      error.message = 'الخدمة غير متاحة حالياً - يرجى المحاولة لاحقاً';
    }
    
    throw error;
  }
}

// Helper methods for better type safety
export const api = {
  get: <T = any>(endpoint: string): Promise<T> => 
    apiRequest<T>(endpoint, { method: 'GET' }),
  
  post: <T = any>(endpoint: string, data?: any): Promise<T> =>
    apiRequest<T>(endpoint, { method: 'POST', body: data }),
  
  put: <T = any>(endpoint: string, data?: any): Promise<T> =>
    apiRequest<T>(endpoint, { method: 'PUT', body: data }),
  
  delete: <T = any>(endpoint: string): Promise<T> =>
    apiRequest<T>(endpoint, { method: 'DELETE' }),
  
  patch: <T = any>(endpoint: string, data?: any): Promise<T> =>
    apiRequest<T>(endpoint, { method: 'PATCH', body: data }),

  // دالة مخصصة لرفع الملفات
  upload: <T = any>(endpoint: string, formData: FormData, options?: {
    timeout?: number;
    onProgress?: (progress: number) => void;
  }): Promise<T> => {
    const { timeout = 60000, onProgress } = options || {};
    
    // إذا كان هناك callback للتقدم، نستخدم XMLHttpRequest
    if (onProgress) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            onProgress(progress);
          }
        });
        
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch {
              resolve(xhr.responseText as any);
            }
          } else {
            reject(new Error(`${xhr.status}: ${xhr.statusText}`));
          }
        });
        
        xhr.addEventListener('error', () => {
          reject(new Error('فشل في رفع الملف'));
        });
        
        xhr.addEventListener('timeout', () => {
          reject(new Error('انتهت مهلة رفع الملف'));
        });
        
        xhr.timeout = timeout;
        xhr.open('POST', endpoint);
        xhr.withCredentials = true;
        xhr.send(formData);
      });
    }
    
    // استخدام apiRequest العادي إذا لم يكن هناك callback للتقدم
    return apiRequest<T>(endpoint, { 
      method: 'POST', 
      body: formData, 
      timeout 
    });
  },
};

const queryFn: QueryFunction = async ({ queryKey }) => {
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
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn,
      staleTime: 1000 * 60 * 10, // 10 minutes
      gcTime: 1000 * 60 * 30, // keep cached data for 30 min
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false,
      retry: (failureCount, error: any) => {
        if (error?.message?.includes('401') || error?.message?.includes('403')) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});
