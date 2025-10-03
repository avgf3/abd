import type { QueryFunction } from '@tanstack/react-query';
import { QueryClient } from '@tanstack/react-query';

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
    // استخدم نسخة مستنسخة لقراءة الجسم بدون استهلاك الأصل
    const cloned = res.clone();
    const contentType = cloned.headers.get('content-type') || '';
    let message: string = res.statusText;
    let code: any = undefined;
    let details: any = undefined;
    let timestamp: any = undefined;

    try {
      if (contentType.includes('application/json')) {
        const errorData = await cloned.json();
        message = errorData?.message || errorData?.error || message;
        code = errorData?.code;
        details = errorData?.details;
        timestamp = errorData?.timestamp;
      } else {
        const text = await cloned.text();
        if (text) message = text;
      }
    } catch {
      // تجاهل أخطاء القراءة من النسخة المستنسخة
    }

    const error = new Error(message) as any;
    error.status = res.status;
    if (code !== undefined) error.code = code;
    if (details !== undefined) error.details = details;
    if (timestamp !== undefined) error.timestamp = timestamp;
    throw error;
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

  const requestHeaders: Record<string, string> = { ...headers };
  try {
    const existing = localStorage.getItem('deviceId');
    const deviceId = existing || 'web-' + Math.random().toString(36).slice(2);
    if (!existing) localStorage.setItem('deviceId', deviceId);
    requestHeaders['x-device-id'] = deviceId;
  } catch {
    // ignore
  }
  let requestBody: any = undefined;

  const upperMethod = method.toUpperCase();

  // Only set Content-Type and body when we actually send a JSON payload
  if (body instanceof FormData) {
    // Let the browser set the multipart boundary
    requestBody = body;
    // Ensure we don't override Content-Type for FormData
    delete requestHeaders['Content-Type'];
  } else if (body !== undefined && upperMethod !== 'GET') {
    requestHeaders['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(body);
  } else {
    // For GET or when no body, ensure Content-Type is not set to application/json
    delete requestHeaders['Content-Type'];
    requestBody = undefined;
  }

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
      method: upperMethod,
      headers: requestHeaders,
      body: requestBody,
      credentials: 'include',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    await throwIfResNotOk(res);

    const contentType = res.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return await res.json();
    }

    return (await res.text()) as any;
  } catch (error: any) {
    clearTimeout(timeoutId);

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

    if (error.status === 401) {
      error.message = 'يجب تسجيل الدخول للوصول لهذه الصفحة';
    } else if (error.status === 403) {
      error.message = 'ليس لديك صلاحية للوصول لهذا المحتوى';
    } else if (error.status === 404) {
      error.message = 'المورد المطلوب غير موجود';
    } else if (error.status === 413) {
      error.message = 'حجم الملف كبير جداً - يرجى اختيار ملف أصغر';
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
  get: <T = any>(endpoint: string): Promise<T> => apiRequest<T>(endpoint, { method: 'GET' }),

  post: <T = any>(endpoint: string, data?: any): Promise<T> =>
    apiRequest<T>(endpoint, { method: 'POST', body: data }),

  put: <T = any>(endpoint: string, data?: any): Promise<T> =>
    apiRequest<T>(endpoint, { method: 'PUT', body: data }),

  delete: <T = any>(endpoint: string): Promise<T> => apiRequest<T>(endpoint, { method: 'DELETE' }),

  patch: <T = any>(endpoint: string, data?: any): Promise<T> =>
    apiRequest<T>(endpoint, { method: 'PATCH', body: data }),

  // دالة مخصصة لرفع الملفات
  upload: <T = any>(
    endpoint: string,
    formData: FormData,
    options?: {
      timeout?: number;
      onProgress?: (progress: number) => void;
    }
  ): Promise<T> => {
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
            // حاول قراءة الرسالة JSON لإظهار سبب الرفض بدقة (مثل 413)
            try {
              const data = JSON.parse(xhr.responseText || '{}');
              const err: any = new Error(`${xhr.status}: ${data?.error || xhr.statusText || 'Upload failed'}`);
              err.status = xhr.status;
              return reject(err);
            } catch {
              const err: any = new Error(`${xhr.status}: ${xhr.statusText || 'Upload failed'}`);
              err.status = xhr.status;
              return reject(err);
            }
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('فشل في رفع الملف'));
        });

        xhr.addEventListener('timeout', () => {
          reject(new Error('انتهت مهلة رفع الملف'));
        });

        xhr.timeout = timeout || 0; // 0 لتعطيل المهلة عند الحاجة
        xhr.open('POST', endpoint);
        xhr.withCredentials = true;
        xhr.send(formData);
      });
    }

    // استخدام apiRequest العادي إذا لم يكن هناك callback للتقدم
    return apiRequest<T>(endpoint, {
      method: 'POST',
      body: formData,
      timeout,
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
