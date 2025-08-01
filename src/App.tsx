import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Layout } from "@/components/Layout";
import { useEffect } from "react";
import { shouldRedirectToMobile, shouldRedirectToDesktop } from "@/utils/deviceDetection";
import { registerServiceWorker } from "@/utils/serviceWorker";

// Global error handler to prevent runtime error plugin from persisting AbortErrors
window.addEventListener('error', (event) => {
  if (event.error?.name === 'AbortError') {
    event.preventDefault();
    console.log('AbortError caught and suppressed globally');
    return false;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.name === 'AbortError') {
    event.preventDefault();
    console.log('Unhandled AbortError promise rejection caught and suppressed');
    return false;
  }
});

import Dashboard from "@/pages/Dashboard";
import EmployeeDirectory from "@/pages/NewEmployeeDirectory";
import EmployeeProfile from "@/pages/NewEmployeeProfile";
import AttendanceRecords from "@/pages/AttendanceRecords";
import EmployeePortal from "@/pages/EmployeePortal";

import DevicesManagement from "@/pages/DevicesManagement";
import ShiftManagement from "@/pages/ShiftManagement";
import AdvancedShiftManagement from "@/pages/AdvancedShiftManagement";


import AdminAnalytics from "@/pages/AdminAnalytics";
import Settings from "@/pages/Settings";
import ServiceHealthDashboard from "@/pages/ServiceHealthDashboard";
import NotificationManagement from "@/pages/NotificationManagement";
import ShellTerminal from "@/pages/ShellTerminal";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";
import DepartmentGroups from "@/pages/DepartmentGroups";
import DepartmentFieldManagement from "@/pages/admin/DepartmentFieldManagement";
import CheckAttend from "@/pages/CheckAttend";

import DataInterface from "@/pages/DataInterface";
import PresentToday from "@/pages/PresentToday";
// Desktop Data Continuity import
import DataContinuity from "@/pages/desktop/DataContinuity";

import BiometricExemptions from "@/pages/BiometricExemptions";
import DailyMetrics from "@/pages/DailyMetrics";

import ScoringSystem from "@/pages/ScoringSystem";
import WhatsAppStunningConsole from "@/pages/WhatsAppStunningConsole";
import RoleManagement from "@/pages/RoleManagement";
import ComprehensiveUserManagement from "@/components/ComprehensiveUserManagement";
import SessionManagement from "@/pages/SessionManagement";
import ManagerAssignment from "@/pages/ManagerAssignment";
import UnifiedUserManagement from './pages/UnifiedUserManagement';


import PollingInterface from "@/pages/PollingInterface";
import ImportExportTest from "@/pages/ImportExportTest";
// WhatsApp interfaces consolidated to stunning versions only
import { ThreeTierServiceMonitor } from "@/pages/mobile/ThreeTierServiceMonitor";

// Mobile imports
import MobileRouter from "@/pages/mobile/MobileRouter";
import MobileStyleDashboard from "@/components/MobileStyleDashboard";
import LoadingDemo from "@/pages/mobile/LoadingDemo";
import DesktopEmployeeDashboard from "@/pages/DesktopEmployeeDashboard";
import DesktopAdminDashboard from "@/pages/DesktopAdminDashboard";
import MobileAdminAttendanceTracker from "@/pages/mobile/admin/MobileAdminAttendanceTracker";
import DesktopAdminAttendanceTracker from "@/pages/desktop/admin/DesktopAdminAttendanceTracker";
import MobileUserManagement from "@/pages/mobile/admin/MobileUserManagement";

// Desktop Admin imports
import NewAdminDesktopDashboard from "@/pages/NewAdminDesktopDashboard";
import DesktopAdminAnnouncements from "@/pages/DesktopAdminAnnouncements";
import TrackTrace from "@/pages/TrackTrace";
import GoogleMapsVerification from "@/pages/GoogleMapsVerification";
import MonthlyReport from "@/pages/MonthlyReport";
import MonthlyReportTable from "@/pages/MonthlyReportTable";

function AppRoutes() {
  const { user, loading } = useAuth();
  const [location, setLocation] = useLocation();

  // Enhanced mobile device detection and redirect
  useEffect(() => {
    const checkForMobileRedirect = () => {
      if (!user || loading) return false;

      // Force mobile redirect for common mobile user agents
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobileUA = /Android|iPhone|iPad|iPod|BlackBerry|Windows Phone|Mobile|Tablet|Opera Mini|IEMobile/i.test(userAgent);
      const isMobileWidth = window.innerWidth <= 768;
      const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      const hasOrientation = typeof window.orientation !== 'undefined';

      // Be more aggressive with mobile detection
      const isMobile = isMobileUA || isMobileWidth || (isTouchDevice && hasOrientation);

      // TEMPORARILY DISABLED - Force redirect if mobile detected and not already on mobile route
      // if (isMobile && !location.startsWith('/mobile')) {
      //   console.log('Mobile device detected, forcing redirect to mobile interface');
      //   if (user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'general_admin') {
      //     setLocation('/mobile/admin/dashboard');
      //   } else {
      //     setLocation('/mobile/employee/dashboard');
      //   }
      //   return true;
      // }
      return false;
    };

    // Check for mobile redirect
    checkForMobileRedirect();
  }, [user, loading, location, setLocation]);

  // Handle standard routing logic
  useEffect(() => {
    if (user && !loading) {
      // TEMPORARILY DISABLED - Check if we should redirect to mobile for all users
      // if (shouldRedirectToMobile() && !location.startsWith('/mobile') && !location.startsWith('/desktop')) {
      //   // Redirect based on user role
      //   if (user.role === 'staff') {
      //     setLocation('/mobile/employee/dashboard');
      //   } else if (user.role === 'admin' || user.role === 'superadmin' || user.role === 'general_admin') {
      //     setLocation('/mobile/admin/dashboard');
      //   } else {
      //     setLocation('/mobile/employee/dashboard');
      //   }
      //   return;
      // }

      // Root path logic with optimized role-based redirects and session persistence
      if (location === '/' && user) {
        console.log('User role:', user.role, 'Current location:', location);

        // Enhanced role-based routing with better session handling
        if (user.role === 'admin' || user.role === 'superadmin' || user.role === 'general_admin') {
          console.log('Admin detected, checking device type...');

          // Mobile admin detection with consistent session handling
          const isMobile = window.innerWidth <= 768 || 
                          /Android|iPhone|iPad|iPod|BlackBerry|Windows Phone|Mobile|Tablet/i.test(navigator.userAgent);

          if (isMobile) {
            console.log('Redirecting admin to mobile dashboard');
            setLocation('/mobile/admin/dashboard');
          } else {
            console.log('Redirecting admin to desktop dashboard');
            setLocation('/dashboard');
          }
        } else {
          // Regular employee logic with session persistence
          const isMobile = window.innerWidth <= 768 || 
                          /Android|iPhone|iPad|iPod|BlackBerry|Windows Phone|Mobile|Tablet/i.test(navigator.userAgent);

          if (isMobile) {
            console.log('Redirecting employee to mobile dashboard');
            setLocation('/mobile/employee/dashboard');
          } else {
            console.log('Redirecting employee to desktop dashboard');
            setLocation('/employee-dashboard');
          }
        }
        return;
      }
    }
  }, [user, loading, location, setLocation]);

  // Show loading screen while authentication state is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1A1B3E] to-[#2A2B5E]">
        <div className="text-white text-center">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-2xl animate-pulse mb-8">
            <div className="text-white animate-bounce">
              <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" />
                <path d="M2 17L12 22L22 17" />
                <path d="M2 12L12 17L22 12" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-semibold mb-3 animate-fade-in">Nexlinx Smart EMS</h2>
          <p className="text-gray-300 animate-slide-up" style={{ animationDelay: '200ms' }}>Loading your experience...</p>
          <div className="flex justify-center mt-6">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show login if not authenticated or on login route
  if (!user || location === '/login') {
    return <Login />;
  }

  // Handle mobile routes first to prevent flashing
  const isMobileRoute = location.startsWith('/mobile');
  if (isMobileRoute) {
    return <MobileRouter />;
  }

  // Allow both mobile and desktop interfaces based on user choice

  // Handle desktop force route
  if (location === '/desktop' && user?.role === 'staff') {
    setLocation('/desktop/employee/dashboard');
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1A1B3E]">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4 mx-auto"></div>
          <p className="text-lg">Redirecting to desktop...</p>
        </div>
      </div>
    );
  }

  // Admin and SuperAdmin users get the full admin interface  
  if (user.role === "admin" || user.role === "superadmin" || user.role === "general_admin") {
    return (
      <Layout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/desktop/admin/dashboard" component={NewAdminDesktopDashboard} />
        <Route path="/desktop/admin/old-admin" component={DesktopAdminDashboard} />
          <Route path="/desktop/admin/announcements" component={DesktopAdminAnnouncements} />
          <Route path="/desktop/admin/attendance-tracker" component={DesktopAdminAttendanceTracker} />
          <Route path="/desktop/employee/dashboard" component={DesktopEmployeeDashboard} />
          <Route path="/my-dashboard" component={EmployeePortal} />
          <Route path="/employees" component={EmployeeDirectory} />
          <Route path="/employee/:id" component={EmployeeProfile} />
          <Route path="/attendance" component={AttendanceRecords} />
          <Route path="/track-trace" component={TrackTrace} />
          <Route path="/reports" component={AdminAnalytics} />
          <Route path="/analytics" component={DailyMetrics} />
          <Route path="/admin-analytics" component={AdminAnalytics} />
          <Route path="/unified-analytics" component={AdminAnalytics} />
          <Route path="/attendance-metrics" component={AdminAnalytics} />
          <Route path="/monthly-report" component={MonthlyReport} />
          <Route path="/monthly-report-table" component={MonthlyReportTable} />
          <Route path="/scoring-system" component={ScoringSystem} />
          <Route path="/devices-management" component={DevicesManagement} />
          <Route path="/groups" component={DepartmentGroups} />
          <Route path="/shifts" component={ShiftManagement} />
          <Route path="/advanced-shifts" component={AdvancedShiftManagement} />
          <Route path="/shift-management" component={AdvancedShiftManagement} />
          <Route path="/comprehensive-report" component={AdminAnalytics} />
          <Route path="/checkattend" component={CheckAttend} />
          <Route path="/performance-overview" component={AdminAnalytics} />
          <Route path="/data-interface" component={DataInterface} />
          <Route path="/data-continuity" component={DataContinuity} />
          <Route path="/present-today" component={PresentToday} />
          <Route path="/exclusions" component={BiometricExemptions} />
          <Route path="/biometric-exemptions" component={BiometricExemptions} />
          <Route path="/whatsapp-console" component={WhatsAppStunningConsole} />
          <Route path="/whatsapp-stunning" component={WhatsAppStunningConsole} />
          <Route path="/role-management" component={RoleManagement} />
          <Route path="/user-management" component={ComprehensiveUserManagement} />
          <Route path="/session-management" component={SessionManagement} />
          <Route path="/manager-assignment" component={ManagerAssignment} />

          <Route path="/department-field-management" component={DepartmentFieldManagement} />

          <Route path="/service-health" component={ServiceHealthDashboard} />
          <Route path="/three-tier-monitor" component={ThreeTierServiceMonitor} />
          <Route path="/polling-interface" component={PollingInterface} />
          <Route path="/import-export-test" component={ImportExportTest} />
          {/* All old WhatsApp interfaces consolidated to stunning version */}
          <Route path="/notification-management" component={NotificationManagement} />
          <Route path="/shell" component={ShellTerminal} />
          <Route path="/settings" component={Settings} />
          <Route path="/google-maps-test" component={GoogleMapsVerification} />
          <Route path="/unified-user-management" component={UnifiedUserManagement} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    );
  }

  // All other users (employee, staff, manager, etc.) get the employee dashboard
  return (
    <Layout>
      <Switch>
        <Route path="/" component={DesktopEmployeeDashboard} />
        <Route path="/dashboard" component={DesktopEmployeeDashboard} />
        <Route path="/desktop/employee/dashboard" component={DesktopEmployeeDashboard} />
        <Route path="/attendance" component={AttendanceRecords} />
        <Route path="/employees" component={EmployeeDirectory} />
        <Route path="/employee/:id" component={EmployeeProfile} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  // Register service worker for offline functionality
  useEffect(() => {
    registerServiceWorker().then(registration => {
      if (registration) {
        console.log('Offline caching enabled');
      }
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider defaultTheme="dark">
          <TooltipProvider>
            <div className="dark">
              <AppRoutes />
              <Toaster />
            </div>
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;