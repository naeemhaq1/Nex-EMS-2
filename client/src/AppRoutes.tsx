
import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
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

export default AppRoutes;
