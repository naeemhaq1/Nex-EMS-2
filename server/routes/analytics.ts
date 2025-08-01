import { Request, Response } from "express";
import { storage } from "../storage";
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, addHours, addMinutes } from "date-fns";
import { db } from "../db";
import { attendanceRecords, employeeRecords } from "@shared/schema";
import { eq, and, gte, lte, or, isNull, isNotNull, sql, ne, desc } from "drizzle-orm";
import { unifiedAttendanceService } from "../services/unifiedAttendanceService";
// System timezone utilities are imported dynamically where needed

// Get non-bio employees list with comprehensive department breakdown
// Get calculated NonBio employees using unified attendance service
export async function getCalculatedNonBioEmployees(req: Request, res: Response) {
  try {
    const { date } = req.query;
    const calculationDate = date ? new Date(date as string) : new Date();
    
    // Use unified attendance service to get calculated NonBio employees
    const nonBioEmployees = await unifiedAttendanceService.getNonBioEmployees(calculationDate);
    
    // Group employees by department for department breakdown
    const departmentBreakdown = nonBioEmployees.reduce((acc: any, emp: any) => {
      const dept = emp.department || 'Unknown';
      if (!acc[dept]) {
        acc[dept] = {
          department: dept,
          employee_count: 0,
          employees: []
        };
      }
      acc[dept].employee_count++;
      acc[dept].employees.push({
        employeeCode: emp.employeeCode,
        firstName: emp.firstName,
        lastName: emp.lastName,
        designation: emp.designation,
        username: emp.username
      });
      return acc;
    }, {});
    
    // Convert to array and sort by employee count
    const departmentArray = Object.values(departmentBreakdown).sort((a: any, b: any) => b.employee_count - a.employee_count);
    
    res.json({
      date: calculationDate.toISOString().split('T')[0],
      totalCount: nonBioEmployees.length,
      departmentBreakdown: departmentArray,
      employees: nonBioEmployees.map(emp => ({
        employee_code: emp.employeeCode,
        first_name: emp.firstName,
        last_name: emp.lastName,
        department: emp.department,
        designation: emp.designation,
        username: emp.username,
        status: 'NonBio Employee (Calculated)'
      }))
    });
  } catch (error) {
    console.error('Error fetching calculated NonBio employees:', error);
    res.status(500).json({ error: 'Failed to fetch calculated NonBio employees' });
  }
}

export async function getNonBioEmployees(req: Request, res: Response) {
  try {
    const { date } = req.query;
    const calculationDate = date ? new Date(date as string) : new Date();
    
    // Get detailed non-bio employee data with SQL query for comprehensive breakdown
    const nonBioEmployeesQuery = await db.execute(sql`
      WITH active_employees AS (
        SELECT 
          er.employee_code,
          er.first_name,
          er.last_name,
          er.department,
          er.designation,
          u.username,
          u.id as user_id
        FROM users u
        INNER JOIN employee_records er ON u.employee_id = er.employee_code
        WHERE u.is_active = true
          AND u.account_type = 'employee'
          AND er.system_account = false
          AND er.department != 'MIGRATED_TO_FORMER_EMPLOYEES'
          AND LOWER(er.first_name) != 'noc'
      ),
      biometric_employees AS (
        SELECT DISTINCT ar.employee_code
        FROM attendance_records ar
        WHERE DATE(ar.date) = CURRENT_DATE
          AND ar.check_in IS NOT NULL
      ),
      non_bio_employees AS (
        SELECT 
          ae.employee_code,
          ae.first_name,
          ae.last_name,
          ae.department,
          ae.designation,
          ae.username
        FROM active_employees ae
        LEFT JOIN biometric_employees be ON ae.employee_code = be.employee_code
        WHERE be.employee_code IS NULL
      )
      SELECT 
        department,
        COUNT(*) as employee_count,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'employeeCode', employee_code,
            'firstName', first_name,
            'lastName', last_name,
            'designation', designation,
            'username', username
          )
        ) as employees
      FROM non_bio_employees
      GROUP BY department
      ORDER BY employee_count DESC, department;
    `);

    // Get total counts
    const totalNonBioEmployees = nonBioEmployeesQuery.reduce((sum, dept) => sum + (dept.employee_count || 0), 0);
    
    // Get individual employees list
    const individualEmployees = await db.execute(sql`
      WITH active_employees AS (
        SELECT 
          er.employee_code,
          er.first_name,
          er.last_name,
          er.department,
          er.designation,
          u.username,
          u.id as user_id
        FROM users u
        INNER JOIN employee_records er ON u.employee_id = er.employee_code
        WHERE u.is_active = true
          AND u.account_type = 'employee'
          AND er.system_account = false
          AND er.department != 'MIGRATED_TO_FORMER_EMPLOYEES'
          AND LOWER(er.first_name) != 'noc'
      ),
      biometric_employees AS (
        SELECT DISTINCT ar.employee_code
        FROM attendance_records ar
        WHERE DATE(ar.date) = CURRENT_DATE
          AND ar.check_in IS NOT NULL
      )
      SELECT 
        ae.employee_code,
        ae.first_name,
        ae.last_name,
        ae.department,
        ae.designation,
        ae.username,
        'Non-Bio Employee' as status
      FROM active_employees ae
      LEFT JOIN biometric_employees be ON ae.employee_code = be.employee_code
      WHERE be.employee_code IS NULL
      ORDER BY ae.department, ae.designation, ae.first_name;
    `);

    res.json({
      date: calculationDate.toISOString().split('T')[0],
      totalCount: totalNonBioEmployees,
      departmentBreakdown: nonBioEmployeesQuery,
      employees: individualEmployees
    });
  } catch (error) {
    console.error('Error fetching non-bio employees:', error);
    res.status(500).json({ error: 'Failed to fetch non-bio employees' });
  }
}

// Helper function to format time duration since punch in
function formatTimeSincePunchIn(milliseconds: number): string {
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// Get attendance chart data for the last 7 days using real attendance data
export async function getAttendanceChartData(req: Request, res: Response) {
  try {
    const { getCurrentTimezone, getCurrentSystemDate, getSystemDayBounds } = await import('../config/timezone');
    const timezone = getCurrentTimezone();
    
    const chartData = [];
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Get last 7 days of real attendance data using system timezone
    for (let i = 6; i >= 0; i--) {
      const currentSystemDate = getCurrentSystemDate();
      const targetDate = new Date(currentSystemDate);
      targetDate.setDate(targetDate.getDate() - i);
      
      const targetDateStr = targetDate.toISOString().split('T')[0];
      const { start: startOfTargetDay, end: endOfTargetDay } = getSystemDayBounds(targetDateStr);
      const dayName = daysOfWeek[targetDate.getDay()];
      
      // Get actual attendance data for this specific day
      const dayAttendance = await storage.getAttendanceRecords({
        dateFrom: startOfTargetDay,
        dateTo: endOfTargetDay,
        limit: 1000
      });
      
      // Get total active employees
      const totalEmployees = await storage.getEmployeeCount({ isActive: true });
      
      // Get NonBio employees count
      const nonBioCount = await storage.getEmployeeCount({ isActive: true, nonBio: true });
      
      // Calculate metrics for this specific day
      const presentCount = dayAttendance.records.length;
      
      // Simplified late calculation - consider late if after 9:30 AM (standard with grace period)
      const lateCount = dayAttendance.records.filter(record => {
        if (!record.checkIn) return false;
        const checkInTime = new Date(record.checkIn);
        const hours = checkInTime.getHours();
        const minutes = checkInTime.getMinutes();
        const totalMinutes = hours * 60 + minutes;
        // Consider late if after 9:30 AM (9:30 = 570 minutes) - includes grace period
        return totalMinutes > 570;
      }).length;
      
      const totalAttendance = presentCount + nonBioCount;
      const absentCount = Math.max(0, totalEmployees - totalAttendance);
      
      chartData.push({
        date: dayName,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        nonBio: nonBioCount
      });
    }
    
    res.json(chartData);
  } catch (error: any) {
    console.error('Error fetching attendance chart data:', error);
    res.status(500).json({ error: "Failed to fetch attendance chart data" });
  }
}

// Get 90-day attendance data for Attendance Records interface
export async function get90DayAttendanceData(req: Request, res: Response) {
  try {
    const chartData = [];
    
    // Get last 90 days of real attendance data (left to right order)
    for (let i = 89; i >= 0; i--) {
      const targetDate = subDays(new Date(), i);
      const startOfTargetDay = startOfDay(targetDate);
      const endOfTargetDay = endOfDay(targetDate);
      const dateLabel = format(targetDate, 'MMM dd');
      
      // Get actual attendance data for this specific day
      const dayAttendance = await storage.getAttendanceRecords({
        dateFrom: startOfTargetDay,
        dateTo: endOfTargetDay,
        limit: 1000
      });
      
      // Get total active employees
      const totalEmployees = await storage.getEmployeeCount({ isActive: true });
      
      // Get NonBio employees count
      const nonBioCount = await storage.getEmployeeCount({ isActive: true, nonBio: true });
      
      // Calculate metrics for this specific day
      const presentCount = dayAttendance.records.length;
      
      // Calculate complete attendance (both check-in and check-out)
      const completeCount = dayAttendance.records.filter(record => 
        record.checkIn && record.checkOut
      ).length;
      
      // Calculate incomplete attendance (check-in only)
      const incompleteCount = dayAttendance.records.filter(record => 
        record.checkIn && !record.checkOut
      ).length;
      
      // Calculate late arrivals
      const lateCount = dayAttendance.records.filter(record => {
        if (!record.checkIn) return false;
        const checkInTime = new Date(record.checkIn);
        const hours = checkInTime.getHours();
        const minutes = checkInTime.getMinutes();
        const totalMinutes = hours * 60 + minutes;
        // Consider late if after 9:30 AM (9:30 = 570 minutes) - includes grace period
        return totalMinutes > 570;
      }).length;
      
      const totalAttendance = presentCount + nonBioCount;
      const absentCount = Math.max(0, totalEmployees - totalAttendance);
      
      chartData.push({
        date: dateLabel,
        present: presentCount,
        complete: completeCount,
        incomplete: incompleteCount,
        late: lateCount,
        nonBio: nonBioCount,
        absent: absentCount,
        total: totalEmployees,
        attendanceRate: totalEmployees > 0 ? Math.round((totalAttendance / totalEmployees) * 100) : 0
      });
    }
    
    res.json(chartData);
  } catch (error: any) {
    console.error('Error fetching 90-day attendance data:', error);
    res.status(500).json({ error: "Failed to fetch 90-day attendance data" });
  }
}

export async function getDashboardMetrics(req: Request, res: Response) {
  try {
    // Use unified attendance service for consistent calculations
    const metrics = await unifiedAttendanceService.calculateMetrics();
    
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
  }
}

export async function getDepartmentSummary(req: Request, res: Response) {
  try {
    // Get the most recent date with attendance data
    const latestAttendance = await storage.getAttendanceRecords({
      limit: 1,
      page: 1
    });
    
    const targetDate = latestAttendance.records[0]?.date || new Date();
    const startOfTargetDay = startOfDay(targetDate);
    const endOfTargetDay = endOfDay(targetDate);

    // Get all employees - no limit
    const allEmployees = await storage.getEmployees({});
    
    // Get attendance for the most recent data date - no limit
    const todayAttendance = await storage.getAttendanceRecords({
      dateFrom: startOfTargetDay,
      dateTo: endOfTargetDay
    });

    // Group by department
    const departmentStats: { [key: string]: {
      totalEmployees: number;
      present: number;
      late: number;
      absent: number;
      fullDay: number;
      halfDay: number;
    }} = {};

    // Initialize departments from employees
    allEmployees.employees.forEach(employee => {
      const dept = employee.department || 'Unassigned';
      if (!departmentStats[dept]) {
        departmentStats[dept] = {
          totalEmployees: 0,
          present: 0,
          late: 0,
          absent: 0,
          fullDay: 0,
          halfDay: 0
        };
      }
      departmentStats[dept].totalEmployees++;
    });

    // Count attendance by department
    const presentEmployees = new Map<string, { hours: number, late: boolean }>();
    
    // Process all attendance records to calculate work hours per employee
    todayAttendance.records.forEach(record => {
      const employee = allEmployees.employees.find(emp => emp.employeeCode === record.employeeCode);
      if (employee) {
        const dept = employee.department || 'Unassigned';
        
        if (!presentEmployees.has(record.employeeCode)) {
          // Use hoursWorked field instead of totalHours
          const hours = parseFloat(record.hoursWorked?.toString() || '0');
          presentEmployees.set(record.employeeCode, { 
            hours: hours, 
            late: false 
          });
          
          // Check if late
          if (record.punchTime) {
            const punchHour = new Date(record.punchTime).getHours();
            if (record.status === 'check_in' && punchHour > 9) {
              presentEmployees.get(record.employeeCode)!.late = true;
            }
          }
        }
      }
    });
    
    // Now count by department with full/half day distinction
    presentEmployees.forEach((data, employeeCode) => {
      const employee = allEmployees.employees.find(emp => emp.employeeCode === employeeCode);
      if (employee) {
        const dept = employee.department || 'Unassigned';
        departmentStats[dept].present++;
        
        if (data.late) {
          departmentStats[dept].late++;
        }
        
        // Check if full day (8 hours or more) or half day (less than 8 hours)
        if (data.hours >= 8) {
          departmentStats[dept].fullDay++;
        } else {
          departmentStats[dept].halfDay++;
        }
      }
    });

    // Calculate absent counts and format response
    const departmentSummary = Object.keys(departmentStats)
      .filter(department => department !== 'MIGRATED TO FORMER') // Exclude MIGRATED TO FORMER
      .map(department => {
        const stats = departmentStats[department];
        stats.absent = stats.totalEmployees - stats.present;
        
        return {
          department,
          totalEmployees: stats.totalEmployees,
          present: stats.present,
          late: stats.late,
          absent: stats.absent,
          fullDay: stats.fullDay,
          halfDay: stats.halfDay,
          attendanceRate: stats.totalEmployees > 0 ? (stats.present / stats.totalEmployees) * 100 : 0
        };
      });

    res.json(departmentSummary);
  } catch (error) {
    console.error('Error fetching department summary:', error);
    res.status(500).json({ error: 'Failed to fetch department summary' });
  }
}

export async function getAttendanceTrends(req: Request, res: Response) {
  try {
    const today = new Date();
    const sevenDaysAgo = subDays(today, 7);
    
    const trends = [];
    
    for (let i = 0; i < 7; i++) {
      const currentDate = subDays(today, i);
      const startOfCurrentDay = startOfDay(currentDate);
      const endOfCurrentDay = endOfDay(currentDate);
      
      // Get attendance for this day - no limit, get all records
      const dayAttendance = await storage.getAttendanceRecords({
        dateFrom: startOfCurrentDay,
        dateTo: endOfCurrentDay
      });
      
      // Count unique employees who were present
      const presentEmployees = new Set();
      let lateCount = 0;
      
      dayAttendance.records.forEach(record => {
        presentEmployees.add(record.employeeCode);
        
        // Check if late
        if (record.punchTime) {
          const punchHour = new Date(record.punchTime).getHours();
          if (record.status === 'check_in' && punchHour > 9) {
            lateCount++;
          }
        }
      });
      
      // Get total employees (assuming consistent workforce)
      const totalEmployees = await storage.getDashboardMetrics();
      const present = presentEmployees.size;
      const absent = totalEmployees.totalEmployees - present;
      
      trends.unshift({
        date: format(currentDate, 'yyyy-MM-dd'),
        present,
        absent,
        late: lateCount
      });
    }
    
    res.json(trends);
  } catch (error) {
    console.error('Error fetching attendance trends:', error);
    res.status(500).json({ error: 'Failed to fetch attendance trends' });
  }
}

export async function get30DayTrends(req: Request, res: Response) {
  try {
    const trends = [];
    
    // Get last 30 days of attendance data
    for (let i = 29; i >= 0; i--) {
      const targetDate = subDays(new Date(), i);
      const startOfTargetDay = startOfDay(targetDate);
      const endOfTargetDay = endOfDay(targetDate);
      
      // Get actual attendance data for this specific day
      const dayAttendance = await storage.getAttendanceRecords({
        dateFrom: startOfTargetDay,
        dateTo: endOfTargetDay,
        limit: 1000
      });
      
      // Get total active employees
      const totalEmployees = await storage.getEmployeeCount({ isActive: true });
      
      // Get NonBio employees count
      const nonBioCount = await storage.getEmployeeCount({ isActive: true, nonBio: true });
      
      // Calculate metrics for this specific day
      const totalPunchIns = dayAttendance.records.length;
      
      // Calculate late arrivals (after 9:30 AM with grace period)
      const totalLate = dayAttendance.records.filter(record => {
        if (!record.checkIn) return false;
        const checkInTime = new Date(record.checkIn);
        const hours = checkInTime.getHours();
        const minutes = checkInTime.getMinutes();
        const totalMinutes = hours * 60 + minutes;
        return totalMinutes > 570; // After 9:30 AM
      }).length;
      
      // Calculate complete attendance (both in and out exist)
      const completeAttendance = dayAttendance.records.filter(record => 
        record.checkIn && record.checkOut
      ).length;
      
      // Calculate total attendance (punch ins + NonBio)
      const totalAttendance = totalPunchIns + nonBioCount;
      
      // Calculate absentees
      const totalAbsent = Math.max(0, totalEmployees - totalAttendance);
      
      trends.push({
        date: format(targetDate, 'MM/dd'),
        totalPunchIns,
        totalLate,
        completeAttendance,
        totalAbsent
      });
    }
    
    res.json(trends);
  } catch (error: any) {
    console.error('Error fetching 30-day trends:', error);
    res.status(500).json({ error: "Failed to fetch 30-day trends" });
  }
}

export async function getMonthlyTrends(req: Request, res: Response) {
  try {
    const trends = [];
    
    // Get last 30 days of attendance data for monthly chart
    for (let i = 29; i >= 0; i--) {
      const targetDate = subDays(new Date(), i);
      const startOfTargetDay = startOfDay(targetDate);
      const endOfTargetDay = endOfDay(targetDate);
      
      // Get actual attendance data for this specific day
      const dayAttendance = await storage.getAttendanceRecords({
        dateFrom: startOfTargetDay,
        dateTo: endOfTargetDay,
        limit: 1000
      });
      
      // Get total active employees
      const totalEmployees = await storage.getEmployeeCount({ isActive: true });
      
      // Get NonBio employees count
      const nonBioCount = await storage.getEmployeeCount({ isActive: true, nonBio: true });
      
      // Calculate metrics for this specific day
      const totalPunchIns = dayAttendance.records.length;
      
      // Calculate late arrivals (after 9:30 AM with grace period)
      const totalLate = dayAttendance.records.filter(record => {
        if (!record.checkIn) return false;
        const checkInTime = new Date(record.checkIn);
        const hours = checkInTime.getHours();
        const minutes = checkInTime.getMinutes();
        const totalMinutes = hours * 60 + minutes;
        return totalMinutes > 570; // After 9:30 AM
      }).length;
      
      // Calculate complete attendance (both in and out exist)
      const completeAttendance = dayAttendance.records.filter(record => 
        record.checkIn && record.checkOut
      ).length;
      
      // Calculate total attendance (punch ins + NonBio)
      const totalAttendance = totalPunchIns + nonBioCount;
      
      // Calculate absentees
      const totalAbsent = Math.max(0, totalEmployees - totalAttendance);
      
      trends.push({
        date: format(targetDate, 'MM/dd'),
        totalAttendance,
        completeAttendance,
        totalAbsent,
        totalLate
      });
    }
    
    res.json(trends);
  } catch (error: any) {
    console.error('Error fetching monthly trends:', error);
    res.status(500).json({ error: "Failed to fetch monthly trends" });
  }
}

export async function getHourlyActivity(req: Request, res: Response) {
  try {
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);
    
    // Get today's attendance records - no limit, get all records
    const todayAttendance = await storage.getAttendanceRecords({
      dateFrom: startOfToday,
      dateTo: endOfToday
    });
    
    // Initialize hourly data (6 AM to 10 PM)
    const hourlyData: { [key: string]: { checkIns: number; checkOuts: number } } = {};
    
    for (let hour = 6; hour <= 22; hour++) {
      const hourStr = hour.toString().padStart(2, '0') + ':00';
      hourlyData[hourStr] = { checkIns: 0, checkOuts: 0 };
    }
    
    // Count check-ins and check-outs by hour
    todayAttendance.records.forEach(record => {
      if (record.punchTime) {
        const punchDate = new Date(record.punchTime);
        const hour = punchDate.getHours();
        
        if (hour >= 6 && hour <= 22) {
          const hourStr = hour.toString().padStart(2, '0') + ':00';
          
          if (record.status === 'check_in') {
            hourlyData[hourStr].checkIns++;
          } else if (record.status === 'check_out') {
            hourlyData[hourStr].checkOuts++;
          }
        }
      }
    });
    
    // Convert to array format for charts
    const hourlyActivity = Object.keys(hourlyData).map(hour => ({
      hour,
      checkIns: hourlyData[hour].checkIns,
      checkOuts: hourlyData[hour].checkOuts
    }));
    
    res.json(hourlyActivity);
  } catch (error) {
    console.error('Error fetching hourly activity:', error);
    res.status(500).json({ error: 'Failed to fetch hourly activity' });
  }
}

export async function getIncompleteAttendance(req: Request, res: Response) {
  try {
    const { date: queryDate } = req.query;
    const targetDate = queryDate ? new Date(queryDate as string) : new Date();
    
    const startOfTargetDay = startOfDay(targetDate);
    const endOfTargetDay = endOfDay(targetDate);
    
    // Get all attendance records for the day - no limit
    const dayAttendance = await storage.getAttendanceRecords({
      dateFrom: startOfTargetDay,
      dateTo: endOfTargetDay
    });
    
    // Group by employee to find incomplete attendance
    const employeeRecords: Map<string, any[]> = new Map();
    
    dayAttendance.records.forEach(record => {
      const empCode = record.employeeCode;
      if (!employeeRecords.has(empCode)) {
        employeeRecords.set(empCode, []);
      }
      employeeRecords.get(empCode)!.push(record);
    });
    
    // Find employees with only check-in (missing check-out)
    const incompleteAttendance = [];
    
    for (const [empCode, records] of employeeRecords) {
      const hasCheckIn = records.some(r => r.status === 'check_in');
      const hasCheckOut = records.some(r => r.status === 'check_out');
      
      if (hasCheckIn && !hasCheckOut) {
        const checkInRecord = records.find(r => r.status === 'check_in');
        const employee = await storage.getEmployeeByCode(empCode);
        
        incompleteAttendance.push({
          employeeCode: empCode,
          employeeName: employee ? `${employee.firstName} ${employee.lastName}` : empCode,
          department: employee?.department || 'Unknown',
          checkInTime: checkInRecord?.punchTime,
          hoursElapsed: checkInRecord?.punchTime 
            ? Math.floor((new Date().getTime() - new Date(checkInRecord.punchTime).getTime()) / (1000 * 60 * 60))
            : 0
        });
      }
    }
    
    res.json(incompleteAttendance);
  } catch (error) {
    console.error('Error fetching incomplete attendance:', error);
    res.status(500).json({ error: 'Failed to fetch incomplete attendance' });
  }
}

export async function getLateComers(req: Request, res: Response) {
  try {
    const { date: queryDate } = req.query;
    const targetDate = queryDate ? new Date(queryDate as string) : new Date();
    
    const startOfTargetDay = startOfDay(targetDate);
    const endOfTargetDay = endOfDay(targetDate);
    
    // Get attendance records for the day - no limit
    const dayAttendance = await storage.getAttendanceRecords({
      dateFrom: startOfTargetDay,
      dateTo: endOfTargetDay,
      status: 'check_in'
    });
    
    // Get all employees with their shift information
    const employees = await storage.getEmployees({ limit: 1000 });
    const employeeMap = new Map(employees.employees.map(e => [e.employeeCode, e]));
    
    // Find late comers based on their assigned shifts
    const lateComers = [];
    
    for (const record of dayAttendance.records) {
      if (record.punchTime) {
        const punchTime = new Date(record.punchTime);
        const employee = employeeMap.get(record.employeeCode);
        
        if (employee && employee.shiftId) {
          // Get the employee's shift details
          const shift = await storage.getShift(employee.shiftId);
          
          if (shift) {
            // Calculate expected start time
            const expectedStartHour = shift.startHour;
            const expectedStartMinute = shift.startMinute || 0;
            
            // Calculate actual punch time
            const punchHour = punchTime.getHours();
            const punchMinute = punchTime.getMinutes();
            
            // Calculate minutes late
            const expectedMinutes = expectedStartHour * 60 + expectedStartMinute;
            const actualMinutes = punchHour * 60 + punchMinute;
            const minutesLate = actualMinutes - expectedMinutes;
            
            // Consider late if more than 5 minutes after shift start
            if (minutesLate > 5) {
              lateComers.push({
                employeeCode: record.employeeCode,
                employeeName: `${employee.firstName} ${employee.lastName}`,
                department: employee.department || 'Unknown',
                shiftName: shift.shiftName,
                expectedTime: `${expectedStartHour.toString().padStart(2, '0')}:${expectedStartMinute.toString().padStart(2, '0')}`,
                checkInTime: punchTime,
                minutesLate,
                formattedTime: format(punchTime, 'HH:mm')
              });
            }
          }
        } else if (employee) {
          // For employees without shifts, use default 9 AM threshold
          const punchHour = punchTime.getHours();
          const punchMinute = punchTime.getMinutes();
          
          if (punchHour > 9 || (punchHour === 9 && punchMinute > 5)) {
            const minutesLate = (punchHour - 9) * 60 + punchMinute;
            
            lateComers.push({
              employeeCode: record.employeeCode,
              employeeName: `${employee.firstName} ${employee.lastName}`,
              department: employee.department || 'Unknown',
              shiftName: 'No Shift',
              expectedTime: '09:00',
              checkInTime: punchTime,
              minutesLate,
              formattedTime: format(punchTime, 'HH:mm')
            });
          }
        }
      }
    }
    
    // Sort by how late they were
    lateComers.sort((a, b) => b.minutesLate - a.minutesLate);
    
    res.json(lateComers);
  } catch (error) {
    console.error('Error fetching late comers:', error);
    res.status(500).json({ error: 'Failed to fetch late comers' });
  }
}

export async function getPresentToday(req: Request, res: Response) {
  try {
    // Use the most recent date with data (July 9, 2025)
    const targetDate = new Date('2025-07-09');
    
    // First, get all attendance records for July 9, 2025 with check-in times
    const allRecords = await db
      .select({
        id: attendanceRecords.id,
        employeeCode: attendanceRecords.employeeCode,
        checkIn: attendanceRecords.checkIn,
        checkOut: attendanceRecords.checkOut,
        date: attendanceRecords.date,
        firstName: employeeRecords.firstName,
        lastName: employeeRecords.lastName,
        department: employeeRecords.department
      })
      .from(attendanceRecords)
      .leftJoin(employeeRecords, eq(attendanceRecords.employeeCode, employeeRecords.employeeCode))
      .where(
        and(
          // Has check-in time
          isNotNull(attendanceRecords.checkIn),
          // From the most recent date with data (July 9, 2025)
          sql`DATE(${attendanceRecords.date}) = '2025-07-09'`
        )
      )
      .orderBy(attendanceRecords.checkIn);
    
    console.log(`Found ${allRecords.length} attendance records with check-in for July 9, 2025`);
    
    // Group by employee code to find employees who are still present
    const employeeStatus = new Map<string, {
      hasCheckIn: boolean;
      hasCheckOut: boolean;
      latestCheckIn: Date | null;
      latestCheckOut: Date | null;
      record: any;
    }>();
    
    // Process all records to determine current status for each employee
    allRecords.forEach(record => {
      const empCode = record.employeeCode;
      const existing = employeeStatus.get(empCode);
      
      if (!existing) {
        employeeStatus.set(empCode, {
          hasCheckIn: !!record.checkIn,
          hasCheckOut: !!record.checkOut,
          latestCheckIn: record.checkIn ? new Date(record.checkIn) : null,
          latestCheckOut: record.checkOut ? new Date(record.checkOut) : null,
          record
        });
      } else {
        // Update with latest check-in and check-out times
        if (record.checkIn && (!existing.latestCheckIn || new Date(record.checkIn) > existing.latestCheckIn)) {
          existing.latestCheckIn = new Date(record.checkIn);
          existing.hasCheckIn = true;
          existing.record = record; // Keep the record with the latest check-in
        }
        if (record.checkOut && (!existing.latestCheckOut || new Date(record.checkOut) > existing.latestCheckOut)) {
          existing.latestCheckOut = new Date(record.checkOut);
          existing.hasCheckOut = true;
        }
      }
    });
    
    // Filter employees who are currently present
    const presentEmployees = Array.from(employeeStatus.entries())
      .filter(([empCode, status]) => {
        // Employee is present if they have checked in and either:
        // 1. Never checked out, OR
        // 2. Their latest check-in is after their latest check-out, OR
        // 3. The time difference between check-in and check-out is significant (> 1 hour)
        if (!status.hasCheckIn) return false;
        
        if (!status.hasCheckOut) return true; // Has check-in but no check-out
        
        // If both check-in and check-out exist, compare them
        if (status.latestCheckIn && status.latestCheckOut) {
          // If check-in is after check-out, employee is present
          if (status.latestCheckIn > status.latestCheckOut) {
            return true;
          }
          
          // If check-out is after check-in, check the time difference
          // If the difference is less than 1 hour, it's likely a quick punch (not really present)
          // If the difference is more than 1 hour, they were actually present and checked out
          const timeDiff = status.latestCheckOut.getTime() - status.latestCheckIn.getTime();
          const oneHourInMs = 60 * 60 * 1000;
          
          // If they checked out within 1 hour of checking in, they're not really present
          if (timeDiff < oneHourInMs) {
            return false;
          }
          
          // If they checked out after more than 1 hour, they completed their work and are not present
          return false;
        }
        
        return true; // Default to present if check-in exists
      })
      .map(([empCode, status]) => {
        const record = status.record;
        const checkInTime = status.latestCheckIn!;
        const now = new Date();
        const hoursPresent = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
        
        // Calculate time since punch in
        const timeDiff = now.getTime() - checkInTime.getTime();
        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const timeSincePunchIn = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        
        // Determine status based on hours present
        let empStatus: 'normal' | 'overtime' | 'extended' = 'normal';
        if (hoursPresent > 12) {
          empStatus = 'extended';
        } else if (hoursPresent > 8) {
          empStatus = 'overtime';
        }
        
        return {
          id: record.id.toString(),
          employeeCode: record.employeeCode,
          employeeName: record.firstName && record.lastName 
            ? `${record.firstName} ${record.lastName}` 
            : record.employeeCode,
          department: record.department || 'Unknown',
          checkInTime: checkInTime,
          timeSincePunchIn,
          hoursPresent: Math.round(hoursPresent * 100) / 100,
          isOvertime: hoursPresent > 8,
          status: empStatus
        };
      })
      .sort((a, b) => new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime()); // Sort by check-in time
    
    res.json({ currentlyPresent: presentEmployees });
  } catch (error) {
    console.error('Error fetching today live activity:', error);
    res.status(500).json({ error: 'Failed to fetch today live activity' });
  }
}

export async function terminateAttendance(req: Request, res: Response) {
  try {
    const { employeeCode, terminatedBy } = req.body;
    
    if (!employeeCode || !terminatedBy) {
      return res.status(400).json({ error: 'Employee code and terminated by are required' });
    }
    
    const now = new Date();
    
    // Get the employee's check-in time for today
    const startOfToday = startOfDay(now);
    const endOfToday = endOfDay(now);
    
    const todayRecords = await storage.getAttendanceRecords({
      dateFrom: startOfToday,
      dateTo: endOfToday,
      employeeCode,
      status: 'check_in'
    });
    
    if (todayRecords.records.length === 0) {
      return res.status(400).json({ error: 'No check-in found for this employee today' });
    }
    
    // Get the first check-in of the day
    const checkInRecord = todayRecords.records[0];
    const checkInTime = new Date(checkInRecord.punchTime);
    
    // Calculate forced out time (check-in + 7.5 hours)
    const forcedOutTime = addMinutes(addHours(checkInTime, 7), 30);
    
    // Create terminate action record
    await storage.createTerminateAction({
      time: now,
      empCode: employeeCode,
      terminatedBy,
      forcedOut: forcedOutTime
    });
    
    // Create a check-out record at the forced out time
    await storage.createAttendanceRecord({
      employeeCode,
      punchTime: forcedOutTime,
      status: 'check_out',
      deviceName: 'System',
      location: 'Forced Out',
      verifyMode: 0,
      workCode: 0
    });
    
    res.json({ 
      success: true,
      message: 'Attendance terminated successfully',
      forcedOutTime
    });
  } catch (error) {
    console.error('Error terminating attendance:', error);
    res.status(500).json({ error: 'Failed to terminate attendance' });
  }
}

export async function getYesterdayAttendance(req: Request, res: Response) {
  try {
    // Import the unified daily attendance calculator
    const { DailyAttendanceCalculator } = await import('../services/dailyAttendanceCalculator');
    
    // Try to get yesterday's data first
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    let result = await DailyAttendanceCalculator.calculateForDate(yesterday);
    
    // If no data for yesterday, find the most recent date with data
    if (result.totalPunchIn === 0) {
      console.log('No data found for yesterday, finding most recent date with data...');
      
      // Find the most recent date with attendance data
      const mostRecentRecord = await db
        .select({ date: attendanceRecords.date })
        .from(attendanceRecords)
        .orderBy(desc(attendanceRecords.date))
        .limit(1);
      
      if (mostRecentRecord.length === 0) {
        return res.status(404).json({ error: 'No attendance data found' });
      }
      
      console.log('Using most recent date with data:', format(mostRecentRecord[0].date, 'yyyy-MM-dd'));
      
      // Calculate for the most recent date
      result = await DailyAttendanceCalculator.calculateForDate(mostRecentRecord[0].date);
    }
    
    // Transform result to match expected API response format
    const response = {
      date: result.date,
      complete: result.completedShifts,
      incomplete: result.incompleteShifts,
      totalActiveEmployees: result.totalActiveEmployees,
      nonBio: result.nonBioEmployees,
      totalAttendance: result.totalAttendance,
      totalTerminated: 0, // Not tracked in new calculator
      totalPunchOuts: result.totalPunchOut,
      distinctPunchIns: result.totalPunchIn,
      presentThatDay: result.presentToday,
      absent: result.absentToday,
      total: result.totalActiveEmployees // Keep for backward compatibility
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching yesterday attendance:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({ error: 'Failed to fetch yesterday attendance' });
  }
}

export async function getTodayLiveActivity(req: Request, res: Response) {
  try {
    const today = new Date();
    
    // Start of day (00:00 PKT)
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // Get total punch-ins since 00:00 PKT
    const totalPunchInsResult = await db
      .select({ 
        count: sql<number>`count(*)` 
      })
      .from(attendanceRecords)
      .where(
        and(
          gte(attendanceRecords.date, startOfDay),
          lte(attendanceRecords.date, endOfDay),
          isNotNull(attendanceRecords.checkIn)
        )
      );
    
    const totalPunchIns = totalPunchInsResult[0]?.count || 0;

    // Get total punch-outs since 00:00 PKT
    const totalPunchOutsResult = await db
      .select({ 
        count: sql<number>`count(*)` 
      })
      .from(attendanceRecords)
      .where(
        and(
          gte(attendanceRecords.date, startOfDay),
          lte(attendanceRecords.date, endOfDay),
          isNotNull(attendanceRecords.checkOut)
        )
      );
    
    const totalPunchOuts = totalPunchOutsResult[0]?.count || 0;

    // Get total terminated records for today (system automatic + manual admin terminated)
    const totalTerminatedResult = await db
      .select({ 
        count: sql<number>`count(distinct ${attendanceRecords.employeeCode})` 
      })
      .from(attendanceRecords)
      .where(
        and(
          gte(attendanceRecords.date, startOfDay),
          lte(attendanceRecords.date, endOfDay),
          or(
            eq(attendanceRecords.status, 'auto_punchout'),
            eq(attendanceRecords.status, 'admin_terminated')
          )
        )
      );
    
    const totalTerminated = totalTerminatedResult[0]?.count || 0;

    // Calculate Present Today using new formula: Total Punch In - Total Punch Out - Total Terminated
    const presentEmployees = Math.max(0, totalPunchIns - totalPunchOuts - totalTerminated);

    // Get exclusions (NonBio employees count)
    const exclusionsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(employeeRecords)
      .where(
        and(
          eq(employeeRecords.isActive, true),
          eq(employeeRecords.nonBio, true),
          ne(employeeRecords.firstName, 'NOC')
        )
      );
    
    const exclusions = exclusionsResult[0]?.count || 0;

    // Get total active employees
    const totalEmployeesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(employeeRecords)
      .where(
        and(
          eq(employeeRecords.isActive, true),
          ne(employeeRecords.firstName, 'NOC')
        )
      );
    
    const totalEmployees = totalEmployeesResult[0]?.count || 0;

    // Calculate absent (total - present - exclusions)
    const absent = Math.max(0, totalEmployees - presentEmployees - exclusions);

    // Get detailed recent activity from storage
    const recentActivity = await storage.getLiveActivity(20);
    
    const formattedRecentActivity = recentActivity.map(activity => ({
      time: activity.timestamp,
      empCode: activity.empCode,
      name: activity.name,
      shiftAssigned: activity.shiftAssigned || 'No Shift',
      recordType: activity.recordType,
      timingDifference: activity.timingDifference || '--:--',
      observation: activity.timingDifference === 'PSC' ? 'PSC' : 
                   activity.isEarlyOrLate === 'late' ? 'LATE' :
                   activity.isEarlyOrLate === 'early' ? 'EARLY' :
                   activity.isEarlyOrLate === 'grace' ? 'GRACE' : 'OK'
    }));

    const pakistanTime = new Date();
    const result = {
      date: format(today, 'yyyy-MM-dd'),
      refreshTime: format(pakistanTime, 'HH:mm:ss'),
      timezone: 'PKT',
      timestamp: pakistanTime.toISOString(),
      totalPunchIns: Number(totalPunchIns),
      totalPunchOuts: Number(totalPunchOuts),
      totalTerminated: Number(totalTerminated),
      currentlyPresent: Number(presentEmployees),
      exclusions: Number(exclusions),
      absent: Number(absent),
      totalEmployees: Number(totalEmployees),
      recentActivity: formattedRecentActivity
    };

    res.json(result);
  } catch (error) {
    console.error('Error getting today live activity:', error);
    res.status(500).json({ error: 'Failed to get today live activity' });
  }
}

export async function getDrillDownData(req: Request, res: Response) {
  try {
    const { metric, date } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();
    const startOfTargetDay = startOfDay(targetDate);
    const endOfTargetDay = endOfDay(targetDate);

    let data = [];

    if (metric === 'total') {
      // Get all active employees
      const employees = await storage.getEmployees({ isActive: true, limit: 1000 });
      data = employees.employees.map(emp => ({
        employeeCode: emp.employeeCode,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        department: emp.department || 'Unknown',
        status: emp.isActive ? 'Active' : 'Inactive'
      }));
    } else if (metric === 'present') {
      // Get employees who checked in today and haven't checked out
      // But only if they checked in within the last 12 hours
      const attendanceData = await storage.getAttendanceRecords({
        dateFrom: startOfTargetDay,
        dateTo: endOfTargetDay,
        limit: 1000
      });
      
      // Group by employee to get first check-in and last check-out
      const employeeMap = new Map();
      attendanceData.records.forEach(record => {
        if (record.employeeCode) {
          if (!employeeMap.has(record.employeeCode)) {
            employeeMap.set(record.employeeCode, {
              employeeCode: record.employeeCode,
              employeeName: record.employeeName || record.employeeCode,
              department: 'Unknown',
              checkIn: null,
              checkOut: null,
              status: 'Present'
            });
          }
          
          const emp = employeeMap.get(record.employeeCode);
          if (record.status === 'check_in' && (!emp.checkIn || new Date(record.punchTime) < new Date(emp.checkIn))) {
            emp.checkIn = record.punchTime;
          }
          if (record.status === 'check_out' && (!emp.checkOut || new Date(record.punchTime) > new Date(emp.checkOut))) {
            emp.checkOut = record.punchTime;
          }
        }
      });
      
      // Get employee details for department info
      const employees = await storage.getEmployees({ limit: 1000 });
      const empDetailsMap = new Map(employees.employees.map(e => [e.employeeCode, e]));
      
      // Filter only employees who have checked in but NOT checked out
      data = Array.from(employeeMap.values())
        .filter(emp => emp.checkIn && !emp.checkOut)
        .map(emp => {
          const details = empDetailsMap.get(emp.employeeCode);
          const checkInTime = new Date(emp.checkIn);
          const now = new Date();
          let hoursWorked = Math.round((now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60) * 10) / 10;
          
          // Cap at 12 hours to handle forgotten checkouts
          if (hoursWorked > 12) {
            hoursWorked = 12;
          }
          
          return {
            ...emp,
            employeeName: details ? `${details.firstName} ${details.lastName}` : emp.employeeName,
            department: details?.department || 'Unknown',
            hoursWorked,
            punchInTime: checkInTime.toISOString(),
            timeSincePunchIn: formatTimeSincePunchIn(now.getTime() - checkInTime.getTime())
          };
        });
    } else if (metric === 'late') {
      // Get late arrivals based on shift assignments
      const attendanceData = await storage.getAttendanceRecords({
        dateFrom: startOfTargetDay,
        dateTo: endOfTargetDay,
        status: 'check_in',
        limit: 1000
      });
      
      // Get all employees with their shift information
      const employees = await storage.getEmployees({ limit: 1000 });
      const empDetailsMap = new Map(employees.employees.map(e => [e.employeeCode, e]));
      
      // Find late employees based on shifts
      const processedEmployees = new Set<string>();
      
      for (const record of attendanceData.records) {
        if (record.punchTime && !processedEmployees.has(record.employeeCode)) {
          const checkInTime = new Date(record.punchTime);
          const employee = empDetailsMap.get(record.employeeCode);
          
          if (employee && employee.shiftId) {
            const shift = await storage.getShift(employee.shiftId);
            
            if (shift) {
              const expectedStartHour = shift.startHour;
              const expectedStartMinute = shift.startMinute || 0;
              const punchHour = checkInTime.getHours();
              const punchMinute = checkInTime.getMinutes();
              
              const expectedMinutes = expectedStartHour * 60 + expectedStartMinute;
              const actualMinutes = punchHour * 60 + punchMinute;
              const minutesLate = actualMinutes - expectedMinutes;
              
              if (minutesLate > 5) {
                data.push({
                  employeeCode: record.employeeCode,
                  employeeName: `${employee.firstName} ${employee.lastName}`,
                  department: employee.department || 'Unknown',
                  shiftName: shift.shiftName,
                  expectedTime: `${expectedStartHour.toString().padStart(2, '0')}:${expectedStartMinute.toString().padStart(2, '0')}`,
                  checkIn: record.punchTime,
                  checkOut: null,
                  hoursWorked: 0,
                  status: 'Late',
                  minutesLate
                });
                processedEmployees.add(record.employeeCode);
              }
            }
          } else if (employee) {
            // For employees without shifts, use default 9 AM threshold
            const punchHour = checkInTime.getHours();
            const punchMinute = checkInTime.getMinutes();
            
            if (punchHour > 9 || (punchHour === 9 && punchMinute > 5)) {
              const minutesLate = (punchHour - 9) * 60 + punchMinute;
              
              data.push({
                employeeCode: record.employeeCode,
                employeeName: `${employee.firstName} ${employee.lastName}`,
                department: employee.department || 'Unknown',
                shiftName: 'No Shift',
                expectedTime: '09:00',
                checkIn: record.punchTime,
                checkOut: null,
                hoursWorked: 0,
                status: 'Late',
                minutesLate
              });
              processedEmployees.add(record.employeeCode);
            }
          }
        }
      }
    } else if (metric === 'absent') {
      // For now, we can't determine who is truly "absent" vs "not scheduled"
      // without shift scheduling data. Return empty array to avoid misleading counts.
      data = [];
    } else if (metric === 'completed') {
      // Get employees who have both checked in AND checked out today
      const attendanceData = await storage.getAttendanceRecords({
        dateFrom: startOfTargetDay,
        dateTo: endOfTargetDay,
        limit: 1000
      });
      
      // Group by employee to find completed shifts
      const employeeMap = new Map();
      attendanceData.records.forEach(record => {
        if (record.employeeCode) {
          if (!employeeMap.has(record.employeeCode)) {
            employeeMap.set(record.employeeCode, {
              employeeCode: record.employeeCode,
              employeeName: record.employeeName || record.employeeCode,
              department: 'Unknown',
              checkIn: null,
              checkOut: null,
              hoursWorked: 0,
              status: 'Completed'
            });
          }
          
          const emp = employeeMap.get(record.employeeCode);
          if (record.status === 'check_in' && (!emp.checkIn || new Date(record.punchTime) < new Date(emp.checkIn))) {
            emp.checkIn = record.punchTime;
          }
          if (record.status === 'check_out' && (!emp.checkOut || new Date(record.punchTime) > new Date(emp.checkOut))) {
            emp.checkOut = record.punchTime;
          }
        }
      });
      
      // Get employee details for department info
      const employees = await storage.getEmployees({ limit: 1000 });
      const empDetailsMap = new Map(employees.employees.map(e => [e.employeeCode, e]));
      
      // Filter only employees who have both check-in AND check-out
      data = Array.from(employeeMap.values())
        .filter(emp => emp.checkIn && emp.checkOut)
        .map(emp => {
          const details = empDetailsMap.get(emp.employeeCode);
          const checkInTime = new Date(emp.checkIn);
          const checkOutTime = new Date(emp.checkOut);
          const hoursWorked = Math.round((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60) * 10) / 10;
          
          return {
            ...emp,
            employeeName: details ? `${details.firstName} ${details.lastName}` : emp.employeeName,
            department: details?.department || 'Unknown',
            hoursWorked
          };
        });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching drill-down data:', error);
    res.status(500).json({ error: 'Failed to fetch drill-down data' });
  }
}

export async function forcePunchOut(req: Request, res: Response) {
  try {
    const { employeeId, employeeCode, employeeName } = req.body;
    
    if (!employeeId) {
      return res.status(400).json({ error: "Employee ID is required" });
    }

    // Find the employee's active attendance record (checked in but not checked out)
    const today = new Date();
    const startDate = startOfDay(today);
    const endDate = endOfDay(today);
    
    const activeRecord = await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeId, employeeId),
          gte(attendanceRecords.checkIn, startDate),
          lte(attendanceRecords.checkIn, endDate),
          isNull(attendanceRecords.checkOut)
        )
      )
      .limit(1);

    if (!activeRecord || activeRecord.length === 0) {
      return res.status(404).json({ error: "No active attendance record found for this employee" });
    }

    const recordToUpdate = activeRecord[0];
    const now = new Date();
    
    // Update the attendance record with forced punch out
    await db
      .update(attendanceRecords)
      .set({
        checkOut: now,
        hoursWorked: sql`EXTRACT(EPOCH FROM ${now} - ${recordToUpdate.checkIn}) / 3600`,
        status: 'forced_out',
        updatedAt: now
      })
      .where(eq(attendanceRecords.id, recordToUpdate.id));

    // Create an action record for audit trail
    const userId = (req.session as any).userId;
    const userRole = (req.session as any).userRole || 'admin';
    const userName = (req.session as any).username || 'System';
    
    await storage.createActionRecord({
      userId: userId || null,
      userType: userRole,
      userName: userName,
      command: 'forced_punch_out',
      targetType: 'attendance',
      targetId: recordToUpdate.id.toString(),
      targetName: `${employeeName} (${employeeCode})`,
      parameters: {
        employeeId,
        employeeCode,
        employeeName,
        checkIn: recordToUpdate.checkIn,
        forcedCheckOut: now
      },
      result: 'success',
      resultMessage: `Successfully forced punch out for ${employeeName} at ${format(now, 'HH:mm:ss')}`,
      ipAddress: req.ip || req.connection.remoteAddress || null,
      userAgent: req.headers['user-agent'] || null
    });

    res.json({
      success: true,
      message: `Employee ${employeeName} has been successfully punched out`,
      checkOut: now,
      recordId: recordToUpdate.id
    });
  } catch (error) {
    console.error('Error in forcePunchOut:', error);
    
    // Log failed attempt
    const userId = (req.session as any).userId;
    const userRole = (req.session as any).userRole || 'admin';
    const userName = (req.session as any).username || 'System';
    
    await storage.createActionRecord({
      userId: userId || null,
      userType: userRole,
      userName: userName,
      command: 'forced_punch_out',
      targetType: 'attendance',
      targetId: req.body.employeeId?.toString() || 'unknown',
      targetName: `${req.body.employeeName || 'Unknown'} (${req.body.employeeCode || 'Unknown'})`,
      parameters: req.body,
      result: 'failed',
      resultMessage: error instanceof Error ? error.message : 'Unknown error occurred',
      ipAddress: req.ip || req.connection.remoteAddress || null,
      userAgent: req.headers['user-agent'] || null
    });
    
    res.status(500).json({
      error: "Failed to process forced punch out",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function getDataAvailabilityHeatmap(req: Request, res: Response) {
  try {
    const { getCurrentTimezone, getCurrentSystemDate, getSystemDayBounds } = await import('../config/timezone');
    const currentSystemDate = getCurrentSystemDate();
    
    // Get data for the last 90 days (today first, going backwards)
    const heatmapData = [];
    
    for (let i = 0; i < 90; i++) {
      const targetDate = new Date(currentSystemDate);
      targetDate.setDate(targetDate.getDate() - i);
      
      const targetDateStr = targetDate.toISOString().split('T')[0];
      const { start: startOfTargetDay, end: endOfTargetDay } = getSystemDayBounds(targetDateStr);
      
      // Get raw BioTime sync data count for this day (actual punch records from API)
      const dayBiotimeData = await storage.getBiotimeSyncData({
        dateFrom: startOfTargetDay,
        dateTo: endOfTargetDay,
        limit: 10000 // High limit to get all records
      });
      
      // Format date for display
      const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'short' });
      const monthDay = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dayOfWeek = targetDate.getDay();
      const isSunday = dayOfWeek === 0;
      
      heatmapData.push({
        date: targetDateStr,
        dayName,
        monthDay,
        count: dayBiotimeData.records.length, // Raw punch records from BioTime API
        fullDate: targetDate.toISOString(),
        isSunday: isSunday
      });
    }
    
    // Calculate statistics for tier assessment
    const counts = heatmapData.map(d => d.count);
    const totalRecords = counts.reduce((sum, count) => sum + count, 0);
    const averageRecords = totalRecords / counts.length;
    
    // Separate weekday and weekend data for realistic baselines
    const weekdayData = heatmapData.filter(day => !day.isSunday && new Date(day.date).getDay() !== 6); // Mon-Fri
    const saturdayData = heatmapData.filter(day => new Date(day.date).getDay() === 6); // Saturday
    const sundayData = heatmapData.filter(day => day.isSunday); // Sunday
    
    const weekdayMax = weekdayData.length > 0 ? Math.max(...weekdayData.map(d => d.count)) : 650;
    const saturdayMax = saturdayData.length > 0 ? Math.max(...saturdayData.map(d => d.count)) : Math.round(weekdayMax * 0.3);
    const sundayMax = sundayData.length > 0 ? Math.max(...sundayData.map(d => d.count)) : Math.round(weekdayMax * 0.2);
    
    const maxRecords = Math.max(...counts);
    const minRecords = Math.min(...counts);
    
    // Use weekday maximum as primary baseline target
    const WEEKDAY_TARGET = weekdayMax;
    const SATURDAY_TARGET = saturdayMax;
    const SUNDAY_TARGET = sundayMax;
    
    // Weekday tiers (Mon-Fri) - using weekday maximum
    const weekdayExcellent = Math.round(WEEKDAY_TARGET * 0.95); // 95%+ of weekday max = Green
    const weekdayGood = Math.round(WEEKDAY_TARGET * 0.85);      // 85-95% of weekday max = Yellow  
    const weekdayFair = Math.round(WEEKDAY_TARGET * 0.75);      // 75-85% of weekday max = Orange
    
    // Saturday tiers - using Saturday maximum
    const saturdayExcellent = Math.round(SATURDAY_TARGET * 0.90); // 90%+ of Saturday max = Green
    const saturdayGood = Math.round(SATURDAY_TARGET * 0.70);      // 70-90% of Saturday max = Yellow
    const saturdayFair = Math.round(SATURDAY_TARGET * 0.50);      // 50-70% of Saturday max = Orange
    
    // Sunday tiers - using Sunday maximum  
    const sundayExcellent = Math.round(SUNDAY_TARGET * 0.90);    // 90%+ of Sunday max = Green
    const sundayGood = Math.round(SUNDAY_TARGET * 0.70);         // 70-90% of Sunday max = Yellow
    const sundayFair = Math.round(SUNDAY_TARGET * 0.50);         // 50-70% of Sunday max = Orange
    
    // Calculate actual data statistics
    const validCounts = counts.filter(count => count > 0);
    const realAverageRecords = validCounts.length > 0 ? (validCounts.reduce((sum, count) => sum + count, 0) / validCounts.length) : 0;
    
    // Add tier classification to each day
    const dataWithTiers = heatmapData.map(day => {
      const dayOfWeek = new Date(day.date).getDay();
      const isSunday = day.isSunday;
      const isSaturday = dayOfWeek === 6;
      
      // Use day-specific thresholds and targets
      let thresholds, target;
      if (isSunday) {
        thresholds = { excellent: sundayExcellent, good: sundayGood, fair: sundayFair };
        target = SUNDAY_TARGET;
      } else if (isSaturday) {
        thresholds = { excellent: saturdayExcellent, good: saturdayGood, fair: saturdayFair };
        target = SATURDAY_TARGET;
      } else {
        thresholds = { excellent: weekdayExcellent, good: weekdayGood, fair: weekdayFair };
        target = WEEKDAY_TARGET;
      }
      
      return {
        ...day,
        tier: day.count >= thresholds.excellent ? 'excellent' :
              day.count >= thresholds.good ? 'good' :
              day.count >= thresholds.fair ? 'fair' :
              'poor',
        percentage: Math.round((day.count / target) * 100),
        target: target,
        dayType: isSunday ? 'sunday' : isSaturday ? 'saturday' : 'weekday'
      };
    });
    
    res.json({
      data: dataWithTiers,
      statistics: {
        totalRecords,
        averageRecords: Math.round(realAverageRecords), // Use real average excluding zero days
        maxRecords,
        minRecords,
        weekdayTarget: WEEKDAY_TARGET,
        saturdayTarget: SATURDAY_TARGET, 
        sundayTarget: SUNDAY_TARGET,
        weekdayThresholds: { excellent: weekdayExcellent, good: weekdayGood, fair: weekdayFair },
        saturdayThresholds: { excellent: saturdayExcellent, good: saturdayGood, fair: saturdayFair },
        sundayThresholds: { excellent: sundayExcellent, good: sundayGood, fair: sundayFair },
        realDataPoints: validCounts.length,
        totalDays: heatmapData.length,
        overallMax: maxRecords
      }
    });
    
  } catch (error) {
    console.error('Error fetching data availability heatmap:', error);
    res.status(500).json({ error: 'Failed to fetch data availability heatmap' });
  }
}