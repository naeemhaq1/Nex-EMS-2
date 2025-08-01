import { Switch, Route } from "wouter";
import MobileDashboard from "@/pages/mobile/MobileDashboard";
import MobileAnalytics from "@/pages/mobile/MobileAnalytics";
import MobileAttendance from "@/pages/mobile/MobileAttendance";
import MobileEmployeeDirectory from "@/pages/mobile/MobileEmployeeDirectory";
import MobileReports from "@/pages/mobile/MobileReports";
import MobileComprehensiveReport from "@/pages/mobile/MobileComprehensiveReport";
import MobileSettings from "@/pages/mobile/MobileSettings";
import MobileAIPredictions from "@/pages/mobile/MobileAIPredictions";
import MobileSchedule from "@/pages/mobile/MobileSchedule";
import MobileAttendanceManagement from "@/pages/mobile/MobileAttendanceManagement";
import MobileGroups from "@/pages/mobile/MobileGroups";
import MobileCheckAttend from "@/pages/mobile/MobileCheckAttend";
import NotFound from "@/pages/not-found";
import MobileServiceMonitoringNew from '../pages/mobile/MobileServiceMonitoringNew';
import ComprehensiveUserRoleManagement from '../pages/ComprehensiveUserRoleManagement';

export function MobileRouter() {
  return (
    <Switch>
      <Route path="/mobile" component={MobileDashboard} />
      <Route path="/mobile/analytics" component={MobileAnalytics} />
      <Route path="/mobile/employees" component={MobileEmployeeDirectory} />
      <Route path="/mobile/attendance" component={MobileAttendance} />
      <Route path="/mobile/attendance-management" component={MobileAttendanceManagement} />
      <Route path="/mobile/ai-predictions" component={MobileAIPredictions} />
      <Route path="/mobile/groups" component={MobileGroups} />

      <Route path="/mobile/shifts" component={MobileSchedule} />
      <Route path="/mobile/schedule" component={MobileSchedule} />
      <Route path="/mobile/reports" component={MobileReports} />
      <Route path="/mobile/comprehensive-report" component={MobileComprehensiveReport} />
      <Route path="/mobile/settings" component={MobileSettings} />
      <Route path="/mobile/devices" component={MobileSettings} />
      <Route path="/mobile/sync" component={MobileSettings} />
      <Route path="/mobile/odoo" component={MobileSettings} />
      <Route component={NotFound} />
    </Switch>
  );
}