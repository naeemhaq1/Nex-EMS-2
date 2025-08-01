
import { Switch, Route, useLocation } from "wouter";
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
  const [location, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="*">
          {() => {
            setLocation('/login');
            return null;
          }}
        </Route>
      </Switch>
    );
  }

  // Mobile routes
  if (isMobile) {
    if (user.role === 'admin' || user.role === 'superadmin') {
      return (
        <Switch>
          <Route path="/" component={MobileAdminDashboard} />
          <Route path="/dashboard" component={MobileAdminDashboard} />
          <Route path="/attendance" component={MobileAttendance} />
          <Route path="/settings" component={MobileSettings} />
          <Route path="*">
            {() => {
              setLocation('/');
              return null;
            }}
          </Route>
        </Switch>
      );
    } else {
      return (
        <Switch>
          <Route path="/" component={MobileEmployeeDashboard} />
          <Route path="/dashboard" component={MobileEmployeeDashboard} />
          <Route path="/attendance" component={MobileAttendance} />
          <Route path="/settings" component={MobileSettings} />
          <Route path="*">
            {() => {
              setLocation('/');
              return null;
            }}
          </Route>
        </Switch>
      );
    }
  }

  // Desktop routes
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="*">
        {() => {
          setLocation('/');
          return null;
        }}
      </Route>
    </Switch>
  );
}
