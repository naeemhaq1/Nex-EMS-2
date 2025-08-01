import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { db } from '../db';
import { attendanceRecords, employeeRecords } from '@shared/schema';
import { eq, and, gte, lte, desc, sql, between } from 'drizzle-orm';
import { subDays, format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

const router = Router();

// Apply authentication to all routes
router.use(requireAuth);

// Get employee-specific attendance behavior analytics
router.get('/employee-behavior/:employeeCode', async (req: AuthenticatedRequest, res) => {
  try {
    const { employeeCode } = req.params;
    
    // Verify user can access this employee's data
    if (req.session?.userId !== employeeCode && req.session?.role !== 'admin' && req.session?.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const today = new Date();
    const thirtyDaysAgo = subDays(today, 30);
    const currentMonth = startOfMonth(today);
    const endCurrentMonth = endOfMonth(today);
    
    // Get attendance records for last 30 days
    const attendanceData = await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeCode, employeeCode),
          gte(attendanceRecords.date, thirtyDaysAgo),
          lte(attendanceRecords.date, today)
        )
      )
      .orderBy(desc(attendanceRecords.date));

    // Calculate attendance patterns
    const attendanceStats = {
      onTime: 0,
      grace: 0,
      late: 0,
      absent: 0,
      totalHours: 0,
      punchOutMissed: 0,
      earlyExits: 0,
      currentStreak: 0,
      longestStreak: 0
    };

    // Daily attendance for charts
    const dailyData = [];
    const weeklyHours = [];
    const punctualityTrend = [];
    
    // Process each attendance record
    let currentStreakCount = 0;
    let maxStreakCount = 0;
    let lastDate = null;

    for (const record of attendanceData) {
      const checkInTime = record.checkIn ? new Date(record.checkIn) : null;
      const checkOutTime = record.checkOut ? new Date(record.checkOut) : null;
      
      // Determine punctuality status
      let status = 'absent';
      if (checkInTime) {
        const checkInHour = checkInTime.getHours();
        const checkInMinute = checkInTime.getMinutes();
        const totalMinutes = checkInHour * 60 + checkInMinute;
        
        if (totalMinutes <= 9 * 60 + 0) { // 9:00 AM
          status = 'onTime';
          attendanceStats.onTime++;
        } else if (totalMinutes <= 9 * 60 + 30) { // 9:30 AM grace period
          status = 'grace';
          attendanceStats.grace++;
        } else {
          status = 'late';
          attendanceStats.late++;
        }
        
        // Check for punch out missed
        if (!checkOutTime) {
          attendanceStats.punchOutMissed++;
        } else {
          // Check for early exit (before 5 PM)
          const checkOutHour = checkOutTime.getHours();
          if (checkOutHour < 17) {
            attendanceStats.earlyExits++;
          }
        }
        
        // Add to total hours
        attendanceStats.totalHours += record.totalHours || 0;
        
        // Update streak
        if (status === 'onTime') {
          currentStreakCount++;
          maxStreakCount = Math.max(maxStreakCount, currentStreakCount);
        } else {
          currentStreakCount = 0;
        }
      } else {
        attendanceStats.absent++;
        currentStreakCount = 0;
      }
      
      // Add to daily data
      dailyData.push({
        date: format(new Date(record.date), 'yyyy-MM-dd'),
        status,
        hours: record.totalHours || 0,
        checkIn: checkInTime ? format(checkInTime, 'HH:mm') : null,
        checkOut: checkOutTime ? format(checkOutTime, 'HH:mm') : null
      });
    }

    attendanceStats.currentStreak = currentStreakCount;
    attendanceStats.longestStreak = maxStreakCount;

    // Generate weekly hours data (last 4 weeks)
    for (let week = 0; week < 4; week++) {
      const weekStart = subDays(today, (week + 1) * 7);
      const weekEnd = subDays(today, week * 7);
      
      const weekData = attendanceData.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= weekStart && recordDate <= weekEnd;
      });
      
      const weekHours = weekData.reduce((total, record) => total + (record.totalHours || 0), 0);
      
      weeklyHours.unshift({
        week: `W${4 - week}`,
        hours: Math.round(weekHours * 10) / 10,
        days: weekData.length
      });
    }

    // Generate punctuality trend (daily for last 7 days)
    for (let day = 6; day >= 0; day--) {
      const targetDate = subDays(today, day);
      const dayRecord = attendanceData.find(record => 
        format(new Date(record.date), 'yyyy-MM-dd') === format(targetDate, 'yyyy-MM-dd')
      );
      
      let punctualityScore = 0;
      if (dayRecord && dayRecord.checkIn) {
        const checkInTime = new Date(dayRecord.checkIn);
        const checkInMinutes = checkInTime.getHours() * 60 + checkInTime.getMinutes();
        
        if (checkInMinutes <= 9 * 60) {
          punctualityScore = 100;
        } else if (checkInMinutes <= 9 * 60 + 30) {
          punctualityScore = 80;
        } else if (checkInMinutes <= 10 * 60) {
          punctualityScore = 60;
        } else {
          punctualityScore = 40;
        }
      }
      
      punctualityTrend.push({
        date: format(targetDate, 'MMM dd'),
        score: punctualityScore,
        status: dayRecord ? (dayRecord.checkIn ? 'present' : 'absent') : 'absent'
      });
    }

    // Calculate attendance rate
    const totalDays = attendanceData.length;
    const presentDays = attendanceStats.onTime + attendanceStats.grace + attendanceStats.late;
    const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    res.json({
      employeeCode,
      period: {
        from: format(thirtyDaysAgo, 'yyyy-MM-dd'),
        to: format(today, 'yyyy-MM-dd'),
        totalDays
      },
      stats: {
        ...attendanceStats,
        attendanceRate,
        averageHours: totalDays > 0 ? Math.round((attendanceStats.totalHours / presentDays) * 10) / 10 : 0
      },
      charts: {
        dailyAttendance: dailyData.slice(0, 30), // Last 30 days
        weeklyHours,
        punctualityTrend,
        attendanceBreakdown: [
          { name: 'On Time', value: attendanceStats.onTime, color: '#10B981' },
          { name: 'Grace Period', value: attendanceStats.grace, color: '#F59E0B' },
          { name: 'Late', value: attendanceStats.late, color: '#EF4444' },
          { name: 'Absent', value: attendanceStats.absent, color: '#6B7280' }
        ]
      }
    });
  } catch (error) {
    console.error('Employee analytics error:', error);
    res.status(500).json({ message: 'Failed to fetch employee analytics' });
  }
});

// Get employee performance scoring
router.get('/employee-performance/:employeeCode', async (req: AuthenticatedRequest, res) => {
  try {
    const { employeeCode } = req.params;
    
    // Verify user can access this employee's data
    if (req.session?.userId !== employeeCode && req.session?.role !== 'admin' && req.session?.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const today = new Date();
    const currentMonth = startOfMonth(today);
    
    // Get current month attendance
    const monthlyAttendance = await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeCode, employeeCode),
          gte(attendanceRecords.date, currentMonth),
          lte(attendanceRecords.date, today)
        )
      );

    // Calculate performance scores
    const totalDays = monthlyAttendance.length;
    const presentDays = monthlyAttendance.filter(r => r.checkIn).length;
    const onTimeDays = monthlyAttendance.filter(r => {
      if (!r.checkIn) return false;
      const checkIn = new Date(r.checkIn);
      return checkIn.getHours() * 60 + checkIn.getMinutes() <= 9 * 60;
    }).length;

    const attendanceScore = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
    const punctualityScore = presentDays > 0 ? Math.round((onTimeDays / presentDays) * 100) : 0;
    const consistencyScore = Math.round((attendanceScore + punctualityScore) / 2);
    const totalScore = Math.round((attendanceScore + punctualityScore + consistencyScore) / 3);

    res.json({
      employeeCode,
      month: format(currentMonth, 'MMMM yyyy'),
      scores: {
        total: totalScore,
        attendance: attendanceScore,
        punctuality: punctualityScore,
        consistency: consistencyScore
      },
      metrics: {
        totalDays,
        presentDays,
        onTimeDays,
        totalHours: monthlyAttendance.reduce((sum, r) => sum + (r.totalHours || 0), 0)
      }
    });
  } catch (error) {
    console.error('Employee performance error:', error);
    res.status(500).json({ message: 'Failed to fetch employee performance' });
  }
});

export default router;