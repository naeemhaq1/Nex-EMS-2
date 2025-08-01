import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from 'react-query';

// Lazy load components
const Login = React.lazy(() => import('@/pages/Login'));
const Dashboard = React.lazy(() => import('@/pages/Dashboard'));
const MobileRouter = React.lazy(() => import('@/pages/mobile/MobileRouter'));
const NotFound = React.lazy(() => import('@/pages/not-found'));

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
  </div>
);

const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Check if device is mobile
  const isMobile = React.useMemo(() => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isMobileUA = /Android|iPhone|iPad|iPod|BlackBerry|Windows Phone|Mobile|Tablet|Opera Mini|IEMobile/i.test(userAgent);
    const isMobileWidth = window.innerWidth <= 768;
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    return isMobileUA || isMobileWidth || isTouchDevice;
  }, []);

  const setLocation = (path: string) => {
    navigate(path, { replace: true });
  };

  // Enhanced mobile device detection and redirect
  React.useEffect(() => {
    const checkForMobileRedirect = () => {
      if (!user || loading) return false;

      // Force mobile redirect for common mobile user agents
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobileUA = /Android|iPhone|iPad|iPod|BlackBerry|Windows Phone|Mobile|Tablet|Opera Mini|IEMobile/i.test(userAgent);
      const isMobileWidth = window.innerWidth <= 768;
      const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      const hasOrientation = typeof window.orientation !== 'undefined';

      // Be more aggressive with mobile detection
      const isMobile = isMobileUA || isMobileWidth || (isTouchDevice && hasOrientation);

      // Force redirect if mobile detected and not already on mobile route
      if (isMobile && !location.pathname.startsWith('/mobile')) {
        console.log('Mobile device detected, forcing redirect to mobile interface');
        if (user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'general_admin') {
          setLocation('/mobile/admin/dashboard');
        } else {
          setLocation('/mobile/employee/dashboard');
        }
        return true;
      }
      return false;
    };

    checkForMobileRedirect();
  }, [user, loading, location, setLocation]);


  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Public routes */}
        <Route 
          path="/login" 
          element={!user ? <Login /> : <Navigate to={isMobile ? "/mobile" : "/dashboard"} replace />} 
        />

        {/* Protected routes */}
        <Route 
          path="/dashboard" 
          element={user ? <Dashboard /> : <Navigate to="/login" replace />} 
        />

        {/* Mobile routes */}
        <Route 
          path="/mobile/*" 
          element={user ? <MobileRouter /> : <Navigate to="/login" replace />} 
        />

        {/* Root redirect with mobile detection */}
        <Route 
          path="/" 
          element={
            <Navigate 
              to={
                user 
                  ? (isMobile ? "/mobile" : "/dashboard")
                  : "/login"
              } 
              replace 
            />
          } 
        />

        {/* 404 page */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;