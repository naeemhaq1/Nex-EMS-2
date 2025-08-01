import { db } from "../db";
import { employeeRecords, attendanceRecords } from "@shared/schema";
import { eq, and, gte, lte, sql, isNotNull, count } from "drizzle-orm";
import { pool } from "../db";
import { format, startOfWeek, endOfWeek, eachWeekOfInterval, differenceInHours, addHours } from "date-fns";
import { storage } from "../storage";

interface EmployeeWeeklyHours {
  employeeCode: string;
  employeeName: string;
  department: string;
  weekStartDate: Date;
  weekEndDate: Date;
  hoursWorked: number;
  attendancePercentage: number;
}

interface DepartmentReport {
  department: string;
  employees: {
    employeeCode: string;
    employeeName: string;
    weeklyHours: {
      weekStart: string;
      weekEnd: string;
      hours: number;
      percentage: number;
    }[];
    monthlyTotalHours: number;
    monthlyAttendancePercentage: number;
  }[];
}

interface DailyHours {
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  hoursWorked: number;
  lateMinutes: number;
  earlyOutMinutes: number;
  status: 'present' | 'absent' | 'half-day' | 'holiday' | 'weekend';
}

interface EmployeeMonthlyReport {
  employeeCode: string;
  employeeName: string;
  department: string;
  position: string | null;
  joiningDate: string | null;
  dailyHours: DailyHours[];
  totalWorkingDays: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  totalHoursWorked: number;
  expectedHours: number;
  deductions: {
    lateDeductions: number; // Total deduction for late arrivals
    absentDeductions: number; // Total deduction for absences
    halfDayDeductions: number; // Total deduction for half days
    totalDeductions: number; // Total of all deductions
  };
  salary?: number; // Base salary if available
  netSalary?: number; // Salary after deductions
}

export class AttendanceReportService {
  private readonly STANDARD_SHIFT_HOURS = 8;
  private readonly MINIMUM_WEEKLY_HOURS = 50;
  private LATE_DEDUCTION_PER_MINUTE = 10; // PKR per minute late (default)
  private ABSENT_DEDUCTION_PER_DAY = 1000; // PKR per absent day (default)
  private HALF_DAY_DEDUCTION = 500; // PKR for half day (default)

  private async loadPolicySettings() {
    try {
      const settings = await storage.getAttendancePolicySettings();
      if (settings) {
        this.LATE_DEDUCTION_PER_MINUTE = parseFloat(settings.lateDeductionPerMinute || '10');
        this.ABSENT_DEDUCTION_PER_DAY = parseFloat(settings.absentDeductionPerDay || '1000');
        this.HALF_DAY_DEDUCTION = parseFloat(settings.halfDayDeduction || '500');
      }
    } catch (error) {
      console.error('[AttendanceReportService] Error loading policy settings:', error);
    }
  }

  async generateMonthlyAttendanceReport(month: Date): Promise<DepartmentReport[]> {
    // Get start and end of month
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

    // Get all employees with their departments
    const allEmployees = await db
      .select({
        id: employeeRecords.id,
        employeeCode: employeeRecords.employeeCode,
        employeeName: sql<string>`COALESCE(${employeeRecords.firstName} || ' ' || ${employeeRecords.lastName}, ${employeeRecords.firstName}, 'Unknown')`,
        department: employeeRecords.department,
      })
      .from(employeeRecords)
      .where(isNotNull(employeeRecords.department));

    // Get all attendance records for the month
    const monthlyAttendance = await db
      .select({
        employeeId: attendanceRecords.employeeId,
        checkIn: attendanceRecords.checkIn,
        checkOut: attendanceRecords.checkOut,
      })
      .from(attendanceRecords)
      .where(
        and(
          gte(attendanceRecords.checkIn, monthStart),
          lte(attendanceRecords.checkIn, monthEnd)
        )
      );

    // Group employees by department
    const departmentMap = new Map<string, typeof allEmployees>();
    for (const emp of allEmployees) {
      const dept = emp.department || 'Unknown';
      if (!departmentMap.has(dept)) {
        departmentMap.set(dept, []);
      }
      departmentMap.get(dept)!.push(emp);
    }

    // Calculate weekly hours for each employee
    const departmentReports: DepartmentReport[] = [];
    const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd });

    for (const [department, deptEmployees] of departmentMap) {
      // Skip MIGRATED TO FORMER department
      if (department === 'MIGRATED TO FORMER') continue;
      
      const employeeReports = [];

      for (const employee of deptEmployees) {
        const weeklyHours = [];
        let monthlyTotal = 0;

        for (const weekStart of weeks) {
          const weekEnd = endOfWeek(weekStart);
          const weekHours = this.calculateWeeklyHours(
            employee.id,
            weekStart,
            weekEnd,
            monthlyAttendance
          );

          const percentage = (weekHours / this.MINIMUM_WEEKLY_HOURS) * 100;
          
          weeklyHours.push({
            weekStart: format(weekStart, 'yyyy-MM-dd'),
            weekEnd: format(weekEnd, 'yyyy-MM-dd'),
            hours: Math.round(weekHours * 100) / 100,
            percentage: Math.round(percentage * 100) / 100,
          });

          monthlyTotal += weekHours;
        }

        const expectedMonthlyHours = weeks.length * this.MINIMUM_WEEKLY_HOURS;
        const monthlyPercentage = (monthlyTotal / expectedMonthlyHours) * 100;

        employeeReports.push({
          employeeCode: employee.employeeCode,
          employeeName: employee.employeeName,
          weeklyHours,
          monthlyTotalHours: Math.round(monthlyTotal * 100) / 100,
          monthlyAttendancePercentage: Math.round(monthlyPercentage * 100) / 100,
        });
      }

      departmentReports.push({
        department,
        employees: employeeReports,
      });
    }

    return departmentReports.sort((a, b) => a.department.localeCompare(b.department));
  }

  async generateComprehensiveMonthlyReport(year: number, month: number): Promise<EmployeeMonthlyReport[]> {
    // Load policy settings
    await this.loadPolicySettings();
    
    // Get first and last day of month
    const monthStart = new Date(year, month - 1, 1); // month is 1-based
    const monthEnd = new Date(year, month, 0); // Last day of month
    const totalDaysInMonth = monthEnd.getDate();

    // Get all active employees
    const employees = await db
      .select({
        id: employeeRecords.id,
        employeeCode: employeeRecords.employeeCode,
        firstName: employeeRecords.firstName,
        lastName: employeeRecords.lastName,
        department: employeeRecords.department,
        position: employeeRecords.position,
        joiningDate: employeeRecords.joiningDate,
        // nonBio field replaced with biometric_exemptions table lookup
      })
      .from(employeeRecords)
      .where(
        and(
          eq(employeeRecords.isActive, true),
          isNotNull(employeeRecords.department)
        )
      );

    // Get all attendance records for the month
    const attendanceData = await db
      .select({
        employeeId: attendanceRecords.employeeId,
        date: attendanceRecords.date,
        checkIn: attendanceRecords.checkIn,
        checkOut: attendanceRecords.checkOut,
        hoursWorked: attendanceRecords.hoursWorked,
        lateMinutes: attendanceRecords.lateMinutes,
        status: attendanceRecords.status,
      })
      .from(attendanceRecords)
      .where(
        and(
          gte(attendanceRecords.date, monthStart),
          lte(attendanceRecords.date, monthEnd)
        )
      );

    // Group attendance by employee
    const attendanceByEmployee = new Map<number, typeof attendanceData>();
    for (const record of attendanceData) {
      if (!attendanceByEmployee.has(record.employeeId)) {
        attendanceByEmployee.set(record.employeeId, []);
      }
      attendanceByEmployee.get(record.employeeId)!.push(record);
    }

    // Generate report for each employee
    const reports: EmployeeMonthlyReport[] = [];

    for (const employee of employees) {
      // Skip NOC account and MIGRATED TO FORMER department
      if (employee.firstName === 'NOC' || employee.department === 'MIGRATED TO FORMER') continue;

      const employeeAttendance = attendanceByEmployee.get(employee.id) || [];
      const dailyHours: DailyHours[] = [];
      
      let presentDays = 0;
      let absentDays = 0;
      let halfDays = 0;
      let totalHoursWorked = 0;
      let totalLateMinutes = 0;
      let totalEarlyOutMinutes = 0;

      // Process each day of the month
      for (let day = 1; day <= totalDaysInMonth; day++) {
        const currentDate = new Date(year, month - 1, day);
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        const dayOfWeek = currentDate.getDay();
        
        // Check if it's weekend (Saturday = 6, Sunday = 0)
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        
        // Find attendance record for this day
        const dayRecord = employeeAttendance.find(
          r => format(new Date(r.date), 'yyyy-MM-dd') === dateStr
        );

        let status: DailyHours['status'] = 'absent';
        let checkInTime: string | null = null;
        let checkOutTime: string | null = null;
        let hoursWorked = 0;
        let lateMinutes = 0;
        let earlyOutMinutes = 0;

        if (isWeekend) {
          status = 'weekend';
        } else {
          // Check if employee has biometric exemption
          const exemptionResult = await pool.query(
            'SELECT COUNT(*) as count FROM biometric_exemptions WHERE employee_code = $1 AND is_active = true',
            [employee.employeeCode]
          );
          
          const isExempted = parseInt(exemptionResult.rows[0]?.count || '0') > 0;
          
          if (isExempted) {
            // NonBio employees are always marked as present
            status = 'present';
            hoursWorked = this.STANDARD_SHIFT_HOURS;
            presentDays++;
            totalHoursWorked += hoursWorked;
          } else if (dayRecord) {
          if (dayRecord.checkIn) {
            checkInTime = format(new Date(dayRecord.checkIn), 'HH:mm:ss');
            if (dayRecord.checkOut) {
              checkOutTime = format(new Date(dayRecord.checkOut), 'HH:mm:ss');
            }
            
            // Calculate hours worked
            hoursWorked = parseFloat(dayRecord.hoursWorked || '0');
            if (hoursWorked === 0 && dayRecord.checkIn && dayRecord.checkOut) {
              const diffMs = new Date(dayRecord.checkOut).getTime() - new Date(dayRecord.checkIn).getTime();
              hoursWorked = Math.min(diffMs / (1000 * 60 * 60), 12); // Cap at 12 hours
            }
            
            // Determine status based on hours worked
            if (hoursWorked >= this.STANDARD_SHIFT_HOURS) {
              status = 'present';
              presentDays++;
            } else if (hoursWorked >= 4) {
              status = 'half-day';
              halfDays++;
            } else {
              status = 'absent';
              absentDays++;
            }
            
            totalHoursWorked += hoursWorked;
            
            // Calculate late minutes (assuming 9 AM start time)
            const checkInDate = new Date(dayRecord.checkIn);
            const expectedStart = new Date(checkInDate);
            expectedStart.setHours(9, 0, 0, 0);
            
            if (checkInDate > expectedStart) {
              lateMinutes = Math.floor((checkInDate.getTime() - expectedStart.getTime()) / 60000);
              totalLateMinutes += lateMinutes;
            }
            
            // Calculate early out minutes (assuming 6 PM end time)
            if (dayRecord.checkOut) {
              const checkOutDate = new Date(dayRecord.checkOut);
              const expectedEnd = new Date(checkOutDate);
              expectedEnd.setHours(18, 0, 0, 0);
              
              if (checkOutDate < expectedEnd) {
                earlyOutMinutes = Math.floor((expectedEnd.getTime() - checkOutDate.getTime()) / 60000);
                totalEarlyOutMinutes += earlyOutMinutes;
              }
            }
          }
        } else if (!isWeekend) {
          absentDays++;
        }

        dailyHours.push({
          date: dateStr,
          checkIn: checkInTime,
          checkOut: checkOutTime,
          hoursWorked: Math.round(hoursWorked * 100) / 100,
          lateMinutes,
          earlyOutMinutes,
          status,
        });
      }

      // Calculate working days (excluding weekends)
      const totalWorkingDays = dailyHours.filter(d => d.status !== 'weekend').length;
      const expectedHours = totalWorkingDays * this.STANDARD_SHIFT_HOURS;

      // Calculate deductions
      const lateDeductions = totalLateMinutes * this.LATE_DEDUCTION_PER_MINUTE;
      const absentDeductions = absentDays * this.ABSENT_DEDUCTION_PER_DAY;
      const halfDayDeductions = halfDays * this.HALF_DAY_DEDUCTION;
      const totalDeductions = lateDeductions + absentDeductions + halfDayDeductions;

      reports.push({
        employeeCode: employee.employeeCode,
        employeeName: `${employee.firstName} ${employee.lastName || ''}`.trim(),
        department: employee.department || 'Unknown',
        position: employee.position,
        joiningDate: employee.joiningDate ? format(new Date(employee.joiningDate), 'yyyy-MM-dd') : null,
        dailyHours,
        totalWorkingDays,
        presentDays,
        absentDays,
        halfDays,
        totalHoursWorked: Math.round(totalHoursWorked * 100) / 100,
        expectedHours,
        deductions: {
          lateDeductions,
          absentDeductions,
          halfDayDeductions,
          totalDeductions,
        },
      });
    }

    return reports.sort((a, b) => {
      // Sort by department, then by employee name
      const deptCompare = a.department.localeCompare(b.department);
      if (deptCompare !== 0) return deptCompare;
      return a.employeeName.localeCompare(b.employeeName);
    });
  }
}

  private calculateWeeklyHours(
    employeeId: number,
    weekStart: Date,
    weekEnd: Date,
    attendanceData: any[]
  ): number {
    const employeeAttendance = attendanceData.filter(
      record => record.employeeId === employeeId &&
      record.checkIn >= weekStart &&
      record.checkIn <= weekEnd
    );

    let totalHours = 0;

    for (const record of employeeAttendance) {
      let hours = 0;
      
      if (record.checkOut) {
        // If checkout exists, calculate actual hours
        hours = differenceInHours(record.checkOut, record.checkIn);
      } else {
        // If no checkout, assume 8-hour shift
        hours = this.STANDARD_SHIFT_HOURS;
      }

      // Cap at 12 hours per day to handle edge cases
      hours = Math.min(hours, 12);
      totalHours += hours;
    }

    return totalHours;
  }

  formatReportAsHtml(reports: DepartmentReport[], month: Date): string {
    const monthName = format(month, 'MMMM yyyy');
    
    let html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1, h2 { color: #333; }
            table { border-collapse: collapse; width: 100%; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .department-header { background-color: #e0e0e0; font-weight: bold; }
            .low-attendance { color: #d32f2f; }
            .good-attendance { color: #388e3c; }
            .summary { margin: 20px 0; padding: 10px; background-color: #f5f5f5; }
          </style>
        </head>
        <body>
          <h1>Monthly Attendance Report - ${monthName}</h1>
          <div class="summary">
            <p><strong>Report Generated:</strong> ${format(new Date(), 'PPpp')}</p>
            <p><strong>Minimum Required Hours per Week:</strong> ${this.MINIMUM_WEEKLY_HOURS} hours</p>
            <p><strong>Note:</strong> Missing punch-outs are calculated as 8-hour shifts</p>
          </div>
    `;

    for (const dept of reports) {
      html += `
        <h2>Department: ${dept.department}</h2>
        <table>
          <thead>
            <tr>
              <th>Employee Code</th>
              <th>Employee Name</th>
              <th>Week</th>
              <th>Hours Worked</th>
              <th>Attendance %</th>
              <th>Monthly Total</th>
              <th>Monthly %</th>
            </tr>
          </thead>
          <tbody>
      `;

      for (const emp of dept.employees) {
        const rowCount = emp.weeklyHours.length;
        let firstRow = true;

        for (const week of emp.weeklyHours) {
          const attendanceClass = week.percentage < 80 ? 'low-attendance' : 
                                 week.percentage >= 100 ? 'good-attendance' : '';
          
          html += '<tr>';
          
          if (firstRow) {
            html += `
              <td rowspan="${rowCount}">${emp.employeeCode}</td>
              <td rowspan="${rowCount}">${emp.employeeName}</td>
            `;
          }

          html += `
            <td>${week.weekStart} - ${week.weekEnd}</td>
            <td>${week.hours}</td>
            <td class="${attendanceClass}">${week.percentage}%</td>
          `;

          if (firstRow) {
            const monthlyClass = emp.monthlyAttendancePercentage < 80 ? 'low-attendance' : 
                               emp.monthlyAttendancePercentage >= 100 ? 'good-attendance' : '';
            
            html += `
              <td rowspan="${rowCount}"><strong>${emp.monthlyTotalHours}</strong></td>
              <td rowspan="${rowCount}" class="${monthlyClass}"><strong>${emp.monthlyAttendancePercentage}%</strong></td>
            `;
            firstRow = false;
          }

          html += '</tr>';
        }
      }

      html += `
          </tbody>
        </table>
      `;
    }

    html += `
        </body>
      </html>
    `;

    return html;
  }

  formatReportAsText(reports: DepartmentReport[], month: Date): string {
    const monthName = format(month, 'MMMM yyyy');
    let text = `MONTHLY ATTENDANCE REPORT - ${monthName}\n`;
    text += `Report Generated: ${format(new Date(), 'PPpp')}\n`;
    text += `Minimum Required Hours per Week: ${this.MINIMUM_WEEKLY_HOURS} hours\n`;
    text += `Note: Missing punch-outs are calculated as 8-hour shifts\n`;
    text += '='.repeat(80) + '\n\n';

    for (const dept of reports) {
      text += `DEPARTMENT: ${dept.department}\n`;
      text += '-'.repeat(60) + '\n';

      for (const emp of dept.employees) {
        text += `\nEmployee: ${emp.employeeName} (${emp.employeeCode})\n`;
        text += `Monthly Total: ${emp.monthlyTotalHours} hours (${emp.monthlyAttendancePercentage}%)\n`;
        text += 'Weekly Breakdown:\n';

        for (const week of emp.weeklyHours) {
          text += `  ${week.weekStart} to ${week.weekEnd}: ${week.hours} hours (${week.percentage}%)\n`;
        }
      }

      text += '\n' + '='.repeat(80) + '\n\n';
    }

    return text;
  }
}

export const attendanceReportService = new AttendanceReportService();