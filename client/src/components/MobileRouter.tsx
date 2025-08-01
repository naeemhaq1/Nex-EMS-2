import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// Import mobile pages with error boundaries
const MobileEmployeeDashboard = React.lazy(() => import('@/pages/mobile/MobileEmployeeDashboard'));
const MobileAdminDashboard = React.lazy(() => import('@/pages/mobile/MobileAdminDashboard'));
const MobileAttendance = React.lazy(() => import('@/pages/mobile/MobileAttendance'));
const MobileSettings = React.lazy(() => import('@/pages/mobile/MobileSettings'));

export default function MobileRouter() {
  const { user } = useAuth();

  return (
    <React.Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <Routes>
        <Route path="/" element={
          user?.role === 'admin' ? <MobileAdminDashboard /> : <MobileEmployeeDashboard />
        } />
        <Route path="/attendance" element={<MobileAttendance />} />
        <Route path="/settings" element={<MobileSettings />} />
        <Route path="*" element={
          user?.role === 'admin' ? <MobileAdminDashboard /> : <MobileEmployeeDashboard />
        } />
      </Routes>
    </React.Suspense>
  );
}