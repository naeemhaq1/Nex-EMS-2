import { db } from "../db";
import { attendanceRecords, employeeRecords, users } from "@shared/schema";
import { eq, and, gte, lte, ne, isNotNull, sql } from "drizzle-orm";
import { format } from "date-fns";

export interface DailyAttendanceResult {
  date: string;
  totalActiveEmployees: number;
  totalPunchIn: number;
  totalPunchOut: number;
  nonBioEmployees: number;
  totalAttendance: number;
  presentToday: number;
  absentToday: number;
  completedShifts: number;
  incompleteShifts: number;
  lateArrivals: number;
  attendanceRate: number;
  calculatedAt: Date;
}

/**
 * Unified Daily Attendance Calculator
 * Uses consistent formula: Total Attendance = Total Unique Punch-In + NonBio
 * NonBio = Total Active Employees - Maximum Biometric Capacity (228)
 */
export class DailyAttendanceCalculator {
  private static readonly MAX_BIOMETRIC_CAPACITY = 228;

  /**
   * Calculate attendance metrics for any specific date
   * @param targetDate - The date to calculate attendance for
   * @returns DailyAttendanceResult with consistent calculations
   */
  static async calculateForDate(targetDate: Date): Promise<DailyAttendanceResult> {
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    console.log(`[DailyCalculator] Calculating attendance for ${format(targetDate, 'yyyy-MM-dd')}`);

    // Get all attendance records for the target date
    const dayRecords = await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          gte(attendanceRecords.date, startOfDay),
          lte(attendanceRecords.date, endOfDay)
        )
      );

    // Get total active employees (excluding system accounts and migrated employees)
    const totalActiveEmployees = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .innerJoin(employeeRecords, eq(users.employeeId, employeeRecords.employeeCode))
      .where(
        and(
          eq(users.isActive, true),
          eq(users.accountType, 'employee'),
          eq(employeeRecords.systemAccount, false),
          ne(employeeRecords.department, 'MIGRATED_TO_FORMER_EMPLOYEES'),
          ne(employeeRecords.firstName, 'NOC')
        )
      )
      .then(result => result[0]?.count || 0);

    // Calculate unique punch-ins for the day
    const totalPunchIn = await db
      .select({ count: sql<number>`count(distinct ${attendanceRecords.employeeCode})` })
      .from(attendanceRecords)
      .where(
        and(
          gte(attendanceRecords.date, startOfDay),
          lte(attendanceRecords.date, endOfDay),
          isNotNull(attendanceRecords.checkIn)
        )
      )
      .then(result => result[0]?.count || 0);

    // Calculate unique punch-outs for the day
    const totalPunchOut = await db
      .select({ count: sql<number>`count(distinct ${attendanceRecords.employeeCode})` })
      .from(attendanceRecords)
      .where(
        and(
          gte(attendanceRecords.date, startOfDay),
          lte(attendanceRecords.date, endOfDay),
          isNotNull(attendanceRecords.checkOut)
        )
      )
      .then(result => result[0]?.count || 0);

    // Calculate NonBio using consistent formula: Total Active - Max Biometric Capacity
    const nonBioEmployees = Math.max(0, totalActiveEmployees - this.MAX_BIOMETRIC_CAPACITY);

    // CORE FORMULA: Total Attendance = Total Unique Punch-In + NonBio
    const totalAttendance = Number(totalPunchIn) + Number(nonBioEmployees);

    // Present = Total Punch-In - Total Punch-Out (includes biometric, mobile, admin)
    const presentToday = Math.max(0, Number(totalPunchIn) - Number(totalPunchOut));

    // Absent = Total Active - Total Attendance
    const absentToday = Math.max(0, Number(totalActiveEmployees) - Number(totalAttendance));

    // Calculate completed shifts (both check-in and check-out within 12 hours)
    const employeeShifts = new Map<string, { checkIn: Date | null; checkOut: Date | null }>();
    
    // Group records by employee
    const recordsByEmployee: Record<string, any[]> = {};
    dayRecords.forEach(record => {
      if (!recordsByEmployee[record.employeeCode]) {
        recordsByEmployee[record.employeeCode] = [];
      }
      recordsByEmployee[record.employeeCode].push(record);
    });

    // Process each employee's records
    Object.entries(recordsByEmployee).forEach(([employeeCode, records]) => {
      let earliestCheckIn: Date | null = null;
      let latestCheckOut: Date | null = null;

      records.forEach(record => {
        if (record.checkIn) {
          const checkInTime = new Date(record.checkIn);
          if (!earliestCheckIn || checkInTime < earliestCheckIn) {
            earliestCheckIn = checkInTime;
          }
        }
        if (record.checkOut) {
          const checkOutTime = new Date(record.checkOut);
          if (!latestCheckOut || checkOutTime > latestCheckOut) {
            latestCheckOut = checkOutTime;
          }
        }
      });

      employeeShifts.set(employeeCode, {
        checkIn: earliestCheckIn,
        checkOut: latestCheckOut
      });
    });

    // Calculate completed and incomplete shifts
    let completedShifts = 0;
    let incompleteShifts = 0;

    employeeShifts.forEach((shift) => {
      if (shift.checkIn && shift.checkOut) {
        const hoursElapsed = (shift.checkOut.getTime() - shift.checkIn.getTime()) / (1000 * 60 * 60);
        if (shift.checkOut > shift.checkIn && hoursElapsed <= 12) {
          completedShifts++;
        } else {
          incompleteShifts++;
        }
      } else if (shift.checkIn) {
        incompleteShifts++;
      }
    });

    // Calculate late arrivals (after 9:30 AM)
    const lateArrivals = dayRecords.filter(record => {
      if (!record.checkIn) return false;
      const checkInTime = new Date(record.checkIn);
      const hours = checkInTime.getHours();
      const minutes = checkInTime.getMinutes();
      const totalMinutes = hours * 60 + minutes;
      return totalMinutes > 570; // After 9:30 AM
    }).length;

    // Calculate attendance rate
    const attendanceRate = Number(totalActiveEmployees) > 0 ? (Number(totalAttendance) / Number(totalActiveEmployees)) * 100 : 0;

    console.log(`[DailyCalculator] Results for ${format(targetDate, 'yyyy-MM-dd')}: ${totalPunchIn} punch-in + ${nonBioEmployees} non-bio = ${totalAttendance} total attendance (${attendanceRate.toFixed(1)}%)`);

    return {
      date: format(targetDate, 'yyyy-MM-dd'),
      totalActiveEmployees,
      totalPunchIn,
      totalPunchOut,
      nonBioEmployees,
      totalAttendance,
      presentToday,
      absentToday,
      completedShifts,
      incompleteShifts,
      lateArrivals,
      attendanceRate,
      calculatedAt: new Date()
    };
  }

  /**
   * Calculate attendance for today
   */
  static async calculateToday(): Promise<DailyAttendanceResult> {
    return this.calculateForDate(new Date());
  }

  /**
   * Calculate attendance for yesterday
   */
  static async calculateYesterday(): Promise<DailyAttendanceResult> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return this.calculateForDate(yesterday);
  }

  /**
   * Calculate attendance for a specific date string (YYYY-MM-DD)
   */
  static async calculateForDateString(dateString: string): Promise<DailyAttendanceResult> {
    const targetDate = new Date(dateString + 'T00:00:00');
    return this.calculateForDate(targetDate);
  }
}