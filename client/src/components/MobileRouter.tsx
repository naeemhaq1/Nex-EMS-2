
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
import MobileAdminAnalytics from "@/pages/mobile/MobileAdminAnalytics";
import MobileAdminAnnouncements from "@/pages/mobile/admin/MobileAdminAnnouncements";
import MobileAdminBugs from "@/pages/mobile/admin/MobileAdminBugs";
import MobileAdminAttendance from "@/pages/mobile/admin/MobileAdminAttendance";
import MobileAdminAttendanceTracker from "@/pages/mobile/admin/MobileAdminAttendanceTracker";
import MobileAdminCommunicate from "@/pages/mobile/MobileAdminCommunicate";
import MobileAdminMaps from "@/pages/mobile/MobileAdminMaps";
import MobileDeviceManagement from "@/pages/mobile/admin/MobileDeviceManagement";
import MobilePunchManagement from "@/pages/mobile/admin/MobilePunchManagement";
import MobileUserManagement from "@/pages/mobile/admin/MobileUserManagement";
import MobileAdminPolling from "@/pages/mobile/admin/MobileAdminPolling";
import MobileAdminSettings from "@/pages/mobile/admin/MobileAdminSettings";

export default function MobileRouter() {
  const { user } = useAuth();
  const [location] = useLocation();
  const isAdmin = user && ['admin', 'superadmin', 'general_admin', 'manager'].includes(user.role);
  
  // Get base path
  const basePath = '/mobile';

  return (
    <Switch>
      {/* Admin Routes */}
      {isAdmin && (
        <>
          <Route path={`${basePath}/admin`}>
            <MobileAdminDashboard />
          </Route>
          <Route path={`${basePath}/admin/dashboard`}>
            <MobileAdminDashboard />
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
        </>
      )}

      {/* Employee Routes */}
      <Route path={`${basePath}/employee`}>
        {isAdmin ? <MobileEmployeeDashboardWithAdmin /> : <MobileEmployeeDashboard />}
      </Route>
      <Route path={`${basePath}/employee/dashboard`}>
        {isAdmin ? <MobileEmployeeDashboardWithAdmin /> : <MobileEmployeeDashboard />}
      </Route>
      <Route path={`${basePath}/employee/attendance`}>
        <MobileAttendance />
      </Route>
      <Route path={`${basePath}/employee/analytics`}>
        <MobileEmployeeAnalytics />
      </Route>
      <Route path={`${basePath}/employee/settings`}>
        <MobileEmployeeSettings />
      </Route>
      <Route path={`${basePath}/employee/punch-out-request`}>
        <MobilePunchOutRequest />
      </Route>
      <Route path={`${basePath}/employee/leaderboard`}>
        <MobileEmployeeLeaderboard />
      </Route>
      <Route path={`${basePath}/employee/leaderboard-coming-soon`}>
        <MobileEmployeeLeaderboardComingSoon />
      </Route>
      <Route path={`${basePath}/employee/directory`}>
        <MobileEmployeeDirectory />
      </Route>
      <Route path={`${basePath}/employee/profile/:id`}>
        {params => <MobileEmployeeProfile employeeId={params.id} />}
      </Route>
      <Route path={`${basePath}/employee/my-profile`}>
        <MobileMyProfile />
      </Route>
      <Route path={`${basePath}/employee/data-availability`}>
        <MobileDataAvailability />
      </Route>
      <Route path={`${basePath}/employee/punch`}>
        <MobilePunchPage />
      </Route>
      <Route path={`${basePath}/employee/enhanced-punch`}>
        <MobileEnhancedPunchInterface />
      </Route>
      <Route path={`${basePath}/employee/schedule`}>
        <MobileSchedule />
      </Route>
      <Route path={`${basePath}/employee/offline-punch`}>
        <MobileOfflinePunch />
      </Route>
      <Route path={`${basePath}/employee/sync-status`}>
        <MobileSyncStatus />
      </Route>
      <Route path={`${basePath}/employee/devices`}>
        <MobileDevicesManagement />
      </Route>
      <Route path={`${basePath}/employee/requests`}>
        <MobileRequests />
      </Route>
      <Route path={`${basePath}/employee/announcements`}>
        <MobileAnnouncementSettings />
      </Route>

      {/* Shared Routes */}
      <Route path={`${basePath}/analytics`}>
        <MobileAnalytics />
      </Route>
      <Route path={`${basePath}/settings`}>
        <MobileSettings />
      </Route>
      <Route path={`${basePath}/loading-demo`}>
        <LoadingDemo />
      </Route>

      {/* Fallback route for /mobile - redirect to appropriate dashboard */}
      <Route path={`${basePath}`}>
        <MobileRedirectHandler />
      </Route>

      {/* Default fallback for any mobile route */}
      <Route path="/mobile/*">
        <MobileRedirectHandler />
      </Route>
    </Switch>
  );
}
