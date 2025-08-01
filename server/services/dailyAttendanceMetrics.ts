import { db } from "../db";
import { 
  dailyAttendanceMetrics, 
  attendanceRecords, 
  employeeRecords, 
  shiftAssignments,
  shifts,
  type InsertDailyAttendanceMetrics
} from "@shared/schema";
import { eq, sql, and, or, isNull, isNotNull, count, countDistinct, desc, asc } from "drizzle-orm";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { getCurrentTimezone, toSystemTimezone, formatInSystemTimezone } from "../config/timezone";

// Get total active employees dynamically
async function getTotalActiveEmployees(): Promise<number> {
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM employee_records 
      WHERE is_active = true 
      AND system_account = false
      AND LOWER(first_name) != 'noc'
    `);
    return Number(result[0]?.count) || 0;
  } catch (error) {
    console.error('Error fetching total active employees:', error);
    return 0;
  }
}
const LATE_THRESHOLD_MINUTES = 5;

/**
 * Utility function to get system timezone aware dates
 */
function getSystemDate(date: Date): Date {
  return toSystemTimezone(date);
}

/**
 * Utility function to format date for database storage
 */
function formatDateForDB(date: Date): string {
  return formatInSystemTimezone(date, "yyyy-MM-dd");
}

/**
 * Calculate daily attendance metrics for a specific date
 */
export async function calculateDailyMetrics(targetDate: Date): Promise<InsertDailyAttendanceMetrics> {
  console.log(`Calculating daily metrics for: ${formatDateForDB(targetDate)}`);
  
  const dateStr = formatDateForDB(targetDate);
  const startDate = startOfDay(targetDate);
  const endDate = endOfDay(targetDate);
  
  try {
    // Get total punch ins today (all employees who have checked in)
    const totalPunchInQuery = await db
      .select({ count: countDistinct(attendanceRecords.employeeCode) })
      .from(attendanceRecords)
      .where(
        and(
          eq(sql`DATE(${attendanceRecords.date})`, dateStr),
          isNotNull(attendanceRecords.checkIn)
        )
      );
    
    const totalPunchIn = totalPunchInQuery[0]?.count || 0;
    
    // Get total punch outs today (all employees who have checked out)
    const totalPunchOutQuery = await db
      .select({ count: countDistinct(attendanceRecords.employeeCode) })
      .from(attendanceRecords)
      .where(
        and(
          eq(sql`DATE(${attendanceRecords.date})`, dateStr),
          isNotNull(attendanceRecords.checkOut)
        )
      );
    
    const totalPunchOut = totalPunchOutQuery[0]?.count || 0;
    
    // Get total terminated records today (system automatic + manual admin terminated)
    const totalTerminatedQuery = await db
      .select({ count: countDistinct(attendanceRecords.employeeCode) })
      .from(attendanceRecords)
      .where(
        and(
          eq(sql`DATE(${attendanceRecords.date})`, dateStr),
          or(
            eq(attendanceRecords.status, 'auto_punchout'),
            eq(attendanceRecords.status, 'admin_terminated')
          )
        )
      );
    
    const totalTerminated = totalTerminatedQuery[0]?.count || 0;
    
    // Get NonBio count from biometric_exemptions table (correct source)
    const nonBioQuery = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM biometric_exemptions 
      WHERE is_active = true
        AND exemption_type = 'individual'
    `);
    
    const nonBioCount = Number(nonBioQuery[0]?.count) || 0;
    
    // Get shift assignments count for the date
    const shiftAssignmentsQuery = await db
      .select({ count: count() })
      .from(shiftAssignments)
      .where(eq(shiftAssignments.date, dateStr));
    
    const shiftAssignmentsCount = shiftAssignmentsQuery[0]?.count || 0;
    
    // Calculate late arrivals based on shift assignments
    let lateCount = 0;
    
    if (shiftAssignmentsCount > 0) {
      // Get late arrivals by checking against assigned shifts
      const lateArrivalsQuery = await db
        .select({
          employeeCode: attendanceRecords.employeeCode,
          checkIn: attendanceRecords.checkIn,
          shiftStartTime: shifts.startTime,
          shiftName: shifts.shiftName
        })
        .from(attendanceRecords)
        .innerJoin(
          shiftAssignments,
          and(
            eq(shiftAssignments.employeeCode, attendanceRecords.employeeCode),
            eq(shiftAssignments.date, dateStr)
          )
        )
        .innerJoin(shifts, eq(shifts.id, shiftAssignments.shiftId))
        .where(
          and(
            eq(sql`DATE(${attendanceRecords.date})`, dateStr),
            isNotNull(attendanceRecords.checkIn)
          )
        );
      
      // Calculate late arrivals in application logic
      for (const record of lateArrivalsQuery) {
        if (record.checkIn && record.shiftStartTime) {
          const checkInTime = new Date(record.checkIn);
          const [hours, minutes] = record.shiftStartTime.split(':').map(Number);
          
          // Create shift start time for the same date
          const shiftStart = new Date(checkInTime);
          shiftStart.setHours(hours, minutes, 0, 0);
          
          // Calculate difference in minutes
          const diffMinutes = (checkInTime.getTime() - shiftStart.getTime()) / (1000 * 60);
          
          if (diffMinutes > LATE_THRESHOLD_MINUTES) {
            lateCount++;
          }
        }
      }
    } else {
      // Fallback: Count late arrivals against default 9:00 AM threshold
      const defaultLateQuery = await db
        .select({ count: count() })
        .from(attendanceRecords)
        .where(
          and(
            eq(sql`DATE(${attendanceRecords.date})`, dateStr),
            isNotNull(attendanceRecords.checkIn),
            sql`EXTRACT(HOUR FROM ${attendanceRecords.checkIn}) * 60 + EXTRACT(MINUTE FROM ${attendanceRecords.checkIn}) > 9 * 60 + ${LATE_THRESHOLD_MINUTES}`
          )
        );
      
      lateCount = defaultLateQuery[0]?.count || 0;
    }
    
    // Calculate Complete Count (employees with both check-in and check-out within 12 hours)
    const completeCountQuery = await db
      .select({ count: countDistinct(attendanceRecords.employeeCode) })
      .from(attendanceRecords)
      .where(
        and(
          eq(sql`DATE(${attendanceRecords.date})`, dateStr),
          isNotNull(attendanceRecords.checkIn),
          isNotNull(attendanceRecords.checkOut),
          // Check-out within 12 hours of check-in
          sql`EXTRACT(EPOCH FROM (${attendanceRecords.checkOut} - ${attendanceRecords.checkIn})) / 3600 <= 12`
        )
      );
    
    const completeCount = completeCountQuery[0]?.count || 0;
    
    // Calculate Incomplete Count (employees with check-in only or invalid checkout)
    const incompleteCountQuery = await db
      .select({ count: countDistinct(attendanceRecords.employeeCode) })
      .from(attendanceRecords)
      .where(
        and(
          eq(sql`DATE(${attendanceRecords.date})`, dateStr),
          isNotNull(attendanceRecords.checkIn),
          or(
            isNull(attendanceRecords.checkOut),
            // Check-out more than 12 hours after check-in
            sql`EXTRACT(EPOCH FROM (${attendanceRecords.checkOut} - ${attendanceRecords.checkIn})) / 3600 > 12`
          )
        )
      );
    
    const incompleteCount = incompleteCountQuery[0]?.count || 0;
    
    // Calculate Present Count using CORRECT FORMULA: Present Today = Total Punch In - Total Punch Out - Total Terminated
    const presentCount = totalPunchIn - totalPunchOut - totalTerminated;
    
    // Calculate Total Attendance = Total Punch Ins + NonBio (UNIFIED FORMULA)
    const totalAttendance = totalPunchIn + nonBioCount;
    
    // Calculate Absent Count using the formula: Total - Total Attendance
    const absentCount = TOTAL_EMPLOYEES - totalAttendance;
    
    // Calculate Attendance Rate (Total Attendance / Total Employees * 100)
    const attendanceRate = TOTAL_EMPLOYEES > 0 ? (totalAttendance / TOTAL_EMPLOYEES * 100) : 0;
    
    const metrics: InsertDailyAttendanceMetrics = {
      date: dateStr,
      totalEmployees: TOTAL_EMPLOYEES,
      presentCount,
      completeCount,
      incompleteCount,
      lateCount,
      absentCount: Math.max(0, absentCount), // Ensure non-negative
      nonBioCount,
      attendanceRate: attendanceRate.toFixed(2), // Store as string with 2 decimal places
      uniqueCheckIns: totalPunchIn,
      shiftAssignments: shiftAssignmentsCount,
      lateThreshold: LATE_THRESHOLD_MINUTES,
    };
    
    console.log(`Daily metrics calculated for ${dateStr}:`, metrics);
    return metrics;
    
  } catch (error) {
    console.error(`Error calculating daily metrics for ${dateStr}:`, error);
    throw error;
  }
}

/**
 * Store or update daily metrics in database
 */
export async function storeDailyMetrics(metrics: InsertDailyAttendanceMetrics): Promise<void> {
  try {
    // Check if metrics already exist for this date
    const existing = await db
      .select()
      .from(dailyAttendanceMetrics)
      .where(eq(dailyAttendanceMetrics.date, metrics.date))
      .limit(1);
    
    if (existing.length > 0) {
      // Update existing metrics
      await db
        .update(dailyAttendanceMetrics)
        .set({
          ...metrics,
          updatedAt: new Date(),
        })
        .where(eq(dailyAttendanceMetrics.date, metrics.date));
      
      console.log(`Updated daily metrics for ${metrics.date}`);
    } else {
      // Insert new metrics
      await db
        .insert(dailyAttendanceMetrics)
        .values(metrics);
      
      console.log(`Inserted daily metrics for ${metrics.date}`);
    }
  } catch (error) {
    console.error(`Error storing daily metrics for ${metrics.date}:`, error);
    throw error;
  }
}

/**
 * Calculate and store metrics for a date range
 */
export async function calculateMetricsForDateRange(startDate: Date, endDate: Date): Promise<void> {
  console.log(`Calculating metrics for date range: ${formatDateForDB(startDate)} to ${formatDateForDB(endDate)}`);
  
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    try {
      const metrics = await calculateDailyMetrics(currentDate);
      await storeDailyMetrics(metrics);
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    } catch (error) {
      console.error(`Failed to process metrics for ${formatDateForDB(currentDate)}:`, error);
      // Continue with next date even if one fails
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
  
  console.log(`Completed metrics calculation for date range`);
}

/**
 * Calculate metrics for the last 90 days starting from May 1, 2025
 */
export async function calculateLast90DaysMetrics(): Promise<void> {
  const startDate = new Date(2025, 4, 1); // May 1, 2025 (month is 0-indexed)
  const endDate = subDays(new Date(), 1); // Yesterday
  
  console.log(`Calculating last 90 days metrics from ${formatDateForDB(startDate)} to ${formatDateForDB(endDate)}`);
  
  await calculateMetricsForDateRange(startDate, endDate);
}

/**
 * Calculate metrics for a specific date string (YYYY-MM-DD)
 */
export async function calculateMetricsForDate(dateString: string): Promise<InsertDailyAttendanceMetrics> {
  const targetDate = new Date(dateString + 'T00:00:00');
  return await calculateDailyMetrics(targetDate);
}

/**
 * Get daily metrics for a date range
 */
export async function getDailyMetrics(startDate: string, endDate: string): Promise<any[]> {
  try {
    const metrics = await db
      .select()
      .from(dailyAttendanceMetrics)
      .where(
        and(
          sql`${dailyAttendanceMetrics.date} >= ${startDate}`,
          sql`${dailyAttendanceMetrics.date} <= ${endDate}`
        )
      )
      .orderBy(asc(dailyAttendanceMetrics.date));
    
    return metrics;
  } catch (error) {
    console.error(`Error fetching daily metrics for ${startDate} to ${endDate}:`, error);
    throw error;
  }
}

/**
 * Get latest daily metrics
 */
export async function getLatestDailyMetrics(limit: number = 30): Promise<any[]> {
  try {
    const metrics = await db
      .select()
      .from(dailyAttendanceMetrics)
      .orderBy(desc(dailyAttendanceMetrics.date))
      .limit(limit);
    
    return metrics;
  } catch (error) {
    console.error(`Error fetching latest daily metrics:`, error);
    throw error;
  }
}

/**
 * Recalculate metrics for a specific date (force refresh)
 */
export async function recalculateMetricsForDate(dateString: string): Promise<void> {
  console.log(`Recalculating metrics for ${dateString}`);
  
  const targetDate = new Date(dateString + 'T00:00:00');
  const metrics = await calculateDailyMetrics(targetDate);
  await storeDailyMetrics(metrics);
  
  console.log(`Recalculated metrics for ${dateString}`);
}

/**
 * Get metrics summary for dashboard
 */
export async function getMetricsSummary(): Promise<any> {
  try {
    const latest = await db
      .select()
      .from(dailyAttendanceMetrics)
      .orderBy(desc(dailyAttendanceMetrics.date))
      .limit(1);
    
    if (latest.length === 0) {
      return {
        latestDate: null,
        totalRecords: 0,
        avgPresentCount: 0,
        avgLateCount: 0,
        avgAbsentCount: 0,
      };
    }
    
    const summary = await db
      .select({
        totalRecords: count(),
        avgPresentCount: sql`ROUND(AVG(${dailyAttendanceMetrics.presentCount}), 0)`,
        avgLateCount: sql`ROUND(AVG(${dailyAttendanceMetrics.lateCount}), 0)`,
        avgAbsentCount: sql`ROUND(AVG(${dailyAttendanceMetrics.absentCount}), 0)`,
      })
      .from(dailyAttendanceMetrics);
    
    return {
      latestDate: latest[0].date,
      totalRecords: summary[0].totalRecords,
      avgPresentCount: summary[0].avgPresentCount,
      avgLateCount: summary[0].avgLateCount,
      avgAbsentCount: summary[0].avgAbsentCount,
    };
  } catch (error) {
    console.error('Error fetching metrics summary:', error);
    throw error;
  }
}