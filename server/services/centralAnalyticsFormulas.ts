/**
 * Central Analytics Formulas Service
 * 
 * Centralized location for all attendance analytics calculations and formulas.
 * This service provides standardized methods for calculating KPIs, TEE metrics,
 * attendance rates, and other analytics used across the platform.
 */

import { db } from "../db";
import { attendanceRecords, employeeRecords } from "@shared/schema";
import { sql, gte, and, isNotNull, between, eq } from "drizzle-orm";
import { getCurrentPakistanDate, formatPakistanDate } from "../utils/timezone";

export interface TEEMetrics {
  // Average Unique Attendance (AA1-AA7) - Monday to Sunday
  aa1_mondayAvg: number;
  aa2_tuesdayAvg: number;
  aa3_wednesdayAvg: number;
  aa4_thursdayAvg: number;
  aa5_fridayAvg: number;
  aa6_saturdayAvg: number;
  aa7_sundayAvg: number;
  
  // Maximum Unique Attendance (MA1-MA7) - Monday to Sunday
  ma1_mondayMax: number;
  ma2_tuesdayMax: number;
  ma3_wednesdayMax: number;
  ma4_thursdayMax: number;
  ma5_fridayMax: number;
  ma6_saturdayMax: number;
  ma7_sundayMax: number;
  
  calculatedAt: Date;
  summaryString: string; // "AA1:123 AA2:145 ... MA1:234 MA2:267 ..."
}

export interface AttendanceMetrics {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  attendanceRate: number;
  lateArrivals: number;
  earlyDepartures: number;
  missedPunchouts: number;
  overtimeHours: number;
  averageWorkingHours: number;
  completedShifts: number;
  incompleteShifts: number;
}

export interface TimingAnalysis {
  onTimeArrivals: number;
  lateArrivals: number;
  earlyDepartures: number;
  normalDepartures: number;
  averageArrivalTime: string;
  averageDepartureTime: string;
  gracePerodViolations: number; // Late arrivals beyond 30min grace
}

export class CentralAnalyticsFormulas {
  
  private readonly GRACE_PERIOD_MINUTES = 30;
  private readonly STANDARD_WORK_HOURS = 8;
  private readonly STANDARD_START_TIME = "09:00:00";
  private readonly STANDARD_END_TIME = "17:00:00";
  
  /**
   * FORMULA 1: TEE (Total Expected Employees) Calculation
   * Based on 30-day historical patterns by day of week
   * 
   * AA1-AA7: Average unique punch-ins per weekday over 30 days
   * MA1-MA7: Maximum unique punch-ins per weekday over 30 days
   * TEE for date: Uses MA value for that specific day of week
   */
  async calculateTEEMetrics(): Promise<TEEMetrics> {
    console.log('[CentralFormulas] Calculating TEE metrics (30-day historical patterns)');
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Calculate metrics for each day of week (1=Monday, 7=Sunday)
    const dayMetrics = await Promise.all([
      this.calculateDayTEEMetrics(1, 'Monday', thirtyDaysAgo),
      this.calculateDayTEEMetrics(2, 'Tuesday', thirtyDaysAgo),
      this.calculateDayTEEMetrics(3, 'Wednesday', thirtyDaysAgo),
      this.calculateDayTEEMetrics(4, 'Thursday', thirtyDaysAgo),
      this.calculateDayTEEMetrics(5, 'Friday', thirtyDaysAgo),
      this.calculateDayTEEMetrics(6, 'Saturday', thirtyDaysAgo),
      this.calculateDayTEEMetrics(7, 'Sunday', thirtyDaysAgo)
    ]);
    
    const metrics: TEEMetrics = {
      // Average calculations (AA1-AA7)
      aa1_mondayAvg: dayMetrics[0].average,
      aa2_tuesdayAvg: dayMetrics[1].average,
      aa3_wednesdayAvg: dayMetrics[2].average,
      aa4_thursdayAvg: dayMetrics[3].average,
      aa5_fridayAvg: dayMetrics[4].average,
      aa6_saturdayAvg: dayMetrics[5].average,
      aa7_sundayAvg: dayMetrics[6].average,
      
      // Maximum calculations (MA1-MA7)
      ma1_mondayMax: dayMetrics[0].maximum,
      ma2_tuesdayMax: dayMetrics[1].maximum,
      ma3_wednesdayMax: dayMetrics[2].maximum,
      ma4_thursdayMax: dayMetrics[3].maximum,
      ma5_fridayMax: dayMetrics[4].maximum,
      ma6_saturdayMax: dayMetrics[5].maximum,
      ma7_sundayMax: dayMetrics[6].maximum,
      
      calculatedAt: new Date(),
      summaryString: `AA1:${dayMetrics[0].average} AA2:${dayMetrics[1].average} AA3:${dayMetrics[2].average} AA4:${dayMetrics[3].average} AA5:${dayMetrics[4].average} AA6:${dayMetrics[5].average} AA7:${dayMetrics[6].average}, MA1:${dayMetrics[0].maximum} MA2:${dayMetrics[1].maximum} MA3:${dayMetrics[2].maximum} MA4:${dayMetrics[3].maximum} MA5:${dayMetrics[4].maximum} MA6:${dayMetrics[5].maximum} MA7:${dayMetrics[6].maximum}`
    };
    
    console.log('[CentralFormulas] TEE Summary:', metrics.summaryString);
    return metrics;
  }
  
  /**
   * FORMULA 2: Absentee Calculation using TEE
   * Absentees = MA (for target day of week) - Actual unique punch-ins
   */
  async calculateAbsentees(targetDate: Date, actualUniquePunchIns: number): Promise<{
    teeExpected: number;
    absentees: number;
    dayOfWeek: string;
    formula: string;
  }> {
    const teeExpected = await this.getTEEForDate(targetDate);
    const absentees = Math.max(0, teeExpected - actualUniquePunchIns);
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = dayNames[targetDate.getDay()];
    
    return {
      teeExpected,
      absentees,
      dayOfWeek,
      formula: `Absentees = TEE(${teeExpected}) - UniquePunchIns(${actualUniquePunchIns}) = ${absentees}`
    };
  }
  
  /**
   * FORMULA 3: Attendance Rate Calculation
   * Attendance Rate = (Present Employees / Total Expected Employees) * 100
   */
  calculateAttendanceRate(presentEmployees: number, totalExpected: number): {
    rate: number;
    formula: string;
  } {
    const rate = totalExpected > 0 ? Math.round((presentEmployees / totalExpected) * 100) : 0;
    return {
      rate,
      formula: `AttendanceRate = (${presentEmployees} / ${totalExpected}) * 100 = ${rate}%`
    };
  }
  
  /**
   * FORMULA 4: Late Arrivals Calculation
   * Late Arrival = Check-in time > (Standard Start + Grace Period)
   */
  async calculateLateArrivals(targetDate: Date): Promise<{
    lateCount: number;
    graceViolations: number;
    formula: string;
  }> {
    const targetDateStr = formatPakistanDate(targetDate);
    
    // Get all check-ins for the date
    const result = await db
      .select({
        lateCount: sql<number>`COUNT(CASE WHEN ${attendanceRecords.checkIn} > (DATE(${attendanceRecords.date}) + INTERVAL '9 hours 30 minutes') THEN 1 END)`,
        graceViolations: sql<number>`COUNT(CASE WHEN ${attendanceRecords.checkIn} > (DATE(${attendanceRecords.date}) + INTERVAL '9 hours 30 minutes') THEN 1 END)`
      })
      .from(attendanceRecords)
      .where(and(
        sql`DATE(${attendanceRecords.date}) = ${targetDateStr}`,
        isNotNull(attendanceRecords.checkIn)
      ));
    
    const lateCount = result[0]?.lateCount || 0;
    const graceViolations = result[0]?.graceViolations || 0;
    
    return {
      lateCount,
      graceViolations,
      formula: `LateArrivals = COUNT(checkIn > '${this.STANDARD_START_TIME}' + ${this.GRACE_PERIOD_MINUTES}min grace) = ${lateCount}`
    };
  }
  
  /**
   * FORMULA 5: Missed Punch-outs Calculation
   * Missed Punch-out = Has check-in but no check-out
   */
  async calculateMissedPunchouts(targetDate: Date): Promise<{
    missedCount: number;
    formula: string;
  }> {
    const targetDateStr = formatPakistanDate(targetDate);
    
    const result = await db
      .select({
        missedCount: sql<number>`COUNT(*)`
      })
      .from(attendanceRecords)
      .where(and(
        sql`DATE(${attendanceRecords.date}) = ${targetDateStr}`,
        isNotNull(attendanceRecords.checkIn),
        sql`${attendanceRecords.checkOut} IS NULL`
      ));
    
    const missedCount = result[0]?.missedCount || 0;
    
    return {
      missedCount,
      formula: `MissedPunchouts = COUNT(checkIn IS NOT NULL AND checkOut IS NULL) = ${missedCount}`
    };
  }
  
  /**
   * FORMULA 6: Working Hours Calculation
   * Working Hours = (Check-out time - Check-in time) in hours
   */
  async calculateWorkingHours(targetDate: Date): Promise<{
    totalHours: number;
    averageHours: number;
    overtimeHours: number;
    completedShifts: number;
    formula: string;
  }> {
    const targetDateStr = formatPakistanDate(targetDate);
    
    const result = await db
      .select({
        totalHours: sql<number>`COALESCE(SUM(${attendanceRecords.totalHours}), 0)`,
        completedShifts: sql<number>`COUNT(CASE WHEN ${attendanceRecords.checkIn} IS NOT NULL AND ${attendanceRecords.checkOut} IS NOT NULL THEN 1 END)`,
        overtimeHours: sql<number>`COALESCE(SUM(CASE WHEN ${attendanceRecords.totalHours} > ${this.STANDARD_WORK_HOURS} THEN ${attendanceRecords.totalHours} - ${this.STANDARD_WORK_HOURS} ELSE 0 END), 0)`
      })
      .from(attendanceRecords)
      .where(sql`DATE(${attendanceRecords.date}) = ${targetDateStr}`);
    
    const totalHours = result[0]?.totalHours || 0;
    const completedShifts = result[0]?.completedShifts || 0;
    const overtimeHours = result[0]?.overtimeHours || 0;
    const averageHours = completedShifts > 0 ? Math.round((totalHours / completedShifts) * 10) / 10 : 0;
    
    return {
      totalHours,
      averageHours,
      overtimeHours,
      completedShifts,
      formula: `AvgHours = ${totalHours}hrs / ${completedShifts}completed = ${averageHours}hrs, Overtime = SUM(hours > ${this.STANDARD_WORK_HOURS}) = ${overtimeHours}hrs`
    };
  }
  
  /**
   * FORMULA 7: Department-wise Analytics
   * Calculate attendance breakdown by department
   */
  async calculateDepartmentAnalytics(targetDate: Date): Promise<Array<{
    department: string;
    totalEmployees: number;
    presentEmployees: number;
    attendanceRate: number;
    formula: string;
  }>> {
    const targetDateStr = formatPakistanDate(targetDate);
    
    // Get department breakdown
    const results = await db
      .select({
        department: employeeRecords.department,
        totalEmployees: sql<number>`COUNT(DISTINCT ${employeeRecords.employeeCode})`,
        presentEmployees: sql<number>`COUNT(DISTINCT CASE WHEN ${attendanceRecords.checkIn} IS NOT NULL THEN ${employeeRecords.employeeCode} END)`
      })
      .from(employeeRecords)
      .leftJoin(attendanceRecords, and(
        eq(employeeRecords.employeeCode, attendanceRecords.employeeCode),
        sql`DATE(${attendanceRecords.date}) = ${targetDateStr}`
      ))
      .where(eq(employeeRecords.isActive, true))
      .groupBy(employeeRecords.department);
    
    return results.map(dept => {
      const attendanceRate = dept.totalEmployees > 0 
        ? Math.round((dept.presentEmployees / dept.totalEmployees) * 100) 
        : 0;
      
      return {
        department: dept.department || 'Unknown',
        totalEmployees: dept.totalEmployees,
        presentEmployees: dept.presentEmployees,
        attendanceRate,
        formula: `${dept.department}: (${dept.presentEmployees}/${dept.totalEmployees}) * 100 = ${attendanceRate}%`
      };
    });
  }
  
  /**
   * Get TEE value for a specific date based on day of week
   */
  async getTEEForDate(targetDate: Date): Promise<number> {
    const metrics = await this.calculateTEEMetrics();
    const dayOfWeek = targetDate.getDay();
    const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek; // Convert Sunday from 0 to 7
    
    switch (adjustedDay) {
      case 1: return metrics.ma1_mondayMax;
      case 2: return metrics.ma2_tuesdayMax;
      case 3: return metrics.ma3_wednesdayMax;
      case 4: return metrics.ma4_thursdayMax;
      case 5: return metrics.ma5_fridayMax;
      case 6: return metrics.ma6_saturdayMax;
      case 7: return metrics.ma7_sundayMax;
      default: return 293; // Fallback to total employee count
    }
  }
  
  /**
   * Private helper: Calculate TEE metrics for specific day of week
   */
  private async calculateDayTEEMetrics(dayOfWeek: number, dayName: string, fromDate: Date): Promise<{
    average: number;
    maximum: number;
  }> {
    // PostgreSQL DOW: 0=Sunday, 1=Monday, ..., 6=Saturday
    const pgDayOfWeek = dayOfWeek === 7 ? 0 : dayOfWeek;
    
    const results = await db
      .select({
        uniquePunchInCount: sql<number>`COUNT(DISTINCT ${attendanceRecords.employeeCode})`
      })
      .from(attendanceRecords)
      .where(and(
        gte(attendanceRecords.date, fromDate),
        isNotNull(attendanceRecords.checkIn),
        sql`EXTRACT(DOW FROM ${attendanceRecords.date}) = ${pgDayOfWeek}`
      ))
      .groupBy(sql`DATE(${attendanceRecords.date})`)
      .orderBy(sql`DATE(${attendanceRecords.date})`);
    
    if (results.length === 0) {
      return { average: 0, maximum: 0 };
    }
    
    const counts = results.map(r => r.uniquePunchInCount);
    const average = Math.round(counts.reduce((sum, count) => sum + count, 0) / counts.length);
    const maximum = Math.max(...counts);
    
    console.log(`[CentralFormulas] TEE ${dayName}: ${results.length} days analyzed, AA=${average}, MA=${maximum}`);
    
    return { average, maximum };
  }
  
  /**
   * Comprehensive Analytics Dashboard Metrics
   * Combines all formulas into a single comprehensive response
   */
  async getComprehensiveAnalytics(targetDate?: Date): Promise<{
    date: string;
    teeMetrics: TEEMetrics;
    attendanceMetrics: AttendanceMetrics;
    timingAnalysis: TimingAnalysis;
    departmentBreakdown: Array<any>;
    formulas: Array<string>;
  }> {
    const analysisDate = targetDate || new Date();
    const targetDateStr = formatPakistanDate(analysisDate);
    
    console.log(`[CentralFormulas] Generating comprehensive analytics for ${targetDateStr}`);
    
    // Calculate all metrics in parallel
    const [teeMetrics, absenteeCalc, lateArrivals, missedPunchouts, workingHours, deptAnalytics] = await Promise.all([
      this.calculateTEEMetrics(),
      this.calculateAbsentees(analysisDate, 156), // TODO: Get actual unique punch-ins
      this.calculateLateArrivals(analysisDate),
      this.calculateMissedPunchouts(analysisDate),
      this.calculateWorkingHours(analysisDate),
      this.calculateDepartmentAnalytics(analysisDate)
    ]);
    
    const attendanceRate = this.calculateAttendanceRate(156, absenteeCalc.teeExpected);
    
    return {
      date: targetDateStr,
      teeMetrics,
      attendanceMetrics: {
        totalEmployees: absenteeCalc.teeExpected,
        presentToday: 156, // TODO: Get from actual data
        absentToday: absenteeCalc.absentees,
        attendanceRate: attendanceRate.rate,
        lateArrivals: lateArrivals.lateCount,
        earlyDepartures: 0, // TODO: Implement
        missedPunchouts: missedPunchouts.missedCount,
        overtimeHours: workingHours.overtimeHours,
        averageWorkingHours: workingHours.averageHours,
        completedShifts: workingHours.completedShifts,
        incompleteShifts: 156 - workingHours.completedShifts
      },
      timingAnalysis: {
        onTimeArrivals: 156 - lateArrivals.lateCount,
        lateArrivals: lateArrivals.lateCount,
        earlyDepartures: 0, // TODO: Implement
        normalDepartures: workingHours.completedShifts,
        averageArrivalTime: "09:15:00", // TODO: Calculate
        averageDepartureTime: "17:30:00", // TODO: Calculate
        gracePerodViolations: lateArrivals.graceViolations
      },
      departmentBreakdown: deptAnalytics,
      formulas: [
        absenteeCalc.formula,
        attendanceRate.formula,
        lateArrivals.formula,
        missedPunchouts.formula,
        workingHours.formula
      ]
    };
  }
}

// Export singleton instance
export const centralAnalyticsFormulas = new CentralAnalyticsFormulas();