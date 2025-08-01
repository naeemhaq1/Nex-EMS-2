
<old_str>import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useMobile } from './hooks/use-mobile';

// Import pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MobileEmployeeDashboard from './pages/mobile/MobileEmployeeDashboard';
import MobileAdminDashboard from './pages/mobile/admin/MobileAdminDashboard';
import MobileAttendance from './pages/mobile/MobileAttendance';
import MobileSettings from './pages/mobile/MobileSettings';

export default function AppRoutes() {
  const { user, loading } = useAuth();
  const isMobile = useMobile();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Mobile routes
  if (isMobile) {
    if (user.role === 'admin' || user.role === 'superadmin') {
      return (
        <Routes>
          <Route path="/" element={<MobileAdminDashboard />} />
          <Route path="/dashboard" element={<MobileAdminDashboard />} />
          <Route path="/attendance" element={<MobileAttendance />} />
          <Route path="/settings" element={<MobileSettings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      );
    } else {
      return (
        <Routes>
          <Route path="/" element={<MobileEmployeeDashboard />} />
          <Route path="/dashboard" element={<MobileEmployeeDashboard />} />
          <Route path="/attendance" element={<MobileAttendance />} />
          <Route path="/settings" element={<MobileSettings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      );
    }
  }

  // Desktop routes
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}</old_str>
<new_str>import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMobile } from '@/hooks/use-mobile';

// Desktop Components
import Layout from '@/components/Layout';
import DesktopEmployeeDashboard from '@/pages/DesktopEmployeeDashboard';
import DesktopAdminDashboard from '@/pages/DesktopAdminDashboard';
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
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Mobile routing - Use MobileRouter component
  if (isMobile) {
    return (
      <MobileLayout>
        <MobileRouter />
      </MobileLayout>
    );
  }

  // Desktop routing - Determine dashboard based on user role
  const isAdmin = ['admin', 'superadmin', 'general_admin', 'manager'].includes(user.role || '');

  return (
    <Layout>
      <Suspense fallback={
        <div className="min-h-screen bg-[#1A1B3E] flex items-center justify-center">
          <div className="text-white text-lg">Loading...</div>
        </div>
      }>
        <Routes>
          <Route path="/" element={isAdmin ? <DesktopAdminDashboard /> : <DesktopEmployeeDashboard />} />
          <Route path="/dashboard" element={isAdmin ? <DesktopAdminDashboard /> : <DesktopEmployeeDashboard />} />
          <Route path="/desktop/admin/dashboard" element={<DesktopAdminDashboard />} />
          <Route path="/desktop/employee/dashboard" element={<DesktopEmployeeDashboard />} />
          <Route path="/admin/dashboard" element={<DesktopAdminDashboard />} />
          <Route path="/employee/dashboard" element={<DesktopEmployeeDashboard />} />
          <Route path="/attendance" element={<AttendanceRecords />} />
          <Route path="/employees" element={<EmployeeDirectory />} />
          <Route path="/employee/:id" element={<EmployeeProfile />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Layout>
  );
};

export default AppRoutes;</new_str>
