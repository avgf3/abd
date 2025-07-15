import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  urlOrMethod: string,
  urlOrOptions?: string | {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
  },
  bodyOrUndefined?: any
): Promise<any> {
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
  return await res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
