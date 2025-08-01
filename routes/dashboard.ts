
import { Request, Response, Router } from "express";
import { storage } from "../storage";
import { startOfDay, endOfDay } from "date-fns";
import { getCurrentPKTTime } from "../utils/timezone";

const router = Router();

// Get dashboard metrics
router.get("/metrics", async (req: Request, res: Response) => {
  try {
    const currentTime = getCurrentPKTTime();
    const startOfToday = startOfDay(currentTime);
    const endOfToday = endOfDay(currentTime);
    
    // Get total employees
    const employeesResult = await storage.getEmployees({ limit: 1 });
    const totalEmployees = employeesResult.total;
    
    // Get today's attendance
    const todayAttendance = await storage.getAttendanceRecords({
      dateFrom: startOfToday,
      dateTo: endOfToday
    });
    
    // Calculate unique employees present today
    const uniqueEmployeesToday = new Set(todayAttendance.records.map(r => r.employeeCode));
    const presentToday = uniqueEmployeesToday.size;
    
    // Calculate late arrivals (assuming 9 AM is standard start time)
    const lateArrivals = todayAttendance.records.filter(record => {
      if (!record.checkIn) return false;
      const checkInTime = new Date(record.checkIn);
      const hours = checkInTime.getHours();
      const minutes = checkInTime.getMinutes();
      return hours > 9 || (hours === 9 && minutes > 0);
    }).length;
    
    // Calculate absent today
    const absentToday = totalEmployees - presentToday;
    
    const metrics = {
      totalEmployees,
      presentToday,
      lateArrivals,
      absentToday
    };
    
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
  }
});

// Get recent activity
router.get("/activity", async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;
    const limitNum = parseInt(limit as string);
    
    const currentTime = getCurrentPKTTime();
    const startOfToday = startOfDay(currentTime);
    
    // Get recent attendance records
    const recentAttendance = await storage.getAttendanceRecords({
      dateFrom: startOfToday,
      limit: limitNum * 2 // Get more to filter and sort
    });
    
    // Get employee details
    const employees = await storage.getEmployees({ limit: 1000 });
    const employeeMap = new Map(employees.employees.map(e => [e.employeeCode, e]));
    
    // Transform to recent activity format
    const activities = recentAttendance.records
      .map(record => {
        const employee = employeeMap.get(record.employeeCode);
        const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : record.employeeCode;
        const timestamp = record.checkIn || record.checkOut || new Date();
        const type = record.checkIn && !record.checkOut ? 'check_in' : 'check_out';
        
        return {
          type,
          employeeName,
          employeeCode: record.employeeCode,
          timestamp,
          details: `${employeeName} ${type === 'check_in' ? 'checked in' : 'checked out'}`
        };
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limitNum);
    
    res.json(activities);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});

// Get attendance summary
router.get("/attendance-summary", async (req: Request, res: Response) => {
  try {
    const currentTime = getCurrentPKTTime();
    const startOfToday = startOfDay(currentTime);
    const endOfToday = endOfDay(currentTime);
    
    // Get today's attendance
    const todayAttendance = await storage.getAttendanceRecords({
      dateFrom: startOfToday,
      dateTo: endOfToday
    });
    
    // Calculate hourly distribution
    const hourlyData = Array(24).fill(0);
    todayAttendance.records.forEach(record => {
      if (record.checkIn) {
        const hour = new Date(record.checkIn).getHours();
        hourlyData[hour]++;
      }
    });
    
    const summary = {
      totalRecords: todayAttendance.records.length,
      hourlyDistribution: hourlyData,
      peakHour: hourlyData.indexOf(Math.max(...hourlyData)),
      averageCheckInTime: calculateAverageCheckInTime(todayAttendance.records)
    };
    
    res.json(summary);
  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    res.status(500).json({ error: 'Failed to fetch attendance summary' });
  }
});

function calculateAverageCheckInTime(records: any[]): string {
  const checkInTimes = records
    .filter(r => r.checkIn)
    .map(r => new Date(r.checkIn).getHours() * 60 + new Date(r.checkIn).getMinutes());
  
  if (checkInTimes.length === 0) return "09:00";
  
  const avgMinutes = checkInTimes.reduce((a, b) => a + b, 0) / checkInTimes.length;
  const hours = Math.floor(avgMinutes / 60);
  const minutes = Math.round(avgMinutes % 60);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export default router;
