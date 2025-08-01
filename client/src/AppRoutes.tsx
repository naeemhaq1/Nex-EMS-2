
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
<line_number>1</line_number>
import React from 'react';
import { Switch, Route } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useMobile } from '@/hooks/use-mobile';

// Desktop Components
import Layout from '@/components/Layout';
import DesktopEmployeeDashboard from '@/pages/DesktopEmployeeDashboard';
import DesktopAdminDashboard from '@/pages/DesktopAdminDashboard';
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';
import AttendanceRecords from '@/pages/AttendanceRecords';
import EmployeeDirectory from '@/pages/EmployeeDirectory';
import EmployeeProfile from '@/pages/EmployeeProfile';

// Mobile Components
import MobileLayout from '@/components/MobileLayout';
import MobileRouter from '@/components/MobileRouter';

// Other Components
import NotFound from '@/pages/not-found';

const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();
  const isMobile = useMobile();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1B3E] flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // Mobile routing
  if (isMobile) {
    return (
      <MobileLayout>
        <MobileRouter />
      </MobileLayout>
    );
  }

  // Desktop routing
  const isAdmin = ['admin', 'superadmin', 'general_admin', 'manager'].includes(user.role || '');

  return (
    <Layout>
      <Switch>
        <Route path="/" component={() => isAdmin ? <DesktopAdminDashboard /> : <DesktopEmployeeDashboard />} />
        <Route path="/dashboard" component={() => isAdmin ? <DesktopAdminDashboard /> : <DesktopEmployeeDashboard />} />
        <Route path="/desktop/admin/dashboard" component={DesktopAdminDashboard} />
        <Route path="/desktop/employee/dashboard" component={DesktopEmployeeDashboard} />
        <Route path="/admin/dashboard" component={DesktopAdminDashboard} />
        <Route path="/employee/dashboard" component={DesktopEmployeeDashboard} />
        <Route path="/attendance" component={AttendanceRecords} />
        <Route path="/employees" component={EmployeeDirectory} />
        <Route path="/employee/:id" component={EmployeeProfile} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
};

export default AppRoutes;
