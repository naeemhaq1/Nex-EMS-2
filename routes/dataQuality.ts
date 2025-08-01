import express from 'express';
import { db } from '../db';
import { attendancePullExt } from '@shared/schema';
import { sql } from 'drizzle-orm';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { Request, Response, Router } from "express";
import { storage } from "../storage";
import { format, startOfDay, endOfDay } from "date-fns";
import { getCurrentPKTTime, formatPKTDateTime } from "../utils/timezone";
import { stringify } from "csv-stringify/sync";

const router = express.Router();

interface DataQuality {
  date: string;
  quality: 'good' | 'fair' | 'poor';
  recordCount: number;
  expectedRecords: number;
  qualityPercentage: number;
  gaps: number;
  issues: string[];
}

interface DataStats {
  totalRecords: number;
  goodDays: number;
  fairDays: number;
  poorDays: number;
  averageQuality: number;
  lastUpdated: string;
}

// Get live attendance data for data interface
router.get("/data/live-attendance", async (req: Request, res: Response) => {
  try {
    const { search, department, checkType } = req.query;

    // Convert "undefined" strings to actual undefined values
    const cleanSearch = search === 'undefined' ? undefined : search as string;
    const cleanDepartment = department === 'undefined' ? undefined : department as string;
    const cleanCheckType = checkType === 'undefined' ? undefined : checkType as string;

    // Get today's date in Pakistan timezone
    const currentTime = getCurrentPKTTime();
    const startOfToday = startOfDay(currentTime);
    const endOfToday = endOfDay(currentTime);

    // Get all attendance records for today
    const attendanceData = await storage.getAttendanceRecords({
      dateFrom: startOfToday,
      dateTo: endOfToday,
      limit: 1000, // Get all records for today
    });

    // Get employee details for enrichment
    const employees = await storage.getEmployees({ limit: 1000 });
    const employeeMap = new Map(employees.employees.map(e => [e.employeeCode, e]));

    // Transform processed records for display
    let records = attendanceData.records.map(record => {
      const employee = employeeMap.get(record.employeeCode);
      // Use check_in time as the primary time, or check_out if check_in is null
      const rawCheckTime = record.checkIn || record.checkOut || new Date();
      const checkType = record.checkIn && !record.checkOut ? 'in' : 'out';

      // Convert time to Pakistan timezone before sending
      const checkTimePKT = formatPKTDateTime(rawCheckTime);

      return {
        id: record.id,
        employeeCode: record.employeeCode,
        employeeName: employee ? `${employee.firstName} ${employee.lastName}` : record.employeeCode,
        department: employee?.department || 'Unknown',
        checkTime: checkTimePKT.toISOString(),
        checkType: checkType,
        location: record.location || 'Main Office',
        deviceName: 'BioTime Terminal',
        createdAt: record.createdAt,
        source: 'processed'
      };
    });

    // Apply filters
    if (cleanSearch) {
      const searchLower = cleanSearch.toLowerCase();
      records = records.filter(r => 
        r.employeeCode.toLowerCase().includes(searchLower) ||
        r.employeeName.toLowerCase().includes(searchLower)
      );
    }

    if (cleanDepartment && cleanDepartment !== 'all') {
      records = records.filter(r => r.department === cleanDepartment);
    }

    if (cleanCheckType && cleanCheckType !== 'all') {
      records = records.filter(r => r.checkType === cleanCheckType);
    }

    // Sort by checkTime descending (most recent first)
    records.sort((a, b) => new Date(b.checkTime).getTime() - new Date(a.checkTime).getTime());

    res.json(records);
  } catch (error) {
    console.error('Error fetching live attendance:', error);
    res.status(500).json({ error: 'Failed to fetch live attendance data' });
  }
});

// Get data statistics
router.get("/data/stats", async (req: Request, res: Response) => {
  try {
    const currentTime = getCurrentPKTTime();
    const startOfToday = startOfDay(currentTime);
    const endOfToday = endOfDay(currentTime);

    // Get today's attendance count
    const todayAttendance = await storage.getAttendanceRecords({
      dateFrom: startOfToday,
      dateTo: endOfToday,
      limit: 1
    });

    // Get unique employees count for today
    const todayRecords = await storage.getAttendanceRecords({
      dateFrom: startOfToday,
      dateTo: endOfToday,
      limit: 1000
    });

    const uniqueEmployees = new Set(todayRecords.records.map(r => r.employeeCode));

    const stats = {
      totalRecords: todayAttendance.total || 0,
      totalEmployees: uniqueEmployees.size || 0,
      lastUpdate: currentTime.toISOString(),
      todayBackupStatus: "pending" // Will be updated by backup service
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching data stats:', error);
    res.status(500).json({ error: 'Failed to fetch data statistics' });
  }
});

// Download today's data as CSV
router.get("/data/download-today", async (req: Request, res: Response) => {
  try {
    const currentTime = getCurrentPKTTime();
    const startOfToday = startOfDay(currentTime);
    const endOfToday = endOfDay(currentTime);

    // Get all attendance records for today
    const attendanceData = await storage.getAttendanceRecords({
      dateFrom: startOfToday,
      dateTo: endOfToday
    });

    // Get employee details
    const employees = await storage.getEmployees({ limit: 1000 });
    const employeeMap = new Map(employees.employees.map(e => [e.employeeCode, e]));

    // Prepare CSV data
    const csvData = attendanceData.records.map(record => {
      const employee = employeeMap.get(record.employeeCode);
      const checkTime = record.checkIn || record.checkOut || new Date();
      const checkType = record.checkIn && !record.checkOut ? 'IN' : 'OUT';

      return {
        'Employee Code': record.employeeCode,
        'Employee Name': employee ? `${employee.firstName} ${employee.lastName}` : record.employeeCode,
        'Department': employee?.department || 'Unknown',
        'Check Type': checkType,
        'Check Time': format(checkTime, 'yyyy-MM-dd HH:mm:ss'),
        'Location': record.location || 'Main Office',
        'Device': 'BioTime Terminal',
        'Hours Worked': record.hoursWorked || 0,
        'Total Hours': record.totalHours || 0
      };
    });

    // Generate CSV
    const csv = stringify(csvData, {
      header: true,
      columns: [
        'Employee Code',
        'Employee Name',
        'Department',
        'Check Type',
        'Check Time',
        'Location',
        'Device',
        'Hours Worked',
        'Total Hours'
      ]
    });

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_${format(currentTime, 'yyyy-MM-dd')}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Error downloading attendance data:', error);
    res.status(500).json({ error: 'Failed to download attendance data' });
  }
});

// Get data quality metrics
router.get("/data/quality-metrics", async (req: Request, res: Response) => {
  try {
    const currentTime = getCurrentPKTTime();
    const startOfToday = startOfDay(currentTime);
    const endOfToday = endOfDay(currentTime);

    // Get attendance data
    const attendanceData = await storage.getAttendanceRecords({
      dateFrom: startOfToday,
      dateTo: endOfToday
    });

    // Calculate quality metrics
    const totalRecords = attendanceData.records.length;
    const completeRecords = attendanceData.records.filter(r => 
      r.checkIn && r.checkOut && r.employeeCode
    ).length;

    const incompleteRecords = totalRecords - completeRecords;
    const qualityScore = totalRecords > 0 ? Math.round((completeRecords / totalRecords) * 100) : 100;

    const metrics = {
      totalRecords,
      completeRecords,
      incompleteRecords,
      qualityScore,
      lastUpdated: currentTime.toISOString()
    };

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching quality metrics:', error);
    res.status(500).json({ error: 'Failed to fetch quality metrics' });
  }
});

// Get data quality for a specific month
router.get('/data-quality', requireAuth, async (req, res) => {
  try {
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    console.log(`[DataQuality] Fetching data quality for ${year}-${month}`);

    // Get daily attendance data for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const dailyData = await db.execute(sql`
      SELECT 
        DATE(all_fields->>'punch_time') as date,
        COUNT(*) as record_count
      FROM attendance_pull_ext 
      WHERE DATE(all_fields->>'punch_time') >= ${startDate.toISOString().split('T')[0]}
        AND DATE(all_fields->>'punch_time') <= ${endDate.toISOString().split('T')[0]}
        AND all_fields->>'punch_time' IS NOT NULL
      GROUP BY DATE(all_fields->>'punch_time')
      ORDER BY DATE(all_fields->>'punch_time')
    `);

    // Process daily data into quality metrics
    const qualityData: DataQuality[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayData = dailyData.find((d: any) => d.date === dateStr);
      const recordCount = dayData ? parseInt(dayData.record_count) : 0;

      // Estimate expected records based on working days (weekdays)
      const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
      const expectedRecords = isWeekend ? 100 : 500; // Rough estimates

      const qualityPercentage = expectedRecords > 0 ? Math.min(100, (recordCount / expectedRecords) * 100) : 0;

      let quality: 'good' | 'fair' | 'poor';
      let issues: string[] = [];

      if (qualityPercentage >= 80) {
        quality = 'good';
      } else if (qualityPercentage >= 50) {
        quality = 'fair';
        issues.push('Lower than expected attendance records');
      } else {
        quality = 'poor';
        issues.push('Significantly low attendance records');
        if (recordCount === 0) {
          issues.push('No attendance data available');
        }
      }

      qualityData.push({
        date: dateStr,
        quality,
        recordCount,
        expectedRecords,
        qualityPercentage: Math.round(qualityPercentage),
        gaps: expectedRecords - recordCount,
        issues
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`[DataQuality] Returning ${qualityData.length} days of quality data`);
    res.json(qualityData);

  } catch (error) {
    console.error('[DataQuality] Error fetching data quality:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch data quality information'
    });
  }
});

// Get overall data statistics
router.get('/data-stats', requireAuth, async (req, res) => {
  try {
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    console.log(`[DataStats] Fetching data statistics for ${year}-${month}`);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Get total records for the month
    const totalRecordsResult = await db.execute(sql`
      SELECT COUNT(*) as total
      FROM attendance_pull_ext 
      WHERE DATE(all_fields->>'punch_time') >= ${startDate.toISOString().split('T')[0]}
        AND DATE(all_fields->>'punch_time') <= ${endDate.toISOString().split('T')[0]}
        AND all_fields->>'punch_time' IS NOT NULL
    `);

    const totalRecords = totalRecordsResult[0]?.total || 0;

    // Get daily quality data to calculate stats
    const dailyQualityResult = await db.execute(sql`
      SELECT 
        DATE(all_fields->>'punch_time') as date,
        COUNT(*) as record_count
      FROM attendance_pull_ext 
      WHERE DATE(all_fields->>'punch_time') >= ${startDate.toISOString().split('T')[0]}
        AND DATE(all_fields->>'punch_time') <= ${endDate.toISOString().split('T')[0]}
        AND all_fields->>'punch_time' IS NOT NULL
      GROUP BY DATE(all_fields->>'punch_time')
    `);

    // Calculate quality distribution
    let goodDays = 0;
    let fairDays = 0;
    let poorDays = 0;
    let totalQuality = 0;

    // Process each day in the month
    const currentDate = new Date(startDate);
    let totalDays = 0;

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayData = dailyQualityResult.find((d: any) => d.date === dateStr);
      const recordCount = dayData ? parseInt(dayData.record_count) : 0;

      const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
      const expectedRecords = isWeekend ? 100 : 500;
      const qualityPercentage = expectedRecords > 0 ? Math.min(100, (recordCount / expectedRecords) * 100) : 0;

      totalQuality += qualityPercentage;
      totalDays++;

      if (qualityPercentage >= 80) {
        goodDays++;
      } else if (qualityPercentage >= 50) {
        fairDays++;
      } else {
        poorDays++;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    const averageQuality = totalDays > 0 ? Math.round(totalQuality / totalDays) : 0;

    const stats: DataStats = {
      totalRecords: parseInt(totalRecords.toString()),
      goodDays,
      fairDays,
      poorDays,
      averageQuality,
      lastUpdated: new Date().toISOString()
    };

    console.log(`[DataStats] Returning stats:`, stats);
    res.json(stats);

  } catch (error) {
    console.error('[DataStats] Error fetching data statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch data statistics'
    });
  }
});

// Trigger data quality recalculation
router.post('/recalculate-quality', requireAdmin, async (req, res) => {
  try {
    console.log(`[DataQuality] Manual recalculation triggered by ${req.session.username}`);

    // This could trigger background recalculation if needed
    // For now, just return success as the data is calculated on-demand

    res.json({
      success: true,
      message: 'Data quality recalculation completed',
      triggeredBy: req.session.username,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[DataQuality] Error during recalculation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to recalculate data quality'
    });
  }
});

export default router;