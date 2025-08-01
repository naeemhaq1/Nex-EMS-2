import { Request, Response } from "express";
import { db } from "../db";
import { attendanceRecords, employeeRecords } from "@shared/schema";
import { sql, eq, and, gte, lte, desc } from "drizzle-orm";
import { subWeeks } from "date-fns";

interface WeeklyHours {
  weekStart: Date;
  weekEnd: Date;
  hoursWorked: number;
  daysWorked: number;
  expectedHours: number;
  attendancePercentage: number;
}

interface EmployeeReport {
  employeeCode: string;
  employeeName: string;
  department: string;
  weeklyReports: WeeklyHours[];
  monthlyReport: {
    month: string;
    totalHoursWorked: number;
    totalDaysWorked: number;
    expectedHours: number;
    attendancePercentage: number;
  };
}

// Helper function to get week boundaries
function getWeekBoundaries(weeksAgo: number): { start: Date; end: Date } {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysToSunday = dayOfWeek === 0 ? 0 : dayOfWeek;
  
  // Get the most recent Sunday
  const lastSunday = new Date(today);
  lastSunday.setDate(today.getDate() - daysToSunday);
  lastSunday.setHours(0, 0, 0, 0);
  
  // Calculate week boundaries
  const weekStart = new Date(lastSunday);
  weekStart.setDate(lastSunday.getDate() - (weeksAgo * 7));
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  
  return { start: weekStart, end: weekEnd };
}

// Helper function to calculate hours between two timestamps
function calculateHours(checkIn: Date | null, checkOut: Date | null): number {
  if (!checkIn || !checkOut) return 0;
  const diff = checkOut.getTime() - checkIn.getTime();
  return Math.max(0, diff / (1000 * 60 * 60)); // Convert to hours
}

export async function generateComprehensiveReport(req: Request, res: Response) {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : subWeeks(new Date(), 4);
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
    const department = req.query.department as string;

    // Get all active employees
    let query = db
      .select()
      .from(employeeRecords)
      .where(eq(employeeRecords.isActive, true));
    
    if (department && department !== 'all') {
      query = query.where(eq(employeeRecords.department, department));
    }
    
    const employees = await query.orderBy(employeeRecords.department, employeeRecords.firstName);

    const reports: EmployeeReport[] = [];
    
    // Get current month boundaries
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    // Process each employee
    for (const employee of employees) {
      const weeklyReports: WeeklyHours[] = [];
      
      // Calculate for last 4 weeks
      for (let i = 3; i >= 0; i--) {
        const week = getWeekBoundaries(i);
        
        // Get attendance records for this week
        const weekRecords = await db
          .select()
          .from(attendanceRecords)
          .where(
            and(
              eq(attendanceRecords.employeeId, employee.id),
              gte(attendanceRecords.date, week.start),
              lte(attendanceRecords.date, week.end)
            )
          );
        
        // Calculate hours and days worked
        let totalHours = 0;
        let daysWorked = 0;
        
        weekRecords.forEach(record => {
          if (record.checkIn) {
            daysWorked++;
            const hours = calculateHours(record.checkIn, record.checkOut);
            totalHours += hours;
          }
        });
        
        // Expected: 6 days * 8 hours = 48 hours per week
        const expectedHours = 48;
        const attendancePercentage = expectedHours > 0 
          ? Math.round((totalHours / expectedHours) * 100) 
          : 0;
        
        weeklyReports.push({
          weekStart: week.start,
          weekEnd: week.end,
          hoursWorked: Math.round(totalHours * 10) / 10,
          daysWorked,
          expectedHours,
          attendancePercentage
        });
      }
      
      // Calculate monthly report
      const monthRecords = await db
        .select()
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.employeeId, employee.id),
            gte(attendanceRecords.date, monthStart),
            lte(attendanceRecords.date, monthEnd)
          )
        );
      
      let monthlyHours = 0;
      let monthlyDays = 0;
      
      monthRecords.forEach(record => {
        if (record.checkIn) {
          monthlyDays++;
          const hours = calculateHours(record.checkIn, record.checkOut);
          monthlyHours += hours;
        }
      });
      
      // Calculate working days in month (excluding Sundays)
      const workingDaysInMonth = getWorkingDaysInMonth(monthStart, monthEnd);
      const monthlyExpectedHours = workingDaysInMonth * 8;
      const monthlyAttendancePercentage = monthlyExpectedHours > 0
        ? Math.round((monthlyHours / monthlyExpectedHours) * 100)
        : 0;
      
      reports.push({
        employeeCode: employee.employeeCode,
        employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.employeeCode,
        department: employee.department || 'No Department',
        weeklyReports,
        monthlyReport: {
          month: monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          totalHoursWorked: Math.round(monthlyHours * 10) / 10,
          totalDaysWorked: monthlyDays,
          expectedHours: monthlyExpectedHours,
          attendancePercentage: monthlyAttendancePercentage
        }
      });
    }
    
    // Generate summary statistics
    const summary = {
      totalEmployees: reports.length,
      reportGeneratedAt: new Date().toISOString(),
      weeksCovered: 4,
      currentMonth: monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      averageWeeklyAttendance: Math.round(
        reports.reduce((sum, r) => sum + r.weeklyReports.reduce((s, w) => s + w.attendancePercentage, 0) / 4, 0) / reports.length
      ),
      averageMonthlyAttendance: Math.round(
        reports.reduce((sum, r) => sum + r.monthlyReport.attendancePercentage, 0) / reports.length
      ),
      departmentSummary: generateDepartmentSummary(reports)
    };
    
    res.json({
      success: true,
      summary,
      reports
    });
    
  } catch (error) {
    console.error('Error generating comprehensive report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate comprehensive report'
    });
  }
}

// Helper function to calculate working days in a month (excluding Sundays)
function getWorkingDaysInMonth(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  
  while (current <= end) {
    if (current.getDay() !== 0) { // Not Sunday
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

// Helper function to generate department summary
function generateDepartmentSummary(reports: EmployeeReport[]) {
  const deptSummary: Record<string, {
    employees: number;
    avgWeeklyAttendance: number;
    avgMonthlyAttendance: number;
  }> = {};
  
  reports.forEach(report => {
    if (!deptSummary[report.department]) {
      deptSummary[report.department] = {
        employees: 0,
        avgWeeklyAttendance: 0,
        avgMonthlyAttendance: 0
      };
    }
    
    const dept = deptSummary[report.department];
    dept.employees++;
    dept.avgWeeklyAttendance += report.weeklyReports.reduce((sum, w) => sum + w.attendancePercentage, 0) / 4;
    dept.avgMonthlyAttendance += report.monthlyReport.attendancePercentage;
  });
  
  // Calculate averages
  Object.keys(deptSummary).forEach(dept => {
    const summary = deptSummary[dept];
    summary.avgWeeklyAttendance = Math.round(summary.avgWeeklyAttendance / summary.employees);
    summary.avgMonthlyAttendance = Math.round(summary.avgMonthlyAttendance / summary.employees);
  });
  
  return deptSummary;
}

// Export report to CSV format
export async function exportComprehensiveReportCSV(req: Request, res: Response) {
  try {
    // Generate the report data first
    const employees = await db
      .select()
      .from(employeeRecords)
      .where(eq(employeeRecords.isActive, true))
      .orderBy(employeeRecords.department, employeeRecords.firstName);

    // CSV Headers
    const headers = [
      'Employee Code',
      'Employee Name',
      'Department',
      'Week 1 Start',
      'Week 1 End',
      'Week 1 Hours',
      'Week 1 Days',
      'Week 1 Attendance %',
      'Week 2 Start',
      'Week 2 End',
      'Week 2 Hours',
      'Week 2 Days',
      'Week 2 Attendance %',
      'Week 3 Start',
      'Week 3 End',
      'Week 3 Hours',
      'Week 3 Days',
      'Week 3 Attendance %',
      'Week 4 Start',
      'Week 4 End',
      'Week 4 Hours',
      'Week 4 Days',
      'Week 4 Attendance %',
      'Monthly Hours',
      'Monthly Days',
      'Monthly Expected Hours',
      'Monthly Attendance %'
    ];
    
    let csv = headers.join(',') + '\n';
    
    // Process each employee and add to CSV
    for (const employee of employees) {
      const row: string[] = [
        employee.employeeCode,
        `"${employee.firstName || ''} ${employee.lastName || ''}".trim()`,
        employee.department || 'No Department'
      ];
      
      // Add weekly data
      for (let i = 3; i >= 0; i--) {
        const week = getWeekBoundaries(i);
        const weekRecords = await db
          .select()
          .from(attendanceRecords)
          .where(
            and(
              eq(attendanceRecords.employeeId, employee.id),
              gte(attendanceRecords.date, week.start),
              lte(attendanceRecords.date, week.end)
            )
          );
        
        let totalHours = 0;
        let daysWorked = 0;
        
        weekRecords.forEach(record => {
          if (record.checkIn) {
            daysWorked++;
            const hours = calculateHours(record.checkIn, record.checkOut);
            totalHours += hours;
          }
        });
        
        const attendancePercentage = Math.round((totalHours / 48) * 100);
        
        row.push(
          week.start.toLocaleDateString(),
          week.end.toLocaleDateString(),
          totalHours.toFixed(1),
          daysWorked.toString(),
          attendancePercentage.toString() + '%'
        );
      }
      
      // Add monthly data
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      
      const monthRecords = await db
        .select()
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.employeeId, employee.id),
            gte(attendanceRecords.date, monthStart),
            lte(attendanceRecords.date, monthEnd)
          )
        );
      
      let monthlyHours = 0;
      let monthlyDays = 0;
      
      monthRecords.forEach(record => {
        if (record.checkIn) {
          monthlyDays++;
          const hours = calculateHours(record.checkIn, record.checkOut);
          monthlyHours += hours;
        }
      });
      
      const workingDaysInMonth = getWorkingDaysInMonth(monthStart, monthEnd);
      const monthlyExpectedHours = workingDaysInMonth * 8;
      const monthlyAttendancePercentage = Math.round((monthlyHours / monthlyExpectedHours) * 100);
      
      row.push(
        monthlyHours.toFixed(1),
        monthlyDays.toString(),
        monthlyExpectedHours.toString(),
        monthlyAttendancePercentage.toString() + '%'
      );
      
      csv += row.join(',') + '\n';
    }
    
    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=comprehensive_attendance_report.csv');
    res.send(csv);
    
  } catch (error) {
    console.error('Error exporting comprehensive report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export comprehensive report'
    });
  }
}