
import { Request, Response, Router } from "express";
import { storage } from "../storage";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { getCurrentPKTTime } from "../utils/timezone";

const router = Router();

// Get monthly report
router.get("/monthly", async (req: Request, res: Response) => {
  try {
    const { month, year } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required' });
    }
    
    const monthNum = parseInt(month as string) - 1; // JavaScript months are 0-indexed
    const yearNum = parseInt(year as string);
    
    const startDate = startOfMonth(new Date(yearNum, monthNum));
    const endDate = endOfMonth(new Date(yearNum, monthNum));
    
    // Get attendance records for the month
    const attendanceData = await storage.getAttendanceRecords({
      dateFrom: startDate,
      dateTo: endDate
    });
    
    // Get all employees
    const employeesResult = await storage.getEmployees({ limit: 1000 });
    const employees = employeesResult.employees;
    const employeeMap = new Map(employees.map(e => [e.employeeCode, e]));
    
    // Calculate summary
    const totalEmployees = employees.length;
    const totalRecords = attendanceData.records.length;
    const uniqueEmployeesWithAttendance = new Set(attendanceData.records.map(r => r.employeeCode)).size;
    const averageAttendance = totalEmployees > 0 ? Math.round((uniqueEmployeesWithAttendance / totalEmployees) * 100) : 0;
    
    // Calculate total hours
    const totalHours = attendanceData.records.reduce((sum, record) => {
      return sum + (record.hoursWorked || 0);
    }, 0);
    
    const totalOvertimeHours = attendanceData.records.reduce((sum, record) => {
      const regularHours = 8; // Assuming 8 hours is regular
      const overtime = Math.max(0, (record.hoursWorked || 0) - regularHours);
      return sum + overtime;
    }, 0);
    
    // Process employee data
    const employeeAttendance = employees.map(employee => {
      const employeeRecords = attendanceData.records.filter(r => r.employeeCode === employee.employeeCode);
      
      const presentDays = new Set(employeeRecords.map(r => {
        const date = r.checkIn || r.checkOut;
        return date ? format(new Date(date), 'yyyy-MM-dd') : null;
      }).filter(Boolean)).size;
      
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const absentDays = totalDays - presentDays;
      
      const totalEmployeeHours = employeeRecords.reduce((sum, r) => sum + (r.hoursWorked || 0), 0);
      const regularHours = Math.min(totalEmployeeHours, presentDays * 8);
      const overtimeHours = Math.max(0, totalEmployeeHours - regularHours);
      
      // Count late arrivals (after 9 AM)
      const lateDays = employeeRecords.filter(record => {
        if (!record.checkIn) return false;
        const checkInTime = new Date(record.checkIn);
        return checkInTime.getHours() > 9 || (checkInTime.getHours() === 9 && checkInTime.getMinutes() > 0);
      }).length;
      
      const lateMinutes = employeeRecords.reduce((sum, record) => {
        if (!record.checkIn) return sum;
        const checkInTime = new Date(record.checkIn);
        const standardStart = new Date(checkInTime);
        standardStart.setHours(9, 0, 0, 0);
        
        if (checkInTime > standardStart) {
          return sum + Math.round((checkInTime.getTime() - standardStart.getTime()) / (1000 * 60));
        }
        return sum;
      }, 0);
      
      return {
        employee: {
          id: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
          employeeCode: employee.employeeCode,
          department: employee.department || 'Unknown',
          position: employee.position || 'Unknown'
        },
        attendance: {
          totalDays,
          presentDays,
          absentDays,
          lateDays,
          totalHours: totalEmployeeHours,
          regularHours,
          overtimeHours,
          lateMinutes
        }
      };
    });
    
    const report = {
      period: `${year}-${month.toString().padStart(2, '0')}`,
      summary: {
        totalEmployees,
        averageAttendance,
        totalHours,
        totalOvertimeHours
      },
      employees: employeeAttendance
    };
    
    res.json(report);
  } catch (error) {
    console.error('Error generating monthly report:', error);
    res.status(500).json({ error: 'Failed to generate monthly report' });
  }
});

// Get payroll report
router.get("/payroll", async (req: Request, res: Response) => {
  try {
    const { month, year } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required' });
    }
    
    const monthNum = parseInt(month as string) - 1;
    const yearNum = parseInt(year as string);
    
    const startDate = startOfMonth(new Date(yearNum, monthNum));
    const endDate = endOfMonth(new Date(yearNum, monthNum));
    
    // Get attendance data
    const attendanceData = await storage.getAttendanceRecords({
      dateFrom: startDate,
      dateTo: endDate
    });
    
    // Get employees
    const employeesResult = await storage.getEmployees({ limit: 1000 });
    const employees = employeesResult.employees;
    
    // Calculate payroll for each employee
    const employeePayroll = employees.map(employee => {
      const employeeRecords = attendanceData.records.filter(r => r.employeeCode === employee.employeeCode);
      
      const daysWorked = new Set(employeeRecords.map(r => {
        const date = r.checkIn || r.checkOut;
        return date ? format(new Date(date), 'yyyy-MM-dd') : null;
      }).filter(Boolean)).size;
      
      const totalHours = employeeRecords.reduce((sum, r) => sum + (r.hoursWorked || 0), 0);
      const regularHours = Math.min(totalHours, daysWorked * 8);
      const overtimeHours = Math.max(0, totalHours - regularHours);
      
      // Assume base salary (this would normally come from employee data)
      const baseSalary = employee.salary || 30000; // Default salary
      const dailyRate = baseSalary / 30; // Assuming 30 working days
      const hourlyRate = dailyRate / 8; // 8 hours per day
      const overtimeRate = hourlyRate * 1.5; // 1.5x for overtime
      
      const earnedBaseSalary = daysWorked * dailyRate;
      const overtimePay = overtimeHours * overtimeRate;
      
      // Calculate deductions (example: 2% for EOBI, 1% for income tax)
      const deductions = [
        {
          type: 'EOBI',
          amount: Math.round(earnedBaseSalary * 0.02),
          description: 'Employee Old-Age Benefits Institution'
        },
        {
          type: 'Income Tax',
          amount: Math.round(earnedBaseSalary * 0.01),
          description: 'Income Tax Deduction'
        }
      ];
      
      const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
      const netPay = earnedBaseSalary + overtimePay - totalDeductions;
      
      return {
        employeeCode: employee.employeeCode,
        name: `${employee.firstName} ${employee.lastName}`,
        department: employee.department || 'Unknown',
        position: employee.position || 'Unknown',
        daysWorked,
        totalHours,
        overtimeHours,
        baseSalary: Math.round(earnedBaseSalary),
        overtimePay: Math.round(overtimePay),
        deductions,
        totalDeductions,
        netPay: Math.round(netPay)
      };
    });
    
    // Calculate summary
    const summary = {
      totalEmployees: employees.length,
      totalBaseSalary: employeePayroll.reduce((sum, e) => sum + e.baseSalary, 0),
      totalOvertimePay: employeePayroll.reduce((sum, e) => sum + e.overtimePay, 0),
      totalDeductions: employeePayroll.reduce((sum, e) => sum + e.totalDeductions, 0),
      totalNetPay: employeePayroll.reduce((sum, e) => sum + e.netPay, 0)
    };
    
    const report = {
      period: `${year}-${month.toString().padStart(2, '0')}`,
      summary,
      employees: employeePayroll
    };
    
    res.json(report);
  } catch (error) {
    console.error('Error generating payroll report:', error);
    res.status(500).json({ error: 'Failed to generate payroll report' });
  }
});

export default router;
