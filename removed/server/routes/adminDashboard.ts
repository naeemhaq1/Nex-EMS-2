import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { storage } from "../storage";
import { liveAttendanceService } from "../services/liveAttendanceService";
import { fastDashboardCache } from "../services/fastDashboardCache";

const router = Router();

// LIVE Admin dashboard metrics endpoint - reads directly from biotime_sync_data
router.get("/dashboard-metrics", requireAuth, async (req, res) => {
  try {
    // Check if user is admin/manager
    const isAdmin = ['admin', 'superadmin', 'general_admin', 'manager'].includes(req.session.role || '');
    
    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    console.log(`[DashboardMetrics] Calculating LIVE metrics from biotime_sync_data`);

    // Get LIVE metrics directly from biotime_sync_data (bypasses processing pipeline)
    const liveMetrics = await liveAttendanceService.calculateLiveMetrics();

    const metrics = {
      totalActiveUsers: liveMetrics.totalActiveUsers,
      totalSystemUsers: liveMetrics.totalSystemUsers,
      totalEmployees: liveMetrics.totalEmployees,
      todayAttendance: liveMetrics.todayAttendance,
      totalPunchIn: liveMetrics.totalPunchIn,
      totalPunchOut: liveMetrics.totalPunchOut,
      presentToday: liveMetrics.presentToday,
      absentToday: liveMetrics.absentToday,
      completedToday: liveMetrics.completedToday,
      lateArrivals: liveMetrics.lateArrivals,
      overtimeHours: liveMetrics.overtimeHours,
      totalHoursWorked: liveMetrics.totalHoursWorked,
      averageWorkingHours: liveMetrics.averageWorkingHours,
      attendanceRate: liveMetrics.attendanceRate,
      systemHealth: liveMetrics.systemHealth,
      calculatedAt: liveMetrics.calculatedAt,
      targetDate: liveMetrics.targetDate,
      dataSource: liveMetrics.dataSource
    };

    console.log(`[DashboardMetrics] LIVE: ${liveMetrics.presentToday} present, ${liveMetrics.absentToday} absent, ${liveMetrics.attendanceRate}% rate`);
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching LIVE admin dashboard metrics:', error);
    res.status(500).json({ 
      error: "Failed to fetch LIVE admin dashboard metrics",
      details: (error as Error).message 
    });
  }
});

// Unified metrics endpoint for consistent data across all dashboards
router.get("/unified-metrics", requireAuth, async (req, res) => {
  try {
    // Check if user is admin/manager
    const isAdmin = ['admin', 'superadmin', 'general_admin', 'manager'].includes(req.session.role || '');
    
    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Use the same logic as dashboard-metrics for consistency
    const { unifiedAttendanceService } = await import('../services/unifiedAttendanceService');
    
    const now = new Date();
    const todayPKT = now.toISOString().split('T')[0];
    
    console.log(`[UnifiedMetrics] Calculating for today: ${todayPKT} (Pakistan Time)`);

    const todayMetrics = await unifiedAttendanceService.calculateMetrics(new Date(todayPKT));

    // Determine system health based on attendance rate
    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (todayMetrics.attendanceRate < 50) {
      systemHealth = 'critical';
    } else if (todayMetrics.attendanceRate < 80) {
      systemHealth = 'warning';
    }

    // Return unified structure that works for all dashboards
    const unifiedMetrics = {
      // Core user counts - using proper field names from UnifiedAttendanceMetrics
      totalActiveUsers: todayMetrics.totalEmployees, // Map totalEmployees to totalActiveUsers for UI compatibility
      totalSystemUsers: todayMetrics.totalEmployees, // System users same as total employees
      totalEmployees: todayMetrics.totalEmployees,
      
      // Attendance metrics
      totalPunchIn: todayMetrics.totalPunchIn,
      totalPunchOut: todayMetrics.totalPunchOut,
      presentToday: todayMetrics.presentToday,
      absentToday: todayMetrics.absentToday,
      completedToday: todayMetrics.completedToday,
      
      // Performance metrics
      lateArrivals: todayMetrics.lateArrivals,
      attendanceRate: parseFloat(todayMetrics.attendanceRate.toFixed(1)),
      averageWorkingHours: Math.round(todayMetrics.averageWorkingHours * 10) / 10,
      overtimeHours: todayMetrics.overtimeHours,
      totalHoursWorked: todayMetrics.totalHoursWorked,
      
      // Additional desktop dashboard compatibility
      totalPresent: todayMetrics.presentToday,
      totalLate: todayMetrics.lateArrivals,
      totalAttendance: todayMetrics.totalAttendance,
      completedShifts: todayMetrics.completedToday,
      punctualityRate: Math.max(0, 100 - (todayMetrics.lateArrivals / Math.max(1, todayMetrics.presentToday) * 100)),
      efficiencyScore: Math.min(100, todayMetrics.attendanceRate + 5), // Simple efficiency calculation
      averageHours: Math.round(todayMetrics.averageWorkingHours * 10) / 10,
      
      // System status
      systemHealth,
      calculatedAt: todayMetrics.calculatedAt,
      targetDate: todayPKT
    };

    res.json(unifiedMetrics);
  } catch (error) {
    console.error('Error fetching unified admin metrics:', error);
    res.status(500).json({ 
      error: "Failed to fetch unified admin metrics",
      details: (error as Error).message 
    });
  }
});

// GET /api/dashboard/metrics - ULTRA-FAST dashboard metrics (<500ms response)
router.get('/metrics', requireAuth, async (req, res) => {
  try {
    console.log('[FastDashboard] Fetching FAST cached metrics for sub-5 second dashboard loading...');
    
    // Check if user is admin/manager
    const isAdmin = ['admin', 'superadmin', 'general_admin', 'manager'].includes(req.session.role || '');
    
    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const startTime = Date.now();
    
    // Get cached metrics for ultra-fast response
    const cachedMetrics = await fastDashboardCache.getFastMetrics();
    
    const responseTime = Date.now() - startTime;
    
    // Format response for dashboard compatibility
    const dashboardMetrics = {
      // Core metrics
      totalEmployees: cachedMetrics.totalEmployees,
      totalPunchIn: cachedMetrics.totalPunchIn,
      totalPunchOut: cachedMetrics.totalPunchOut,
      presentToday: cachedMetrics.presentToday,
      absentToday: cachedMetrics.absentToday,
      completedToday: cachedMetrics.completedToday,
      lateArrivals: cachedMetrics.lateArrivals,
      attendanceRate: cachedMetrics.attendanceRate,
      
      // Additional compatibility fields
      totalActiveUsers: cachedMetrics.totalEmployees,
      totalSystemUsers: cachedMetrics.totalEmployees,
      totalPresent: cachedMetrics.presentToday,
      totalLate: cachedMetrics.lateArrivals,
      totalAttendance: cachedMetrics.presentToday + cachedMetrics.absentToday,
      completedShifts: cachedMetrics.completedToday,
      
      // Performance metrics
      averageWorkingHours: cachedMetrics.averageWorkingHours,
      overtimeHours: cachedMetrics.overtimeHours,
      totalHoursWorked: cachedMetrics.totalHoursWorked,
      punctualityRate: Math.max(0, 100 - (cachedMetrics.lateArrivals / Math.max(1, cachedMetrics.presentToday) * 100)),
      efficiencyScore: Math.min(100, cachedMetrics.attendanceRate + 5),
      
      // System info
      systemHealth: cachedMetrics.systemHealth,
      calculatedAt: cachedMetrics.calculatedAt,
      targetDate: cachedMetrics.targetDate,
      responseTime: `${responseTime}ms`,
      dataSource: 'fast-cache'
    };

    console.log(`[FastDashboard] FAST RESPONSE: ${responseTime}ms | ${cachedMetrics.presentToday} present, ${cachedMetrics.attendanceRate}% rate`);
    res.json(dashboardMetrics);
  } catch (error) {
    console.error('Error fetching FAST dashboard metrics:', error);
    res.status(500).json({ 
      error: "Failed to fetch FAST dashboard metrics",
      details: (error as Error).message 
    });
  }
});

export default router;