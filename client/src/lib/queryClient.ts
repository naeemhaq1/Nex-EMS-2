import { QueryClient } from "@tanstack/react-query";

// Default query function for TanStack Query
const defaultQueryFn = async ({ queryKey }: { queryKey: any[] }) => {
  const url = queryKey[0];
  console.log('Default queryFn called for:', url);

  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors except 408, 429
        if (error?.status >= 400 && error?.status < 500 && ![408, 429].includes(error?.status)) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      // Suppress AbortError logs
      onError: (error: any) => {
        if (error?.name === 'AbortError') {
          return; // Don't log AbortErrors
        }
        console.error('Query error:', error);
      },
    },
    mutations: {
      onError: (error: any) => {
        if (error?.name === 'AbortError') {
          return; // Don't log AbortErrors
        }
        console.error('Mutation error:', error);
      },
    },
  },
});