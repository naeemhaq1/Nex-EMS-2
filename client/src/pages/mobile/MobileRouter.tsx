import { Route, Switch, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import MobileEmployeeDashboard from "@/pages/mobile/MobileEmployeeDashboard";
import MobileEmployeeDashboardWithAdmin from "@/pages/mobile/MobileEmployeeDashboardWithAdmin";
import MobileAdminDashboard from "@/pages/mobile/admin/MobileAdminDashboard";
import MobilePortManagement from "@/pages/mobile/admin/MobilePortManagement";
import MobileRedirectHandler from "@/pages/mobile/MobileRedirectHandler";

import MobileAttendance from "@/pages/mobile/MobileAttendance";
import MobileAnalytics from "@/pages/mobile/MobileAnalytics";
import MobileEmployeeAnalytics from "@/pages/mobile/MobileEmployeeAnalytics";
import MobileSettings from "@/pages/mobile/MobileSettings";
import MobileEmployeeSettings from "@/pages/mobile/MobileEmployeeSettings";
import MobilePunchOutRequest from "@/pages/mobile/MobilePunchOutRequest";
import MobileEmployeeLeaderboard from "@/pages/mobile/MobileEmployeeLeaderboard";
import MobileEmployeeLeaderboardComingSoon from "@/pages/mobile/MobileEmployeeLeaderboardComingSoon";
import MobileEmployeeDirectory from "@/pages/mobile/MobileEmployeeDirectory";
import MobileEmployeeProfile from "@/pages/mobile/MobileEmployeeProfile";
import MobileMyProfile from "@/pages/mobile/MobileMyProfile";
import MobileDataAvailability from "@/pages/mobile/MobileDataAvailability";
import MobilePunchPage from "@/pages/mobile/MobilePunchPage";
import MobileEnhancedPunchInterface from "@/pages/mobile/MobileEnhancedPunchInterface";
import MobileSchedule from "@/pages/mobile/MobileSchedule";
import LoadingDemo from "@/pages/mobile/LoadingDemo";
import MobileOfflinePunch from "@/pages/mobile/MobileOfflinePunch";
import MobileSyncStatus from "@/pages/mobile/MobileSyncStatus";
import MobileDevicesManagement from "@/pages/mobile/MobileDevicesManagement";
import MobileRequests from "@/pages/mobile/MobileRequests";
import MobileAnnouncementSettings from "@/pages/mobile/MobileAnnouncementSettings";
import MobileMap from "@/pages/mobile/MobileMap";

// Admin feature imports
import MobileAdminEmployees from "@/pages/mobile/MobileAdminEmployees";
import MobileAdminServiceMonitoring from "@/pages/mobile/MobileAdminServiceMonitoring";
import MobileAdminAnalytics from "@/pages/mobile/MobileAdminAnalytics";
import MobileAdminDataContinuity from "@/pages/mobile/MobileAdminDataContinuity";
import MobileAdminBugs from "@/pages/mobile/MobileAdminBugs";
import MobileAdminMap from "@/pages/mobile/MobileAdminMap";
import MobileAdminMaps from "@/pages/mobile/MobileAdminMaps";
import MobileAdminSystem from "@/pages/mobile/MobileAdminSystem";
import MobileAdminCommunicate from "@/pages/mobile/MobileAdminCommunicate";
import MobileAdminAnnouncements from "@/pages/mobile/MobileAdminAnnouncements";
import MobileDeviceManagement from "@/pages/mobile/admin/MobileDeviceManagement";
import MobilePunchManagement from "@/pages/mobile/admin/MobilePunchManagement";
import MobileUserManagement from "@/pages/mobile/admin/MobileUserManagement";
import MobileAdminAttendance from "@/pages/mobile/admin/MobileAdminAttendance";
import MobileAdminAttendanceTracker from "@/pages/mobile/admin/MobileAdminAttendanceTracker";
import MobileAdminPolling from "@/pages/mobile/admin/MobileAdminPolling";

import MobileAdminSettings from "@/pages/mobile/admin/MobileAdminSettings";
import MobileServiceMonitoringNew from "./MobileServiceMonitoringNew";
// WhatsApp interfaces consolidated to stunning version only
import MobileWhatsAppStunningConsole from "@/pages/mobile/MobileWhatsAppStunningConsole";

export default function MobileRouter() {
  const basePath = '/mobile';
  const { user, loading } = useAuth();
  const [location] = useLocation();

  // Show loading state while authentication is being determined
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A1B3E] to-[#2A2B5E] flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-2xl animate-pulse mb-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
          <h2 className="text-xl font-semibold mb-2 animate-fade-in">Loading Mobile Portal</h2>
          <p className="text-gray-300 text-sm animate-slide-up">Preparing your dashboard...</p>
          <div className="flex justify-center mt-4">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#1A1B3E] flex items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-gray-300">Please log in to access the mobile portal.</p>
        </div>
      </div>
    );
  }

  // Check if user is admin/manager
  const isAdmin = user.role === 'admin' || user.role === 'superadmin' || user.role === 'general_admin' || user.role === 'manager';

  return (
    <div className="h-screen bg-[#1A1B3E] flex flex-col">
      <div className="flex-1 overflow-hidden">
        <Switch>
        {/* Role-based Dashboard Routes */}
        <Route path={`${basePath}/dashboard`}>
          {isAdmin ? <MobileAdminDashboard /> : <MobileEmployeeDashboard />}
        </Route>
        <Route path={`${basePath}/admin/dashboard`}>
          {isAdmin ? <MobileAdminDashboard /> : <MobileEmployeeDashboard />}
        </Route>
        <Route path={`${basePath}/employee/dashboard`}>
          <MobileEmployeeDashboard />
        </Route>
        <Route path={`${basePath}/manager/dashboard`}>
          <MobileEmployeeDashboard />
        </Route>
        <Route path={`${basePath}/my-dashboard`}>
          <MobileEmployeeDashboard />
        </Route>
        
        {/* Employee specific routes */}
        <Route path={`${basePath}/employee/:id`}>
          <MobileEmployeeProfile />
        </Route>
        <Route path={`${basePath}/employees`}>
          <MobileEmployeeDirectory />
        </Route>
        <Route path={`${basePath}/my-profile`}>
          <MobileMyProfile />
        </Route>
        <Route path={`${basePath}/employee/profile`}>
          <MobileMyProfile />
        </Route>
        <Route path={`${basePath}/attendance`}>
          <MobileAttendance />
        </Route>
        <Route path={`${basePath}/analytics`}>
          <MobileEmployeeAnalytics />
        </Route>
        <Route path={`${basePath}/settings`}>
          {user.role === "admin" ? <MobileSettings /> : <MobileEmployeeSettings />}
        </Route>
        <Route path={`${basePath}/announcement-settings`}>
          <MobileAnnouncementSettings />
        </Route>
        <Route path={`${basePath}/data-availability`}>
          <MobileDataAvailability />
        </Route>
        <Route path={`${basePath}/devices-management`}>
          <MobileDevicesManagement />
        </Route>
        <Route path={`${basePath}/punch-out-request`}>
          {user.role === "employee" ? <MobilePunchOutRequest /> : <MobileSettings />}
        </Route>
        <Route path={`${basePath}/punch`}>
          <MobileEnhancedPunchInterface />
        </Route>
        <Route path={`${basePath}/leaderboard`}>
          <MobileEmployeeLeaderboardComingSoon />
        </Route>
        <Route path={`${basePath}/schedule`}>
          <MobileSchedule />
        </Route>
        <Route path={`${basePath}/requests`}>
          <MobileRequests />
        </Route>
        <Route path={`${basePath}/punch`}>
          <MobilePunchPage />
        </Route>
        <Route path={`${basePath}/offline-punch`}>
          <MobileOfflinePunch />
        </Route>
        <Route path={`${basePath}/sync-status`}>
          <MobileSyncStatus />
        </Route>

        <Route path={`${basePath}/whatsapp`}>
          <MobileWhatsAppStunningConsole />
        </Route>
        <Route path={`${basePath}/whatsapp-interface`}>
          <MobileWhatsAppStunningConsole />
        </Route>
        <Route path={`${basePath}/whatsapp-console`}>
          <MobileWhatsAppStunningConsole />
        </Route>
        <Route path={`${basePath}/admin/whatsapp-manager`}>
          <MobileWhatsAppStunningConsole />
        </Route>

        <Route path={`${basePath}/map`}>
          <MobileMap />
        </Route>
        <Route path={`${basePath}/loading-demo`}>
          <LoadingDemo />
        </Route>
        
        {/* Admin Feature Routes */}
        <Route path={`${basePath}/admin/employees`}>
          <MobileAdminEmployees />
        </Route>
        <Route path={`${basePath}/admin/service-monitoring`}>
          <MobileServiceMonitoringNew />
        </Route>
        <Route path={`${basePath}/admin/service-monitoring-new`}>
          <MobileServiceMonitoringNew />
        </Route>
        <Route path={`${basePath}/admin/analytics`}>
          <MobileAdminAnalytics />
        </Route>
        <Route path={`${basePath}/admin/data-continuity`}>
          <MobileAdminDataContinuity />
        </Route>
        <Route path={`${basePath}/admin/announcements`}>
          <MobileAdminAnnouncements />
        </Route>
        <Route path={`${basePath}/admin/bugs`}>
          <MobileAdminBugs />
        </Route>
        <Route path={`${basePath}/admin/map`}>
          <MobileAdminMap />
        </Route>
        <Route path={`${basePath}/admin/system`}>
          <MobileAdminSystem />
        </Route>

        <Route path={`${basePath}/admin/announcements`}>
          <MobileAdminAnnouncements />
        </Route>
        <Route path={`${basePath}/admin/bugs`}>
          <MobileAdminBugs />
        </Route>
        <Route path={`${basePath}/admin/attendance`}>
          <MobileAdminAttendance />
        </Route>
        <Route path={`${basePath}/admin/attendance-tracker`}>
          <MobileAdminAttendanceTracker />
        </Route>
        <Route path={`${basePath}/admin/communicate`}>
          <MobileAdminCommunicate />
        </Route>
        <Route path={`${basePath}/admin/maps`}>
          <MobileAdminMaps />
        </Route>
        <Route path={`${basePath}/admin/device-management`}>
          <MobileDeviceManagement />
        </Route>
        <Route path={`${basePath}/admin/punch-management`}>
          <MobilePunchManagement />
        </Route>
        <Route path={`${basePath}/admin/user-management`}>
          <MobileUserManagement />
        </Route>
        <Route path={`${basePath}/admin/polling`}>
          <MobileAdminPolling />
        </Route>
        <Route path={`${basePath}/admin/settings`}>
          <MobileAdminSettings />
        </Route>
        <Route path={`${basePath}/admin/port-management`}>
          <MobilePortManagement />
        </Route>
        <Route path={`${basePath}/admin/analytics`}>
          <MobileAdminAnalytics />
        </Route>
        
        {/* Fallback route for /mobile - redirect to appropriate dashboard */}
        <Route path={`${basePath}`}>
          <MobileRedirectHandler />
        </Route>

        {/* Catch-all route for any unmatched mobile paths */}
        <Route>
          <MobileRedirectHandler />
        </Route>

        </Switch>
      </div>
    </div>
  );
}