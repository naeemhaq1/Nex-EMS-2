import { db } from "../db";
import { attendanceRecords } from "@shared/schema";
import { sql, gte, and, isNotNull } from "drizzle-orm";

/**
 * TEE (Total Expected Employees) Calculation Service
 * 
 * Calculates TEE based on historical attendance patterns:
 * - AA1-AA7: Average UNIQUE punch-ins for each day of week over last 30 days
 * - MA1-MA7: Maximum UNIQUE punch-ins for each day of week over last 30 days
 * - TEE for any day: Uses MA (maximum) for that specific day of week
 * - Absentees: MA (for that day) - Total unique punch-ins
 */

export interface TEEMetrics {
  // Average Unique Attendance (AA1-AA7)
  aa1_mondayAvg: number;
  aa2_tuesdayAvg: number;
  aa3_wednesdayAvg: number;
  aa4_thursdayAvg: number;
  aa5_fridayAvg: number;
  aa6_saturdayAvg: number;
  aa7_sundayAvg: number;
  
  // Maximum Unique Attendance (MA1-MA7)
  ma1_mondayMax: number;
  ma2_tuesdayMax: number;
  ma3_wednesdayMax: number;
  ma4_thursdayMax: number;
  ma5_fridayMax: number;
  ma6_saturdayMax: number;
  ma7_sundayMax: number;
  
  calculatedAt: Date;
}

export interface DayTEE {
  dayOfWeek: number; // 1=Monday, 7=Sunday
  dayName: string;
  averageUniqueAttendance: number; // AA value (unique employees)
  maximumUniqueAttendance: number; // MA value (unique employees)
  expectedEmployees: number; // TEE (uses MA for unique employees)
}

export class TEECalculationService {
  
  /**
   * Calculate TEE metrics for last 30 days
   */
  async calculateTEEMetrics(): Promise<TEEMetrics> {
    console.log('[TEE] Calculating TEE metrics based on last 30 days attendance patterns');
    
    // Get date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Calculate AA1-AA7 (Average) and MA1-MA7 (Maximum) for each day of week
    const dayMetrics = await Promise.all([
      this.calculateDayMetrics(1, 'Monday', thirtyDaysAgo),
      this.calculateDayMetrics(2, 'Tuesday', thirtyDaysAgo),
      this.calculateDayMetrics(3, 'Wednesday', thirtyDaysAgo),
      this.calculateDayMetrics(4, 'Thursday', thirtyDaysAgo),
      this.calculateDayMetrics(5, 'Friday', thirtyDaysAgo),
      this.calculateDayMetrics(6, 'Saturday', thirtyDaysAgo),
      this.calculateDayMetrics(7, 'Sunday', thirtyDaysAgo)
    ]);
    
    const metrics: TEEMetrics = {
      // Average Unique Attendance (AA1-AA7)
      aa1_mondayAvg: dayMetrics[0].averageUniqueAttendance,
      aa2_tuesdayAvg: dayMetrics[1].averageUniqueAttendance,
      aa3_wednesdayAvg: dayMetrics[2].averageUniqueAttendance,
      aa4_thursdayAvg: dayMetrics[3].averageUniqueAttendance,
      aa5_fridayAvg: dayMetrics[4].averageUniqueAttendance,
      aa6_saturdayAvg: dayMetrics[5].averageUniqueAttendance,
      aa7_sundayAvg: dayMetrics[6].averageUniqueAttendance,
      
      // Maximum Unique Attendance (MA1-MA7)
      ma1_mondayMax: dayMetrics[0].maximumUniqueAttendance,
      ma2_tuesdayMax: dayMetrics[1].maximumUniqueAttendance,
      ma3_wednesdayMax: dayMetrics[2].maximumUniqueAttendance,
      ma4_thursdayMax: dayMetrics[3].maximumUniqueAttendance,
      ma5_fridayMax: dayMetrics[4].maximumUniqueAttendance,
      ma6_saturdayMax: dayMetrics[5].maximumUniqueAttendance,
      ma7_sundayMax: dayMetrics[6].maximumUniqueAttendance,
      
      calculatedAt: new Date()
    };
    
    console.log('[TEE] Calculated metrics:', {
      averages: `AA1:${metrics.aa1_mondayAvg} AA2:${metrics.aa2_tuesdayAvg} AA3:${metrics.aa3_wednesdayAvg} AA4:${metrics.aa4_thursdayAvg} AA5:${metrics.aa5_fridayAvg} AA6:${metrics.aa6_saturdayAvg} AA7:${metrics.aa7_sundayAvg}`,
      maximums: `MA1:${metrics.ma1_mondayMax} MA2:${metrics.ma2_tuesdayMax} MA3:${metrics.ma3_wednesdayMax} MA4:${metrics.ma4_thursdayMax} MA5:${metrics.ma5_fridayMax} MA6:${metrics.ma6_saturdayMax} MA7:${metrics.ma7_sundayMax}`
    });
    
    return metrics;
  }
  
  /**
   * Calculate metrics for a specific day of week over last 30 days
   */
  private async calculateDayMetrics(dayOfWeek: number, dayName: string, fromDate: Date): Promise<DayTEE> {
    // Get all UNIQUE punch-in counts for this day of week in last 30 days
    const results = await db
      .select({
        date: sql<string>`DATE(${attendanceRecords.date})`,
        uniquePunchInCount: sql<number>`COUNT(DISTINCT ${attendanceRecords.employeeCode})`
      })
      .from(attendanceRecords)
      .where(
        and(
          gte(attendanceRecords.date, fromDate),
          isNotNull(attendanceRecords.checkIn),
          sql`EXTRACT(DOW FROM ${attendanceRecords.date}) = ${dayOfWeek === 7 ? 0 : dayOfWeek}` // PostgreSQL: 0=Sunday, 1=Monday, convert 7 to 0
        )
      )
      .groupBy(sql`DATE(${attendanceRecords.date})`)
      .orderBy(sql`DATE(${attendanceRecords.date})`);
    
    if (results.length === 0) {
      console.log(`[TEE] No data found for ${dayName} in last 30 days`);
      return {
        dayOfWeek,
        dayName,
        averageUniqueAttendance: 0,
        maximumUniqueAttendance: 0,
        expectedEmployees: 0
      };
    }
    
    // Calculate average (AA) and maximum (MA) based on UNIQUE punch-ins
    const uniquePunchInCounts = results.map(r => r.uniquePunchInCount);
    const averageAttendance = Math.round(uniquePunchInCounts.reduce((sum, count) => sum + count, 0) / uniquePunchInCounts.length);
    const maximumAttendance = Math.max(...uniquePunchInCounts);
    
    console.log(`[TEE] ${dayName}: ${results.length} days analyzed, AA=${averageAttendance}, MA=${maximumAttendance}`);
    
    return {
      dayOfWeek,
      dayName,
      averageUniqueAttendance: averageAttendance,
      maximumUniqueAttendance: maximumAttendance,
      expectedEmployees: maximumAttendance // TEE uses MA (maximum unique employees)
    };
  }
  
  /**
   * Get TEE (expected employees) for a specific date
   */
  async getTEEForDate(targetDate: Date): Promise<number> {
    const metrics = await this.calculateTEEMetrics();
    
    // Get day of week (1=Monday, 7=Sunday)
    const dayOfWeek = targetDate.getDay();
    const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek; // Convert Sunday from 0 to 7
    
    // Return MA (maximum attendance) for that day of week
    switch (adjustedDay) {
      case 1: return metrics.ma1_mondayMax;
      case 2: return metrics.ma2_tuesdayMax;
      case 3: return metrics.ma3_wednesdayMax;
      case 4: return metrics.ma4_thursdayMax;
      case 5: return metrics.ma5_fridayMax;
      case 6: return metrics.ma6_saturdayMax;
      case 7: return metrics.ma7_sundayMax;
      default: return 293; // Fallback
    }
  }
  
  /**
   * Calculate absentees using proper TEE formula: MA (for that day) - Total unique punch-ins
   */
  async calculateAbsenteesForDate(targetDate: Date, actualUniquePunchIns: number): Promise<{
    teeValue: number;
    absentees: number;
    dayOfWeek: string;
  }> {
    const teeValue = await this.getTEEForDate(targetDate);
    const absentees = Math.max(0, teeValue - actualUniquePunchIns);
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = dayNames[targetDate.getDay()];
    
    console.log(`[TEE] ${dayOfWeek} ${targetDate.toDateString()}: TEE=${teeValue}, UniquePunchIns=${actualUniquePunchIns}, Absent=${absentees}`);
    
    return {
      teeValue,
      absentees,
      dayOfWeek
    };
  }
}

export const teeCalculationService = new TEECalculationService();