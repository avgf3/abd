import { QueryClient, QueryFunction } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/chat";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
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
  }
): Promise<T> {
  const { method = 'GET', body, headers = {}, timeout = 30000 } = options || {};
  
  // تحديد نوع المحتوى والجسم بناءً على نوع البيانات
  let requestHeaders: Record<string, string> = { ...headers };
  let requestBody: any = body;
  
  // إذا كان FormData، لا نضيف Content-Type (المتصفح يضيفه تلقائياً مع boundary)
  if (!(body instanceof FormData)) {
    requestHeaders['Content-Type'] = 'application/json';
    requestBody = body ? JSON.stringify(body) : undefined;
  }
  
  // إضافة timeout للطلبات
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
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
  } catch (error) {
    clearTimeout(timeoutId);
    
    // معالجة أخطاء timeout
    if (error.name === 'AbortError') {
      throw new Error('انتهت مهلة الطلب - يرجى المحاولة مرة أخرى');
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
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error: any) => {
        if (error?.message?.includes('401') || error?.message?.includes('403')) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});
