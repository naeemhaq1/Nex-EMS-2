import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMobile } from '@/hooks/use-mobile';

// Lazy load components for better performance
const Login = React.lazy(() => import('@/pages/Login'));
const Dashboard = React.lazy(() => import('@/pages/Dashboard'));
const MobileRouter = React.lazy(() => import('@/components/MobileRouter'));

// Desktop Components
const Layout = React.lazy(() => import('@/components/Layout'));
const DesktopEmployeeDashboard = React.lazy(() => import('@/pages/DesktopEmployeeDashboard'));
const DesktopAdminDashboard = React.lazy(() => import('@/pages/DesktopAdminDashboard'));
const AttendanceRecords = React.lazy(() => import('@/pages/AttendanceRecords'));
const EmployeeDirectory = React.lazy(() => import('@/pages/EmployeeDirectory'));
const EmployeeProfile = React.lazy(() => import('@/pages/EmployeeProfile'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-[#1A1B3E]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

export default function AppRoutes() {
  const { user, loading } = useAuth();
  const isMobile = useMobile();

  if (loading) {
    return <LoadingFallback />;
  }

  if (!user) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <Login />
      </Suspense>
    );
  }

  // Mobile routing
  if (isMobile) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <MobileRouter />
      </Suspense>
    );
  }

  // Desktop routing
  const isAdmin = ['admin', 'superadmin', 'general_admin', 'manager'].includes(user.role || '');

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Layout>
        <Routes>
          <Route 
            path="/" 
            element={isAdmin ? <DesktopAdminDashboard /> : <DesktopEmployeeDashboard />} 
          />
          <Route 
            path="/dashboard" 
            element={isAdmin ? <DesktopAdminDashboard /> : <DesktopEmployeeDashboard />} 
          />
          <Route path="/desktop/admin/dashboard" element={<DesktopAdminDashboard />} />
          <Route path="/desktop/employee/dashboard" element={<DesktopEmployeeDashboard />} />
          <Route path="/admin/dashboard" element={<DesktopAdminDashboard />} />
          <Route path="/employee/dashboard" element={<DesktopEmployeeDashboard />} />
          <Route path="/attendance" element={<AttendanceRecords />} />
          <Route path="/employees" element={<EmployeeDirectory />} />
          <Route path="/employee/:id" element={<EmployeeProfile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Suspense>
  );
}