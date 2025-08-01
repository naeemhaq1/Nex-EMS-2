import { Switch, Route } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useMobile } from '@/hooks/use-mobile';

// Import pages
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';

// Mobile components
import MobileRouter from '@/components/MobileRouter';
import MobileEmployeeDashboard from '@/pages/mobile/MobileEmployeeDashboard';
import MobileAdminDashboard from '@/pages/mobile/admin/MobileAdminDashboard';
import MobileAttendance from '@/pages/mobile/MobileAttendance';
import MobileSettings from '@/pages/mobile/MobileSettings';

// Loading component
import HorizontalSpinner from '@/components/ui/horizontal-spinner';

export default function AppRoutes() {
  const { user, loading } = useAuth();
  const isMobile = useMobile();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <HorizontalSpinner />
      </div>
    );
  }

  // If not authenticated, show login
  if (!user) {
    return <Login />;
  }

  // If mobile, use mobile router
  if (isMobile) {
    return <MobileRouter />;
  }

  // Desktop routes
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/mobile/employee" component={MobileEmployeeDashboard} />
      <Route path="/mobile/admin" component={MobileAdminDashboard} />
      <Route path="/mobile/attendance" component={MobileAttendance} />
      <Route path="/mobile/settings" component={MobileSettings} />
      <Route>
        <Dashboard />
      </Route>
    </Switch>
  );
}