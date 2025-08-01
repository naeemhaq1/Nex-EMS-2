
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
        <Route path="/" component={Login} />
        <Route>
          <Redirect to="/" />
        </Route>
      </Switch>
    );
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Switch>
        {/* Mobile Routes */}
        <Route path="/mobile" component={MobileRedirectHandler} />
        <Route path="/mobile/admin/dashboard" component={MobileAdminDashboard} />
        <Route path="/mobile/employee/dashboard" component={MobileEmployeeDashboard} />
        
        {/* Fallback mobile admin route */}
        <Route path="/mobile/admin" component={MobileAdminDashboard} />
        
        {/* Desktop Routes */}
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/employees" component={EmployeeDirectory} />
        <Route path="/attendance" component={AttendanceRecords} />
        <Route path="/unified-user-management" component={UnifiedUserManagement} />
        <Route path="/session-management" component={SessionManagement} />
        <Route path="/role-management" component={RoleManagement} />
        <Route path="/settings" component={Settings} />
        
        {/* Fallback */}
        <Route>
          <Redirect to="/dashboard" />
        </Route>
      </Switch>
    </Suspense>
  );
}
