import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  options: {
    url: string;
    method?: string;
    data?: unknown | undefined;
  }
): Promise<any> {
  const { url, method = "GET", data } = options;

  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);

  // For 204 No Content responses, don't try to parse JSON
  if (res.status === 204) {
    return null;
  }

  // Check if response has JSON content
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return await res.json();
  }

  // For other responses, try to parse as JSON (fallback)
  try {
    return await res.json();
  } catch {
    // If JSON parsing fails, return null for successful responses
    return null;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
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
      staleTime: 5 * 60 * 1000, // 5 minutes cache for faster startup
      cacheTime: 10 * 60 * 1000, // 10 minutes memory retention
      retry: 1, // Single retry for failed requests
      networkMode: 'online', // Skip network checks
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
});