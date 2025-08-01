import React, { Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import AppRoutes from './AppRoutes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      queryFn: async ({ queryKey }) => {
        const url = Array.isArray(queryKey) ? queryKey[0] : queryKey;
        const response = await fetch(url as string, {
          credentials: 'include',
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      },
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <TooltipProvider>
            <BrowserRouter>
              <div className="min-h-screen bg-background text-foreground">
                <AppRoutes />
                <Toaster />
              </div>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;