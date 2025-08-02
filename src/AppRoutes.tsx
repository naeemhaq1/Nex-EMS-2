
import React, { Suspense } from 'react';
import { Route, Switch, Redirect } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';

// Import components
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import EmployeeDirectory from '@/pages/EmployeeDirectory';
import AttendanceRecords from '@/pages/AttendanceRecords';
import UnifiedUserManagement from '@/pages/UnifiedUserManagement';
import SessionManagement from '@/pages/SessionManagement';
import RoleManagement from '@/pages/RoleManagement';
import Settings from '@/pages/Settings';

// Mobile components
import MobileRedirectHandler from '@/pages/mobile/MobileRedirectHandler';
import MobileAdminDashboard from '@/pages/mobile/MobileAdminDashboard';
import MobileEmployeeDashboard from '@/pages/mobile/MobileEmployeeDashboard';

const LoadingSpinner = () => (
  <div className="min-h-screen bg-[#1A1B3E] flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
  </div>
);

export default function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/" component={Login} />
        <Route>
          <Redirect to="/login" />
        </Route>
      </Switch>
    );
  }

  // Check if we're on mobile
  const isMobile = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Switch>
        {/* Mobile Routes */}
        <Route path="/mobile/admin/dashboard">
          {() => <MobileAdminDashboard />}
        </Route>
        <Route path="/mobile/employee/dashboard">
          {() => <MobileEmployeeDashboard />}
        </Route>
        <Route path="/mobile/admin">
          {() => <MobileAdminDashboard />}
        </Route>
        <Route path="/mobile">
          {() => {
            if (user.role === 'admin' || user.role === 'super_admin') {
              return <Redirect to="/mobile/admin/dashboard" />;
            } else {
              return <Redirect to="/mobile/employee/dashboard" />;
            }
          }}
        </Route>
        
        {/* Desktop Routes */}
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/employees" component={EmployeeDirectory} />
        <Route path="/attendance" component={AttendanceRecords} />
        <Route path="/unified-user-management" component={UnifiedUserManagement} />
        <Route path="/session-management" component={SessionManagement} />
        <Route path="/role-management" component={RoleManagement} />
        <Route path="/settings" component={Settings} />
        
        {/* Root route - redirect based on device and role */}
        <Route path="/">
          {() => {
            if (isMobile) {
              if (user.role === 'admin' || user.role === 'super_admin') {
                return <Redirect to="/mobile/admin/dashboard" />;
              } else {
                return <Redirect to="/mobile/employee/dashboard" />;
              }
            } else {
              return <Redirect to="/dashboard" />;
            }
          }}
        </Route>
        
        {/* Fallback */}
        <Route>
          {() => {
            if (isMobile) {
              return <Redirect to="/mobile" />;
            } else {
              return <Redirect to="/dashboard" />;
            }
          }}
        </Route>
      </Switch>
    </Suspense>
  );
}
