import { storage } from "../storage";
import { startOfMonth, endOfMonth, format } from "date-fns";

interface MonthlyReportData {
  employee: {
    id: number;
    name: string;
    employeeCode: string;
    department: string;
    position: string;
  };
  attendance: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    totalHours: number;
    regularHours: number;
    overtimeHours: number;
    lateMinutes: number;
  };
  payroll: {
    baseSalary: number;
    overtimePay: number;
    deductions: number;
    totalPay: number;
  };
}

interface PayrollDeduction {
  type: string;
  amount: number;
  description: string;
}

class ReportService {
  async generateMonthlyReport(month: number, year: number): Promise<{
    period: string;
    summary: {
      totalEmployees: number;
      averageAttendance: number;
      totalHours: number;
      totalOvertimeHours: number;
    };
    employees: MonthlyReportData[];
  }> {
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));
    
    console.log(`[ReportService] Starting report generation for ${format(startDate, 'MMM yyyy')}`);

    // Get all active employees
    console.log(`[ReportService] Fetching active employees...`);
    const { employees } = await storage.getEmployees({
      limit: 1000,
      isActive: true,
    });
    console.log(`[ReportService] Found ${employees.length} active employees`);

    // Get ALL attendance records for the month in one query
    console.log(`[ReportService] Fetching attendance records from ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}...`);
    const { records: allRecords } = await storage.getAttendanceRecords({
      dateFrom: startDate,
      dateTo: endDate,
      limit: 50000, // Get all records for the month
    });
    console.log(`[ReportService] Found ${allRecords.length} attendance records`);

    // Group attendance records by employee ID
    const recordsByEmployee = new Map<number, typeof allRecords>();
    for (const record of allRecords) {
      if (!record.employeeId) continue;
      
      if (!recordsByEmployee.has(record.employeeId)) {
        recordsByEmployee.set(record.employeeId, []);
      }
      recordsByEmployee.get(record.employeeId)!.push(record);
    }

    const reportData: MonthlyReportData[] = [];
    let totalHours = 0;
    let totalOvertimeHours = 0;
    let totalPresentDays = 0;

    for (const employee of employees) {
      // Get attendance records for this employee from the grouped data
      const records = recordsByEmployee.get(employee.id) || [];

      const attendance = this.calculateAttendanceMetrics(records);
      const payroll = this.calculatePayroll(attendance);

      reportData.push({
        employee: {
          id: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
          employeeCode: employee.employeeCode,
          department: employee.department || '',
          position: employee.position || '',
        },
        attendance,
        payroll,
      });

      totalHours += attendance.totalHours;
      totalOvertimeHours += attendance.overtimeHours;
      totalPresentDays += attendance.presentDays;
    }

    return {
      period: format(startDate, 'MMMM yyyy'),
      summary: {
        totalEmployees: employees.length,
        averageAttendance: employees.length > 0 ? totalPresentDays / employees.length : 0,
        totalHours,
        totalOvertimeHours,
      },
      employees: reportData,
    };
  }

  async generatePayrollReport(month: number, year: number): Promise<{
    period: string;
    summary: {
      totalEmployees: number;
      totalBaseSalary: number;
      totalOvertimePay: number;
      totalDeductions: number;
      totalNetPay: number;
    };
    employees: Array<{
      employeeCode: string;
      name: string;
      department: string;
      position: string;
      daysWorked: number;
      totalHours: number;
      overtimeHours: number;
      baseSalary: number;
      overtimePay: number;
      deductions: PayrollDeduction[];
      totalDeductions: number;
      netPay: number;
    }>;
  }> {
    const report = await this.generateMonthlyReport(month, year);
    
    let totalBaseSalary = 0;
    let totalOvertimePay = 0;
    let totalDeductions = 0;
    let totalNetPay = 0;

    const payrollData = report.employees.map(emp => {
      const deductions = this.calculateDeductions(emp.attendance);
      const totalDeductionsAmount = deductions.reduce((sum, d) => sum + d.amount, 0);
      
      totalBaseSalary += emp.payroll.baseSalary;
      totalOvertimePay += emp.payroll.overtimePay;
      totalDeductions += totalDeductionsAmount;
      totalNetPay += emp.payroll.totalPay;

      return {
        employeeCode: emp.employee.employeeCode,
        name: emp.employee.name,
        department: emp.employee.department,
        position: emp.employee.position,
        daysWorked: emp.attendance.presentDays,
        totalHours: emp.attendance.totalHours,
        overtimeHours: emp.attendance.overtimeHours,
        baseSalary: emp.payroll.baseSalary,
        overtimePay: emp.payroll.overtimePay,
        deductions,
        totalDeductions: totalDeductionsAmount,
        netPay: emp.payroll.totalPay,
      };
    });

    return {
      period: report.period,
      summary: {
        totalEmployees: report.summary.totalEmployees,
        totalBaseSalary,
        totalOvertimePay,
        totalDeductions,
        totalNetPay,
      },
      employees: payrollData,
    };
  }

  private calculateAttendanceMetrics(records: any[]): MonthlyReportData['attendance'] {
    const totalDays = records.length;
    const presentDays = records.filter(r => r.status === 'present' || r.status === 'late').length;
    const absentDays = records.filter(r => r.status === 'absent').length;
    const lateDays = records.filter(r => r.status === 'late').length;
    
    const totalHours = records.reduce((sum, r) => sum + (parseFloat(r.totalHours) || 0), 0);
    const regularHours = records.reduce((sum, r) => sum + (parseFloat(r.regularHours) || 0), 0);
    const overtimeHours = records.reduce((sum, r) => sum + (parseFloat(r.overtimeHours) || 0), 0);
    const lateMinutes = records.reduce((sum, r) => sum + (r.lateMinutes || 0), 0);

    return {
      totalDays,
      presentDays,
      absentDays,
      lateDays,
      totalHours,
      regularHours,
      overtimeHours,
      lateMinutes,
    };
  }

  private calculatePayroll(attendance: MonthlyReportData['attendance']): MonthlyReportData['payroll'] {
    // Base salary calculation (assuming monthly salary of 50,000)
    const baseSalary = 50000;
    
    // Overtime pay (1.5x regular rate)
    const hourlyRate = baseSalary / (22 * 8); // 22 working days, 8 hours per day
    const overtimePay = attendance.overtimeHours * hourlyRate * 1.5;
    
    // Deductions
    const deductions = this.calculateDeductions(attendance);
    const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
    
    const totalPay = baseSalary + overtimePay - totalDeductions;

    return {
      baseSalary,
      overtimePay,
      deductions: totalDeductions,
      totalPay,
    };
  }

  private calculateDeductions(attendance: MonthlyReportData['attendance']): PayrollDeduction[] {
    const deductions: PayrollDeduction[] = [];
    
    // Absent day deductions
    if (attendance.absentDays > 0) {
      const dailyRate = 50000 / 22; // Assuming 22 working days
      deductions.push({
        type: 'absent_days',
        amount: attendance.absentDays * dailyRate,
        description: `${attendance.absentDays} absent days`,
      });
    }
    
    // Late deductions (for excessive lateness)
    if (attendance.lateMinutes > 180) { // More than 3 hours late in total
      deductions.push({
        type: 'late_penalty',
        amount: 1000,
        description: `Late penalty (${attendance.lateMinutes} minutes total)`,
      });
    }

    return deductions;
  }
}

export const reportService = new ReportService();
