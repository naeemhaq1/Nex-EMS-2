
import { Switch, Route } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import MobileAdminDashboard from "@/pages/mobile/MobileAdminDashboard";
import MobileEmployeeDashboard from "@/pages/mobile/MobileEmployeeDashboard";
import MobileAnalytics from "@/pages/mobile/MobileAnalytics";
import MobileAttendance from "@/pages/mobile/MobileAttendance";
import MobileEmployeeDirectory from "@/pages/mobile/MobileEmployeeDirectory";
import MobileReports from "@/pages/mobile/MobileReports";
import MobileComprehensiveReport from "@/pages/mobile/MobileComprehensiveReport";
import MobileSettings from "@/pages/mobile/MobileSettings";
import MobileAIPredictions from "@/pages/mobile/MobileAIPredictions";
import MobileSchedule from "@/pages/mobile/MobileSchedule";
import MobileGroups from "@/pages/mobile/MobileGroups";
import MobileCheckAttend from "@/pages/mobile/MobileCheckAttend";
import NotFound from "@/pages/not-found";

export function MobileRouter() {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin || user?.role === 'admin' || user?.role === 'super_admin';

  return (
    <Switch>
      {/* Admin Routes */}
      {isAdmin && (
        <>
          <Route path="/mobile/admin/dashboard" component={MobileAdminDashboard} />
          <Route path="/mobile/admin/analytics" component={MobileAnalytics} />
          <Route path="/mobile/admin/employees" component={MobileEmployeeDirectory} />
          <Route path="/mobile/admin/attendance" component={MobileAttendance} />
          <Route path="/mobile/admin/reports" component={MobileReports} />
          <Route path="/mobile/admin/settings" component={MobileSettings} />
          <Route path="/mobile/admin/system" component={MobileSettings} />
          <Route path="/mobile/admin/alerts" component={MobileSettings} />
          <Route path="/mobile/admin/devices" component={MobileSettings} />
          <Route path="/mobile/admin/map" component={MobileSettings} />
        </>
      )}
      
      {/* Employee Routes */}
      <Route path="/mobile/employee/dashboard" component={MobileEmployeeDashboard} />
      <Route path="/mobile/dashboard" component={MobileEmployeeDashboard} />
      <Route path="/mobile/analytics" component={MobileAnalytics} />
      <Route path="/mobile/employees" component={MobileEmployeeDirectory} />
      <Route path="/mobile/attendance" component={MobileAttendance} />
      <Route path="/mobile/ai-predictions" component={MobileAIPredictions} />
      <Route path="/mobile/groups" component={MobileGroups} />
      <Route path="/mobile/shifts" component={MobileSchedule} />
      <Route path="/mobile/schedule" component={MobileSchedule} />
      <Route path="/mobile/reports" component={MobileReports} />
      <Route path="/mobile/comprehensive-report" component={MobileComprehensiveReport} />
      <Route path="/mobile/settings" component={MobileSettings} />
      <Route path="/mobile/devices" component={MobileSettings} />
      <Route path="/mobile/sync" component={MobileSettings} />
      <Route path="/mobile/check-attend" component={MobileCheckAttend} />
      
      {/* Default Route */}
      <Route path="/mobile">
        {isAdmin ? <MobileAdminDashboard /> : <MobileEmployeeDashboard />}
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}
