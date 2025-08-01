import { Router } from "express";
import { 
  getDashboardMetrics,
  getAttendanceChartData,
  get90DayAttendanceData,
  getDepartmentSummary,
  getAttendanceTrends,
  get30DayTrends,
  getMonthlyTrends,
  getHourlyActivity,
  getIncompleteAttendance,
  getLateComers,
  getPresentToday,
  terminateAttendance,
  getYesterdayAttendance,
  getTodayLiveActivity,
  getDrillDownData,
  getDataAvailabilityHeatmap,
  getNonBioEmployees,
  getCalculatedNonBioEmployees
} from "./analytics";

const router = Router();

// Dashboard metrics
router.get('/dashboard-metrics', getDashboardMetrics);
router.get('/attendance-chart-data', getAttendanceChartData);
router.get('/90-day-attendance', get90DayAttendanceData);
router.get('/department-summary', getDepartmentSummary);
router.get('/attendance-trends', getAttendanceTrends);
router.get('/30-day-trends', get30DayTrends);
router.get('/monthly-trends', getMonthlyTrends);
router.get('/hourly-activity', getHourlyActivity);

// Today's data
router.get('/incomplete-attendance', getIncompleteAttendance);
router.get('/late-comers', getLateComers);
router.get('/present-today', getPresentToday);
router.get('/today-live-activity', getTodayLiveActivity);

// Yesterday's data
router.get('/yesterday-attendance', getYesterdayAttendance);

// Non-bio employees
router.get('/non-bio-employees', getNonBioEmployees);
router.get('/calculated-non-bio-employees', getCalculatedNonBioEmployees);

// Drill down data
router.get('/drill-down/:metric', getDrillDownData);

// Data availability
router.get('/data-availability-heatmap', getDataAvailabilityHeatmap);

// Actions
router.post('/terminate-attendance', terminateAttendance);

export default router;