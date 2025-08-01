import { db } from '../db';
import { attendanceRecords, employeeRecords, exclusions } from '@shared/schema';
import { eq, and, gte, lte, isNotNull, isNull, sql } from 'drizzle-orm';
import { format, startOfDay, endOfDay } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

const PAKISTAN_TZ = 'Asia/Karachi';

export interface AttendanceMetrics {
  totalEmployees: number;
  totalAttendance: number;
  totalCompleteAttendance: number;
  totalPunchIn: number;
  totalNonBio: number;
  totalAbsent: number;
  totalMissedPunches: number;
  date: string;
  calculatedAt: Date;
}

export interface EmployeeAttendanceDetail {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  department: string;
  punchIn: Date | null;
  punchOut: Date | null;
  status: 'present' | 'complete' | 'absent' | 'non_bio' | 'missed_punch';
  hoursWorked: number;
  isNonBio: boolean;
  isMissedPunch: boolean;
}

/**
 * Convert date to Pakistan timezone and get calendar day boundaries
 */
export function getPakistanDateBoundaries(date: Date) {
  const pakistanDate = formatInTimeZone(date, PAKISTAN_TZ, 'yyyy-MM-dd');
  // Using utcToZonedTime instead of zonedTimeToUtc for proper timezone conversion
  const dayStart = new Date(new Date(pakistanDate).setHours(0, 0, 0, 0));
  const dayEnd = new Date(new Date(pakistanDate).setHours(23, 59, 59, 999));

  return {
    dayStart,
    dayEnd,
    dateString: pakistanDate
  };
}

/**
 * Calculate comprehensive attendance metrics for a specific date
 */
export async function calculateAttendanceMetrics(targetDate: Date): Promise<AttendanceMetrics> {
  const { dayStart, dayEnd, dateString } = getPakistanDateBoundaries(targetDate);

  // Get total active employees
  const totalEmployeesResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(employeeRecords)
    .where(eq(employeeRecords.isActive, true));

  const totalEmployees = totalEmployeesResult[0]?.count || 0;

  // Get NonBio employees (exclusions)
  const nonBioResult = await db
    .select({ count: sql<number>`count(distinct ${employeeRecords.id})` })
    .from(employeeRecords)
    .leftJoin(exclusions, eq(exclusions.employeeId, employeeRecords.id))
    .where(and(
      eq(employeeRecords.isActive, true),
      eq(employeeRecords.nonBio, true)
    ));

  const totalNonBio = nonBioResult[0]?.count || 0;

  // Get punch-in records for the day (punch-in determines the attendance date)
  const punchInResult = await db
    .select({ count: sql<number>`count(distinct ${attendanceRecords.employeeId})` })
    .from(attendanceRecords)
    .where(and(
      gte(attendanceRecords.checkIn, dayStart),
      lte(attendanceRecords.checkIn, dayEnd),
      isNotNull(attendanceRecords.checkIn)
    ));

  const totalPunchIn = punchInResult[0]?.count || 0;

  // Get complete attendance (punch-in and punch-out, with punch-out after punch-in)
  const completeAttendanceResult = await db
    .select({ count: sql<number>`count(distinct ${attendanceRecords.employeeId})` })
    .from(attendanceRecords)
    .where(and(
      gte(attendanceRecords.checkIn, dayStart),
      lte(attendanceRecords.checkIn, dayEnd),
      isNotNull(attendanceRecords.checkIn),
      isNotNull(attendanceRecords.checkOut),
      sql`${attendanceRecords.checkOut} > ${attendanceRecords.checkIn}`
    ));

  const totalCompleteAttendance = completeAttendanceResult[0]?.count || 0;

  // Get missed punches (forced checkout by system/admin)
  const missedPunchesResult = await db
    .select({ count: sql<number>`count(distinct ${attendanceRecords.employeeId})` })
    .from(attendanceRecords)
    .where(and(
      gte(attendanceRecords.checkIn, dayStart),
      lte(attendanceRecords.checkIn, dayEnd),
      isNotNull(attendanceRecords.checkIn),
      isNotNull(attendanceRecords.forcedCheckoutBy)
    ));

  const totalMissedPunches = missedPunchesResult[0]?.count || 0;

  // Calculate metrics using the specified formula
  const totalAttendance = totalPunchIn + totalNonBio;
  const totalAbsent = totalEmployees - totalAttendance;

  return {
    totalEmployees,
    totalAttendance,
    totalCompleteAttendance,
    totalPunchIn,
    totalNonBio,
    totalAbsent,
    totalMissedPunches,
    date: dateString,
    calculatedAt: new Date()
  };
}

/**
 * Get detailed attendance breakdown for a specific date
 */
export async function getAttendanceDetails(targetDate: Date): Promise<EmployeeAttendanceDetail[]> {
  const { dayStart, dayEnd } = getPakistanDateBoundaries(targetDate);

  // Get all active employees with their attendance records
  const results = await db
    .select({
      employeeId: employeeRecords.id,
      employeeCode: employeeRecords.employeeCode,
      employeeName: sql<string>`CONCAT(${employeeRecords.firstName}, ' ', ${employeeRecords.lastName})`,
      department: employeeRecords.department,
      isNonBio: employeeRecords.nonBio,
      checkIn: attendanceRecords.checkIn,
      checkOut: attendanceRecords.checkOut,
      forcedCheckoutBy: attendanceRecords.forcedCheckoutBy,
      hoursWorked: attendanceRecords.hoursWorked
    })
    .from(employeeRecords)
    .leftJoin(attendanceRecords, and(
      eq(attendanceRecords.employeeId, employeeRecords.id),
      gte(attendanceRecords.checkIn, dayStart),
      lte(attendanceRecords.checkIn, dayEnd)
    ))
    .where(eq(employeeRecords.isActive, true))
    .orderBy(employeeRecords.employeeCode);

  return results.map(record => {
    const hasPunchIn = !!record.checkIn;
    const hasPunchOut = !!record.checkOut;
    const isValidPunchOut = hasPunchOut && record.checkOut! > record.checkIn!;
    const isMissedPunch = hasPunchIn && !!record.forcedCheckoutBy;
    const isNonBio = record.isNonBio || false;

    let status: EmployeeAttendanceDetail['status'];
    if (isNonBio) {
      status = 'non_bio';
    } else if (isMissedPunch) {
      status = 'missed_punch';
    } else if (hasPunchIn && isValidPunchOut) {
      status = 'complete';
    } else if (hasPunchIn) {
      status = 'present';
    } else {
      status = 'absent';
    }

    return {
      employeeId: record.employeeId,
      employeeCode: record.employeeCode,
      employeeName: record.employeeName || 'Unknown',
      department: record.department || 'Unknown',
      punchIn: record.checkIn,
      punchOut: record.checkOut,
      status,
      hoursWorked: record.hoursWorked || 0,
      isNonBio,
      isMissedPunch
    };
  });
}

/**
 * Calculate attendance metrics for a date range
 */
export async function calculateAttendanceMetricsRange(
  startDate: Date, 
  endDate: Date
): Promise<AttendanceMetrics[]> {
  const results: AttendanceMetrics[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const metrics = await calculateAttendanceMetrics(currentDate);
    results.push(metrics);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return results;
}

/**
 * Get yesterday's attendance metrics (Pakistan timezone)
 */
export async function getYesterdayAttendanceMetrics(): Promise<AttendanceMetrics> {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  return await calculateAttendanceMetrics(yesterday);
}

/**
 * Get today's attendance metrics (Pakistan timezone)
 */
export async function getTodayAttendanceMetrics(): Promise<AttendanceMetrics> {
  const today = new Date();
  return await calculateAttendanceMetrics(today);
}