
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// Import mobile pages with error boundaries
const MobileEmployeeDashboard = React.lazy(() => import('@/pages/mobile/MobileEmployeeDashboard'));
const MobileAdminDashboard = React.lazy(() => import('@/pages/mobile/MobileAdminDashboard'));
const MobileAttendance = React.lazy(() => import('@/pages/mobile/MobileAttendance'));
const MobileSettings = React.lazy(() => import('@/pages/mobile/MobileSettings'));
const MobileAnalytics = React.lazy(() => import('@/pages/mobile/MobileAnalytics'));
const MobileEmployeeDirectory = React.lazy(() => import('@/pages/mobile/MobileEmployeeDirectory'));

export default function MobileRouter() {
  const { user } = useAuth();
  const isAdmin = ['admin', 'superadmin', 'general_admin', 'manager'].includes(user?.role || '');

  return (
    <div className="min-h-screen bg-[#1A1B3E] text-white">
      <React.Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }>
        <Routes>
          <Route path="/" element={
            isAdmin ? <MobileAdminDashboard /> : <MobileEmployeeDashboard />
          } />
          <Route path="/dashboard" element={
            isAdmin ? <MobileAdminDashboard /> : <MobileEmployeeDashboard />
          } />
          <Route path="/attendance" element={<MobileAttendance />} />
          <Route path="/analytics" element={<MobileAnalytics />} />
          <Route path="/employees" element={<MobileEmployeeDirectory />} />
          <Route path="/settings" element={<MobileSettings />} />
          <Route path="*" element={
            isAdmin ? <MobileAdminDashboard /> : <MobileEmployeeDashboard />
          } />
        </Routes>
      </React.Suspense>
    </div>
  );
}
