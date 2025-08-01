
import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import { Loader2 } from 'lucide-react';

// Lazy load components
const MobileEmployeeDashboardWithAdmin = React.lazy(() => import('./pages/mobile/MobileEmployeeDashboardWithAdmin'));
const MobileAdminDashboard = React.lazy(() => import('./pages/mobile/MobileAdminDashboard'));
const DesktopEmployeeDashboard = React.lazy(() => import('./pages/DesktopEmployeeDashboard'));
const DesktopAdminDashboard = React.lazy(() => import('./pages/DesktopAdminDashboard'));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <div className="text-center">
      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
      <p className="text-sm text-gray-600">Loading...</p>
    </div>
  </div>
);

const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const isMobile = window.innerWidth <= 768;
  const isAdmin = user.role === 'admin' || user.role === 'super_admin';

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/login" element={<Navigate to="/" replace />} />
        
        {/* Mobile Routes */}
        {isMobile && (
          <>
            <Route path="/" element={<MobileEmployeeDashboardWithAdmin />} />
            {isAdmin && (
              <Route path="/admin/*" element={<MobileAdminDashboard />} />
            )}
          </>
        )}
        
        {/* Desktop Routes */}
        {!isMobile && (
          <>
            <Route path="/" element={isAdmin ? <DesktopAdminDashboard /> : <DesktopEmployeeDashboard />} />
            {isAdmin && (
              <Route path="/admin/*" element={<DesktopAdminDashboard />} />
            )}
          </>
        )}
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
