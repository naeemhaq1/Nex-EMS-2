
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { calculateAttendanceMetrics, getTodayAttendanceMetrics, getYesterdayAttendanceMetrics, getAttendanceDetails } from '../utils/attendanceCalculations';
import { z } from 'zod';
import { Request, Response } from "express";
import { storage } from "../storage";
import { startOfDay, endOfDay, subDays } from "date-fns";
import { getCurrentPKTTime } from "../utils/timezone";

const router = Router();

// Get attendance metrics for a specific date
router.get('/metrics/:date', requireAuth, async (req, res) => {
  try {
    const date = new Date(req.params.date);
    if (isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    
    const metrics = await calculateAttendanceMetrics(date);
    res.json(metrics);
  } catch (error) {
    console.error('Error calculating attendance metrics:', error);
    res.status(500).json({ error: 'Failed to calculate attendance metrics' });
  }
});

// Get today's attendance metrics
router.get('/metrics/today', requireAuth, async (req, res) => {
  try {
    const metrics = await getTodayAttendanceMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Error getting today\'s attendance metrics:', error);
    res.status(500).json({ error: 'Failed to get today\'s attendance metrics' });
  }
});

// Get yesterday's attendance metrics  
router.get('/metrics/yesterday', requireAuth, async (req, res) => {
  try {
    const metrics = await getYesterdayAttendanceMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Error getting yesterday\'s attendance metrics:', error);
    res.status(500).json({ error: 'Failed to get yesterday\'s attendance metrics' });
  }
});

// Get detailed attendance breakdown for a specific date
router.get('/details/:date', requireAuth, async (req, res) => {
  try {
    const date = new Date(req.params.date);
    if (isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    
    const details = await getAttendanceDetails(date);
    res.json(details);
  } catch (error) {
    console.error('Error getting attendance details:', error);
    res.status(500).json({ error: 'Failed to get attendance details' });
  }
});

// Get attendance records with pagination and filters
router.get("/", async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      employeeId, 
      dateFrom, 
      dateTo, 
      status 
    } = req.query;
    
    const params: any = {
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    };
    
    if (employeeId) params.employeeId = parseInt(employeeId as string);
    if (dateFrom) params.dateFrom = new Date(dateFrom as string);
    if (dateTo) params.dateTo = new Date(dateTo as string);
    if (status) params.status = status as string;
    
    // If no date range specified, default to last 7 days
    if (!params.dateFrom && !params.dateTo) {
      const currentTime = getCurrentPKTTime();
      params.dateTo = endOfDay(currentTime);
      params.dateFrom = startOfDay(subDays(currentTime, 7));
    }
    
    const result = await storage.getAttendanceRecords(params);
    
    res.json({
      data: result.records,
      total: result.total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(result.total / params.limit)
    });
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
});

// Get attendance for specific employee
router.get("/employee/:employeeId", async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { 
      page = 1, 
      limit = 50, 
      dateFrom, 
      dateTo 
    } = req.query;
    
    const params: any = {
      employeeId: parseInt(employeeId),
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    };
    
    if (dateFrom) params.dateFrom = new Date(dateFrom as string);
    if (dateTo) params.dateTo = new Date(dateTo as string);
    
    // If no date range specified, default to last 30 days
    if (!params.dateFrom && !params.dateTo) {
      const currentTime = getCurrentPKTTime();
      params.dateTo = endOfDay(currentTime);
      params.dateFrom = startOfDay(subDays(currentTime, 30));
    }
    
    const result = await storage.getAttendanceRecords(params);
    
    res.json({
      data: result.records,
      total: result.total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(result.total / params.limit)
    });
  } catch (error) {
    console.error('Error fetching employee attendance:', error);
    res.status(500).json({ error: 'Failed to fetch employee attendance' });
  }
});

// Get today's attendance summary
router.get("/today", async (req: Request, res: Response) => {
  try {
    const currentTime = getCurrentPKTTime();
    const startOfToday = startOfDay(currentTime);
    const endOfToday = endOfDay(currentTime);
    
    const todayRecords = await storage.getAttendanceRecords({
      dateFrom: startOfToday,
      dateTo: endOfToday
    });
    
    // Get employee details
    const employees = await storage.getEmployees({ limit: 1000 });
    const employeeMap = new Map(employees.employees.map(e => [e.employeeCode, e]));
    
    // Process records with employee info
    const processedRecords = todayRecords.records.map(record => {
      const employee = employeeMap.get(record.employeeCode);
      return {
        ...record,
        employeeName: employee ? `${employee.firstName} ${employee.lastName}` : record.employeeCode,
        department: employee?.department || 'Unknown'
      };
    });
    
    res.json({
      records: processedRecords,
      summary: {
        totalRecords: todayRecords.records.length,
        uniqueEmployees: new Set(todayRecords.records.map(r => r.employeeCode)).size,
        lastUpdated: currentTime.toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching today\'s attendance:', error);
    res.status(500).json({ error: 'Failed to fetch today\'s attendance' });
  }
});

// Get attendance statistics
router.get("/statistics", async (req: Request, res: Response) => {
  try {
    const currentTime = getCurrentPKTTime();
    const startOfToday = startOfDay(currentTime);
    const endOfToday = endOfDay(currentTime);
    
    // Get today's data
    const todayData = await storage.getAttendanceRecords({
      dateFrom: startOfToday,
      dateTo: endOfToday
    });
    
    // Get yesterday's data for comparison
    const yesterday = subDays(currentTime, 1);
    const startOfYesterday = startOfDay(yesterday);
    const endOfYesterday = endOfDay(yesterday);
    
    const yesterdayData = await storage.getAttendanceRecords({
      dateFrom: startOfYesterday,
      dateTo: endOfYesterday
    });
    
    const todayUnique = new Set(todayData.records.map(r => r.employeeCode)).size;
    const yesterdayUnique = new Set(yesterdayData.records.map(r => r.employeeCode)).size;
    
    const statistics = {
      today: {
        totalRecords: todayData.records.length,
        uniqueEmployees: todayUnique,
        averageHoursWorked: calculateAverageHours(todayData.records)
      },
      yesterday: {
        totalRecords: yesterdayData.records.length,
        uniqueEmployees: yesterdayUnique,
        averageHoursWorked: calculateAverageHours(yesterdayData.records)
      },
      comparison: {
        recordsChange: todayData.records.length - yesterdayData.records.length,
        employeesChange: todayUnique - yesterdayUnique
      }
    };
    
    res.json(statistics);
  } catch (error) {
    console.error('Error fetching attendance statistics:', error);
    res.status(500).json({ error: 'Failed to fetch attendance statistics' });
  }
});

function calculateAverageHours(records: any[]): number {
  const recordsWithHours = records.filter(r => r.hoursWorked && r.hoursWorked > 0);
  if (recordsWithHours.length === 0) return 0;
  
  const totalHours = recordsWithHours.reduce((sum, r) => sum + r.hoursWorked, 0);
  return Math.round((totalHours / recordsWithHours.length) * 100) / 100;
}

export default router;
