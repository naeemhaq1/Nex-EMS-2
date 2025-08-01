import { Router } from 'express';
import { mobileAuth, AuthenticatedRequest } from '../middleware/mobileAuth';
import { db } from '../db';
import { attendanceRecords, employeeRecords } from '@shared/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

const router = Router();

// Apply mobile authentication to all routes
router.use(mobileAuth);

// Get employee-specific dashboard stats (NOT company-wide)
router.get('/dashboard/employee/:employeeCode', async (req: AuthenticatedRequest, res) => {
  try {
    const { employeeCode } = req.params;
    
    // Verify user can access this employee's data
    if (req.user?.employeeCode !== employeeCode && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Get EMPLOYEE-SPECIFIC attendance stats for current month
    const attendanceStats = await db
      .select({
        present: sql<number>`COUNT(CASE WHEN status = 'complete' THEN 1 END)`,
        absent: sql<number>`COUNT(CASE WHEN status = 'absent' THEN 1 END)`,
        late: sql<number>`COUNT(CASE WHEN check_in > '09:30:00' THEN 1 END)`,
        onTime: sql<number>`COUNT(CASE WHEN check_in <= '09:30:00' THEN 1 END)`,
        totalHours: sql<number>`COALESCE(SUM(total_hours), 0)`,
        total: sql<number>`COUNT(*)`,
      })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeCode, employeeCode),
          gte(attendanceRecords.date, startOfMonth),
          lte(attendanceRecords.date, today)
        )
      );

    // Get employee scoring (mock data for now)
    const scoring = {
      total_score: 85,
      punctuality_score: 90,
      attendance_score: 80,
      mobile_activity_score: 85,
      calculated_at: new Date(),
    };

    res.json({
      attendance: attendanceStats[0] || { present: 0, absent: 0, late: 0, total: 0 },
      scoring: scoring,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard data' });
  }
});

// Get employee data
router.get('/employees/:employeeCode', async (req: AuthenticatedRequest, res) => {
  try {
    const { employeeCode } = req.params;
    
    // Verify user can access this employee's data
    if (req.user?.employeeCode !== employeeCode && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [employee] = await db
      .select()
      .from(employeeRecords)
      .where(eq(employeeRecords.employeeCode, employeeCode));

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json(employee);
  } catch (error) {
    console.error('Employee fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch employee data' });
  }
});

// Get attendance stats
router.get('/attendance/employee/:employeeCode/stats', async (req: AuthenticatedRequest, res) => {
  try {
    const { employeeCode } = req.params;
    const { month } = req.query;
    
    // Verify user can access this employee's data
    if (req.user?.employeeCode !== employeeCode && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    let startDate: Date;
    let endDate: Date;

    if (month) {
      // Parse month like "2025-07"
      const [year, monthNum] = month.toString().split('-');
      startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      endDate = new Date(parseInt(year), parseInt(monthNum), 0);
    } else {
      // Current month
      const today = new Date();
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }

    const stats = await db
      .select({
        total_days: sql<number>`COUNT(*)`,
        present_days: sql<number>`COUNT(CASE WHEN status = 'present' THEN 1 END)`,
        absent_days: sql<number>`COUNT(CASE WHEN status = 'absent' THEN 1 END)`,
        late_days: sql<number>`COUNT(CASE WHEN check_in > '09:00:00' THEN 1 END)`,
        total_hours: sql<number>`SUM(total_hours)`,
        avg_hours: sql<number>`AVG(total_hours)`,
      })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeCode, employeeCode),
          gte(attendanceRecords.date, startDate),
          lte(attendanceRecords.date, endDate)
        )
      );

    res.json(stats[0] || {
      total_days: 0,
      present_days: 0,
      absent_days: 0,
      late_days: 0,
      total_hours: 0,
      avg_hours: 0,
    });
  } catch (error) {
    console.error('Attendance stats error:', error);
    res.status(500).json({ message: 'Failed to fetch attendance stats' });
  }
});

// Get attendance records
router.get('/attendance/employee/:employeeCode/records', async (req: AuthenticatedRequest, res) => {
  try {
    const { employeeCode } = req.params;
    const { startDate, endDate } = req.query;
    
    // Verify user can access this employee's data
    if (req.user?.employeeCode !== employeeCode && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    let whereClause = eq(attendanceRecords.employeeCode, employeeCode);

    if (startDate) {
      whereClause = and(whereClause, gte(attendanceRecords.date, new Date(startDate as string)));
    }

    if (endDate) {
      whereClause = and(whereClause, lte(attendanceRecords.date, new Date(endDate as string)));
    }

    const records = await db
      .select()
      .from(attendanceRecords)
      .where(whereClause)
      .orderBy(desc(attendanceRecords.date))
      .limit(100);

    res.json(records);
  } catch (error) {
    console.error('Attendance records error:', error);
    res.status(500).json({ message: 'Failed to fetch attendance records' });
  }
});

// Get employee scoring
router.get('/employee-scoring/scoring', async (req: AuthenticatedRequest, res) => {
  try {
    const { employeeCode } = req.query;
    
    // Verify user can access this employee's data
    if (req.user?.employeeCode !== employeeCode && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Return mock scoring data for now
    const scoring = {
      total_score: 85,
      punctuality_score: 90,
      attendance_score: 80,
      mobile_activity_score: 85,
      calculated_at: new Date(),
    };

    res.json(scoring);
  } catch (error) {
    console.error('Employee scoring error:', error);
    res.status(500).json({ message: 'Failed to fetch employee scoring' });
  }
});

// Mobile punch endpoints
router.post('/attendance/punch-in', async (req: AuthenticatedRequest, res) => {
  try {
    const { location } = req.body;
    const employeeCode = req.user?.employeeCode;

    if (!location || !employeeCode) {
      return res.status(400).json({ message: 'Location and employee code are required' });
    }

    // TODO: Implement mobile punch-in logic
    // This would involve:
    // 1. Validating location within geofence
    // 2. Creating attendance record
    // 3. Logging mobile punch
    
    res.json({ message: 'Punch in successful', timestamp: new Date() });
  } catch (error) {
    console.error('Punch in error:', error);
    res.status(500).json({ message: 'Failed to punch in' });
  }
});

router.post('/attendance/punch-out', async (req: AuthenticatedRequest, res) => {
  try {
    const { location } = req.body;
    const employeeCode = req.user?.employeeCode;

    if (!location || !employeeCode) {
      return res.status(400).json({ message: 'Location and employee code are required' });
    }

    // TODO: Implement mobile punch-out logic
    
    res.json({ message: 'Punch out successful', timestamp: new Date() });
  } catch (error) {
    console.error('Punch out error:', error);
    res.status(500).json({ message: 'Failed to punch out' });
  }
});

// Request submission
router.post('/requests', async (req: AuthenticatedRequest, res) => {
  try {
    const { type, reason, startDate, endDate, amount, details } = req.body;
    const employeeCode = req.user?.employeeCode;

    if (!type || !reason || !employeeCode) {
      return res.status(400).json({ message: 'Type, reason, and employee code are required' });
    }

    // TODO: Implement request submission logic
    
    res.json({ message: 'Request submitted successfully', id: Date.now() });
  } catch (error) {
    console.error('Request submission error:', error);
    res.status(500).json({ message: 'Failed to submit request' });
  }
});

// Get employee requests
router.get('/requests/employee/:employeeCode', async (req: AuthenticatedRequest, res) => {
  try {
    const { employeeCode } = req.params;
    
    // Verify user can access this employee's data
    if (req.user?.employeeCode !== employeeCode && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // TODO: Implement request fetching logic
    
    res.json([]);
  } catch (error) {
    console.error('Request fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch requests' });
  }
});

export default router;