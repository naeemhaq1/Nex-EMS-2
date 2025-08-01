
import React from 'react';
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
}
