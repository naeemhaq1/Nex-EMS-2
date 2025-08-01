
import { QueryClient } from "@tanstack/react-query";

// Default query function for TanStack Query
const defaultQueryFn = async ({ queryKey }: { queryKey: string[] }) => {
  const url = `${window.location.origin}${queryKey[0]}`;
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!res.ok) {
    throw new Error('Network response was not ok');
  }
  
  return res.json();
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
