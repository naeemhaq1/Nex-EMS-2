import { db } from "../db";
import { employeeRecords, attendanceRecords } from "@shared/schema";
import { and, eq, gte, lte, sql, isNotNull, desc } from "drizzle-orm";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { storage } from "../storage";
import { pool } from "../db";

export interface EmployeePerformanceMetrics {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  department: string;
  position: string | null;
  
  // Attendance metrics
  totalWorkingDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  
  // Time metrics
  totalHoursWorked: number;
  averageHoursPerDay: number;
  overtimeHours: number;
  undertimeHours: number;
  
  // Pattern analysis
  lateFrequency: number; // Percentage of days late
  absentFrequency: number; // Percentage of days absent
  consistencyScore: number; // 0-100 score for attendance consistency
  
  // Deductions
  totalLateMinutes: number;
  estimatedDeductions: number;
  
  // Risk indicators
  performanceCategory: 'excellent' | 'good' | 'average' | 'poor' | 'critical';
  riskLevel: 'low' | 'medium' | 'high';
  flags: string[]; // Specific issues like "habitual_late", "excessive_absence", etc.
}

export class PerformanceOverviewService {
  private readonly STANDARD_HOURS_PER_DAY = 8;
  private readonly LATE_THRESHOLD_PERCENTAGE = 20; // Flag if late more than 20% of days
  private readonly ABSENCE_THRESHOLD_PERCENTAGE = 10; // Flag if absent more than 10% of days
  private readonly CRITICAL_ABSENCE_PERCENTAGE = 20; // Critical if absent more than 20% of days
  
  async generatePerformanceOverview(
    startDate: Date, 
    endDate: Date,
    departmentFilter?: string
  ): Promise<EmployeePerformanceMetrics[]> {
    // Load policy settings
    const policySettings = await storage.getAttendancePolicySettings();
    const lateDeductionPerMinute = parseFloat(policySettings?.lateDeductionPerMinute || '10');
    const absentDeductionPerDay = parseFloat(policySettings?.absentDeductionPerDay || '1000');
    const halfDayDeduction = parseFloat(policySettings?.halfDayDeduction || '500');
    
    // Get all active employees
    const employeeConditions = [
      eq(employeeRecords.isActive, true),
      isNotNull(employeeRecords.department)
    ];
    
    if (departmentFilter && departmentFilter !== 'all') {
      employeeConditions.push(eq(employeeRecords.department, departmentFilter));
    }
    
    const employees = await db
      .select({
        id: employeeRecords.id,
        employeeCode: employeeRecords.employeeCode,
        firstName: employeeRecords.firstName,
        lastName: employeeRecords.lastName,
        department: employeeRecords.department,
        position: employeeRecords.position,
        nonBio: employeeRecords.nonBio,
      })
      .from(employeeRecords)
      .where(and(...employeeConditions));
    
    // Get attendance records for the period
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
          gte(attendanceRecords.date, startDate),
          lte(attendanceRecords.date, endDate)
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
    
    // Calculate performance metrics for each employee
    const performanceMetrics: EmployeePerformanceMetrics[] = [];
    
    for (const employee of employees) {
      // Skip NOC account and MIGRATED TO FORMER department
      if (employee.firstName === 'NOC' || employee.department === 'MIGRATED TO FORMER') continue;
      
      const employeeAttendance = attendanceByEmployee.get(employee.id) || [];
      
      let presentDays = 0;
      let absentDays = 0;
      let lateDays = 0;
      let halfDays = 0;
      let totalHoursWorked = 0;
      let totalLateMinutes = 0;
      let overtimeHours = 0;
      let undertimeHours = 0;
      
      // Calculate total working days (excluding weekends)
      let totalWorkingDays = 0;
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
          totalWorkingDays++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Process attendance records
      const attendanceDates = new Set<string>();
      
      for (const record of employeeAttendance) {
        const dateStr = format(new Date(record.date), 'yyyy-MM-dd');
        attendanceDates.add(dateStr);
        
        if (record.checkIn) {
          const hoursWorked = parseFloat(record.hoursWorked || '0') || 
            (record.checkIn && record.checkOut ? 
              Math.min(
                (new Date(record.checkOut).getTime() - new Date(record.checkIn).getTime()) / (1000 * 60 * 60),
                12
              ) : 0
            );
          
          totalHoursWorked += hoursWorked;
          
          // Categorize attendance
          if (hoursWorked >= this.STANDARD_HOURS_PER_DAY) {
            presentDays++;
            if (hoursWorked > this.STANDARD_HOURS_PER_DAY) {
              overtimeHours += hoursWorked - this.STANDARD_HOURS_PER_DAY;
            }
          } else if (hoursWorked >= 4) {
            halfDays++;
            undertimeHours += this.STANDARD_HOURS_PER_DAY - hoursWorked;
          } else {
            absentDays++;
            undertimeHours += this.STANDARD_HOURS_PER_DAY;
          }
          
          // Track late arrivals
          if (record.lateMinutes && parseInt(record.lateMinutes.toString()) > 0) {
            lateDays++;
            totalLateMinutes += parseInt(record.lateMinutes.toString());
          }
        }
      }
      
      // Check if employee has biometric exemption
      const exemptionResult = await pool.query(
        'SELECT COUNT(*) as count FROM biometric_exemptions WHERE employee_code = $1 AND is_active = true',
        [employee.employeeCode]
      );
      
      const isExempted = parseInt(exemptionResult.rows[0]?.count || '0') > 0;
      
      // Handle biometric exempt employees
      if (isExempted) {
        presentDays = totalWorkingDays;
        totalHoursWorked = totalWorkingDays * this.STANDARD_HOURS_PER_DAY;
        absentDays = 0;
        lateDays = 0;
        halfDays = 0;
      } else {
        // Calculate absent days for non-exempt employees
        absentDays = totalWorkingDays - presentDays - halfDays;
      }
      
      // Calculate metrics
      const averageHoursPerDay = presentDays > 0 ? totalHoursWorked / presentDays : 0;
      const lateFrequency = totalWorkingDays > 0 ? (lateDays / totalWorkingDays) * 100 : 0;
      const absentFrequency = totalWorkingDays > 0 ? (absentDays / totalWorkingDays) * 100 : 0;
      
      // Calculate consistency score (100 = perfect attendance, decreases with issues)
      let consistencyScore = 100;
      consistencyScore -= (lateFrequency * 0.5); // Deduct 0.5 points per late percentage
      consistencyScore -= (absentFrequency * 2); // Deduct 2 points per absent percentage
      consistencyScore -= (halfDays / totalWorkingDays * 100); // Deduct for half days
      consistencyScore = Math.max(0, Math.min(100, consistencyScore));
      
      // Calculate estimated deductions
      const estimatedDeductions = 
        (totalLateMinutes * lateDeductionPerMinute) +
        (absentDays * absentDeductionPerDay) +
        (halfDays * halfDayDeduction);
      
      // Determine performance category and risk level
      const flags: string[] = [];
      let performanceCategory: EmployeePerformanceMetrics['performanceCategory'];
      let riskLevel: EmployeePerformanceMetrics['riskLevel'];
      
      if (lateFrequency > this.LATE_THRESHOLD_PERCENTAGE) {
        flags.push('habitual_late');
      }
      if (absentFrequency > this.CRITICAL_ABSENCE_PERCENTAGE) {
        flags.push('excessive_absence');
      } else if (absentFrequency > this.ABSENCE_THRESHOLD_PERCENTAGE) {
        flags.push('frequent_absence');
      }
      if (undertimeHours > totalWorkingDays * 2) {
        flags.push('chronic_undertime');
      }
      if (lateDays >= 10) {
        flags.push('chronic_tardiness');
      }
      
      // Categorize performance
      if (consistencyScore >= 90 && flags.length === 0) {
        performanceCategory = 'excellent';
        riskLevel = 'low';
      } else if (consistencyScore >= 80 && flags.length <= 1) {
        performanceCategory = 'good';
        riskLevel = 'low';
      } else if (consistencyScore >= 70 && flags.length <= 2) {
        performanceCategory = 'average';
        riskLevel = 'medium';
      } else if (consistencyScore >= 60) {
        performanceCategory = 'poor';
        riskLevel = 'medium';
      } else {
        performanceCategory = 'critical';
        riskLevel = 'high';
      }
      
      performanceMetrics.push({
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        employeeName: `${employee.firstName} ${employee.lastName || ''}`.trim(),
        department: employee.department || 'Unknown',
        position: employee.position,
        totalWorkingDays,
        presentDays,
        absentDays,
        lateDays,
        halfDays,
        totalHoursWorked: Math.round(totalHoursWorked * 100) / 100,
        averageHoursPerDay: Math.round(averageHoursPerDay * 100) / 100,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
        undertimeHours: Math.round(undertimeHours * 100) / 100,
        lateFrequency: Math.round(lateFrequency * 100) / 100,
        absentFrequency: Math.round(absentFrequency * 100) / 100,
        consistencyScore: Math.round(consistencyScore),
        totalLateMinutes,
        estimatedDeductions: Math.round(estimatedDeductions),
        performanceCategory,
        riskLevel,
        flags,
      });
    }
    
    // Sort by risk level and consistency score
    return performanceMetrics.sort((a, b) => {
      if (a.riskLevel !== b.riskLevel) {
        const riskOrder = { high: 0, medium: 1, low: 2 };
        return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
      }
      return a.consistencyScore - b.consistencyScore;
    });
  }
  
  async getPerformanceSummary(metrics: EmployeePerformanceMetrics[]) {
    const summary = {
      totalEmployees: metrics.length,
      byCategory: {
        excellent: metrics.filter(m => m.performanceCategory === 'excellent').length,
        good: metrics.filter(m => m.performanceCategory === 'good').length,
        average: metrics.filter(m => m.performanceCategory === 'average').length,
        poor: metrics.filter(m => m.performanceCategory === 'poor').length,
        critical: metrics.filter(m => m.performanceCategory === 'critical').length,
      },
      byRisk: {
        low: metrics.filter(m => m.riskLevel === 'low').length,
        medium: metrics.filter(m => m.riskLevel === 'medium').length,
        high: metrics.filter(m => m.riskLevel === 'high').length,
      },
      topIssues: {
        habitualLate: metrics.filter(m => m.flags.includes('habitual_late')).length,
        excessiveAbsence: metrics.filter(m => m.flags.includes('excessive_absence')).length,
        chronicUndertime: metrics.filter(m => m.flags.includes('chronic_undertime')).length,
        chronicTardiness: metrics.filter(m => m.flags.includes('chronic_tardiness')).length,
      },
      averageConsistencyScore: Math.round(
        metrics.reduce((sum, m) => sum + m.consistencyScore, 0) / metrics.length
      ),
    };
    
    return summary;
  }
}

export const performanceOverviewService = new PerformanceOverviewService();