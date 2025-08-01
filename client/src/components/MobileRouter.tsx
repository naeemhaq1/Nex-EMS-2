import React from 'react';
import { Route, Switch, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import MobileEmployeeDashboard from "@/pages/mobile/MobileEmployeeDashboard";
import MobileEmployeeDashboardWithAdmin from "@/pages/mobile/MobileEmployeeDashboardWithAdmin";
import MobileAdminDashboard from "@/pages/mobile/admin/MobileAdminDashboard";
import MobileAttendance from "@/pages/mobile/MobileAttendance";
import MobileEmployeeAnalytics from "@/pages/mobile/MobileEmployeeAnalytics";
import MobileEmployeeSettings from "@/pages/mobile/MobileEmployeeSettings";
import MobilePunchOutRequest from "@/pages/mobile/MobilePunchOutRequest";
import MobileEmployeeLeaderboard from "@/pages/mobile/MobileEmployeeLeaderboard";
import MobileEmployeeLeaderboardComingSoon from "@/pages/mobile/MobileEmployeeLeaderboardComingSoon";
import MobileEmployeeDirectory from "@/pages/mobile/MobileEmployeeDirectory";
import MobileEmployeeProfile from "@/pages/mobile/MobileEmployeeProfile";
import MobileMyProfile from "@/pages/mobile/MobileMyProfile";
import MobileDataAvailability from "@/pages/mobile/MobileDataAvailability";
import MobilePunchPage from "@/pages/mobile/MobilePunchPage";
import MobileRedirectHandler from "@/pages/mobile/MobileRedirectHandler";

const MobileRouter: React.FC = () => {
  const { user } = useAuth();
  const [location] = useLocation();

  const basePath = '/mobile';
  const isAdmin = ['admin', 'superadmin', 'general_admin', 'manager'].includes(user?.role || '');

  return (
    <div className="h-screen bg-[#1A1B3E] flex flex-col">
      <div className="flex-1 overflow-hidden">
        <Switch>
          {/* Default Routes */}
          <Route path="/">
            {isAdmin ? <MobileAdminDashboard /> : <MobileEmployeeDashboard />}
          </Route>
          <Route path="/mobile">
            {isAdmin ? <MobileAdminDashboard /> : <MobileEmployeeDashboard />}
          </Route>

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
            <MobileEmployeeSettings />
          </Route>

          {/* Admin Routes */}
          <Route path={`${basePath}/admin`}>
            <MobileAdminDashboard />
          </Route>

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

          {/* Redirect Handler */}
          <Route path={`${basePath}/:rest*`}>
            <MobileRedirectHandler />
          </Route>
        </Switch>
      </div>
    </div>
  );
};

export default MobileRouter;