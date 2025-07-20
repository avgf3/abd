import { QueryClient, QueryFunction } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/chat";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest<T = any>(
  urlOrMethod: string,
  urlOrOptions?: string | {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
  },
  bodyOrUndefined?: any
): Promise<T> {
  let url: string;
  let options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
  };

  // دعم النمط القديم (method, url, body) والنمط الجديد (url, options)
  if (typeof urlOrOptions === 'string') {
    // النمط القديم: apiRequest(method, url, body)
    url = urlOrOptions;
    options = {
      method: urlOrMethod,
      body: bodyOrUndefined,
      headers: {}
    };
  } else {
    // النمط الجديد: apiRequest(url, options)
    url = urlOrMethod;
    options = urlOrOptions || {};
  }

  const { method = 'GET', body, headers = {} } = options;
  
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  if (res.headers.get('content-type')?.includes('application/json')) {
    return await res.json();
  }
  
  return await res.text() as any;
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
