
import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMobile } from '@/hooks/use-mobile';

// Lazy load components for better performance
const Login = React.lazy(() => import('@/pages/Login'));
const Dashboard = React.lazy(() => import('@/pages/Dashboard'));
const MobileRouter = React.lazy(() => import('@/components/MobileRouter'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

export default function AppRoutes() {
  const { user, loading } = useAuth();
  const isMobile = useMobile();

  if (loading) {
    return <LoadingFallback />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route 
          path="/login" 
          element={!user ? <Login /> : <Navigate to="/" replace />} 
        />
        <Route 
          path="/*" 
          element={
            user ? (
              isMobile ? <MobileRouter /> : <Dashboard />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
      </Routes>
    </Suspense>
  );
}
