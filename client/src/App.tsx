import React from 'react';
import { Router, Route, Switch } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import Login from '@/pages/Login';
import MobileAdminDashboard from '@/pages/mobile/MobileAdminDashboard';
import MobileEmployeeDashboard from '@/pages/mobile/MobileEmployeeDashboard';
import DesktopAdminDashboard from '@/pages/DesktopAdminDashboard';
import DesktopEmployeeDashboard from '@/pages/DesktopEmployeeDashboard';
import { MobileRouter } from '@/pages/mobile/MobileRouter';
import { isMobile } from '@/lib/utils';
import '@/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1B3E] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const isUserMobile = isMobile();
  const isAdmin = user.isAdmin || user.role === 'admin' || user.role === 'super_admin';

  return (
    <Router>
      <Switch>
        {/* Mobile Routes */}
        {isUserMobile && (
          <>
            <Route path="/mobile/admin/dashboard">
              {isAdmin ? <MobileAdminDashboard /> : <MobileEmployeeDashboard />}
            </Route>
            <Route path="/mobile/employee/dashboard">
              <MobileEmployeeDashboard />
            </Route>
            <Route path="/mobile/*">
              <MobileRouter />
            </Route>
            <Route path="/">
              {isAdmin ? <MobileAdminDashboard /> : <MobileEmployeeDashboard />}
            </Route>
          </>
        )}

        {/* Desktop Routes */}
        {!isUserMobile && (
          <>
            <Route path="/admin/*">
              {isAdmin ? <DesktopAdminDashboard /> : <DesktopEmployeeDashboard />}
            </Route>
            <Route path="/employee/*">
              <DesktopEmployeeDashboard />
            </Route>
            <Route path="/">
              {isAdmin ? <DesktopAdminDashboard /> : <DesktopEmployeeDashboard />}
            </Route>
          </>
        )}

        {/* Fallback */}
        <Route>
          {isUserMobile 
            ? (isAdmin ? <MobileAdminDashboard /> : <MobileEmployeeDashboard />)
            : (isAdmin ? <DesktopAdminDashboard /> : <DesktopEmployeeDashboard />)
          }
        </Route>
      </Switch>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;