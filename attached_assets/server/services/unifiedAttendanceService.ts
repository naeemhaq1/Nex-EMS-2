import { db } from '../db';
import { attendanceRecords, employeeRecords, users } from '@shared/schema';
import { eq, and, gte, lte, isNotNull, isNull, sql, ne, countDistinct, count, like } from 'drizzle-orm';
import { teeCalculationService } from './teeCalculationService';

export interface UnifiedAttendanceMetrics {
  totalEmployees: number;
  totalPunchIn: number;
  totalPunchOut: number;
  totalForcedPunchOut: number;
  totalBiometricPunchIn: number;
  totalMobilePunchIn: number;
  totalBiometricPunchOut: number;
  totalMobilePunchOut: number;
  totalAttendance: number;
  completedToday: number;
  presentToday: number;
  absentToday: number;
  nonBioEmployees: number;
  lateArrivals: number;
  overtimeHours: number;
  totalHoursWorked: number;
  averageWorkingHours: number;
  attendanceRate: number;
  teeValue: number; // TEE (Total Expected Employees) based on MA for that day of week
  targetDate: Date;
  calculatedAt: Date;
  missedPunchouts?: number; // Added for missed punchouts tracking
}

class UnifiedAttendanceService {
  
  /**
   * Calculate all attendance metrics for a specific date using unified formulas
   * Formula: Total Attendance = Total Punch-In + NonBio (assuming all NonBio attending)
   * Formula: Complete Attendance = records with both punch-in and punch-out (even if next day)
   * Formula: Absentees = Total Employees - Total Attendance
   */
  async calculateMetrics(targetDate?: Date): Promise<UnifiedAttendanceMetrics> {
    // Work directly in Pakistan timezone since BioTime data is stored in Pakistan time
    const calculationDate = targetDate || new Date();
    
    // Use centralized timezone utility for consistent Pakistan time
    const { getCurrentPakistanDate, formatPakistanDate } = await import('../utils/timezone');
    const targetDateStr = targetDate ? 
      formatPakistanDate(calculationDate) : 
      await getCurrentPakistanDate();
    console.log(`[UnifiedAttendance] Calculating metrics for date: ${targetDateStr}`);
    
    // Check if there's any attendance data for this date
    const [dataCheck] = await db
      .select({ count: count() })
      .from(attendanceRecords)
      .where(sql.raw(`DATE(date) = '${targetDateStr}'`));
    
    console.log(`[UnifiedAttendance] Found ${dataCheck.count} attendance records for ${targetDateStr}`);
    
    // If no attendance data for target date, try to use most recent available data
    if (dataCheck.count === 0) {
      console.log(`[UnifiedAttendance] No attendance data for ${targetDateStr}, checking most recent available data`);
      
      // Get the most recent date with attendance data
      const [recentData] = await db
        .select({ 
          recentDate: sql<string>`DATE(date)`,
          count: count()
        })
        .from(attendanceRecords)
        .groupBy(sql`DATE(date)`)
        .orderBy(sql`DATE(date) DESC`)
        .limit(1);
      
      if (recentData && recentData.count > 0) {
        console.log(`[UnifiedAttendance] Using most recent data from ${recentData.recentDate} (${recentData.count} records)`);
        // Recursively calculate metrics for the most recent date with data
        return this.calculateMetrics(new Date(recentData.recentDate + 'T00:00:00'));
      }
      
      // Still get total employees for accurate reporting
      const [totalActiveUsers] = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.isActive, true));

      const [totalSystemAccounts] = await db
        .select({ count: count() })
        .from(users);

      const [totalActiveEmployees] = await db
        .select({ count: count() })
        .from(employeeRecords)
        .where(
          and(
            eq(employeeRecords.isActive, true),
            sql`LOWER(${employeeRecords.firstName}) != 'noc'`
          )
        );

      return {
        totalEmployees: totalActiveEmployees.count,
        totalPunchIn: 0,
        totalPunchOut: 0,
        totalForcedPunchOut: 0,
        totalBiometricPunchIn: 0,
        totalMobilePunchIn: 0,
        totalBiometricPunchOut: 0,
        totalMobilePunchOut: 0,
        totalAttendance: 0,
        completedToday: 0,
        presentToday: 0,
        absentToday: totalActiveEmployees.count,
        nonBioEmployees: 0,
        lateArrivals: 0,
        overtimeHours: 0,
        totalHoursWorked: 0,
        averageWorkingHours: 0,
        attendanceRate: 0,
        teeValue: 0,
        targetDate: calculationDate,
        calculatedAt: new Date()
      };
    }
    
    // Set day boundaries in Pakistan timezone (no conversion needed - data is already in Pakistan time)
    const today = new Date(calculationDate.getFullYear(), calculationDate.getMonth(), calculationDate.getDate(), 0, 0, 0, 0);
    const tomorrow = new Date(calculationDate.getFullYear(), calculationDate.getMonth(), calculationDate.getDate(), 23, 59, 59, 999);

    // Get total active users (all active user accounts including system accounts)
    const [totalActiveUsers] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.isActive, true));

    // Get total active system accounts
    const [totalSystemAccounts] = await db
      .select({ count: count() })
      .from(users)
      .where(
        and(
          eq(users.isActive, true),
          eq(users.accountType, 'system')
        )
      );

    // Calculate total active employees: Total Active Accounts - Total System Accounts
    const totalActiveEmployees = totalActiveUsers.count - totalSystemAccounts.count;

    // Get total active employees with employee records (for detailed filtering)
    const [totalEmployeesWithRecords] = await db
      .select({ count: count() })
      .from(users)
      .innerJoin(employeeRecords, eq(users.employeeId, employeeRecords.employeeCode))
      .where(
        and(
          eq(users.isActive, true),
          eq(users.accountType, 'employee'),
          eq(employeeRecords.systemAccount, false),
          ne(employeeRecords.department, 'MIGRATED_TO_FORMER_EMPLOYEES'),
          sql`LOWER(${employeeRecords.firstName}) != 'noc'`
        )
      );

    // Get total biometric/terminal punch ins for target date
    const [totalBiometricPunchIn] = await db
      .select({ count: countDistinct(attendanceRecords.employeeCode) })
      .from(attendanceRecords)
      .where(
        and(
          isNotNull(attendanceRecords.checkIn),
          sql.raw(`DATE(date) = '${targetDateStr}'`),
          sql`(${attendanceRecords.punchSource} IS NULL OR ${attendanceRecords.punchSource} = 'terminal')`
        )
      );

    // Get total mobile punch ins for target date
    const [totalMobilePunchIn] = await db
      .select({ count: countDistinct(attendanceRecords.employeeCode) })
      .from(attendanceRecords)
      .where(
        and(
          isNotNull(attendanceRecords.checkIn),
          sql.raw(`DATE(date) = '${targetDateStr}'`),
          eq(attendanceRecords.punchSource, 'mobile')
        )
      );

    // Calculate unified punch ins (biometric + mobile)
    const totalPunchIn = totalBiometricPunchIn.count + totalMobilePunchIn.count;

    // Get total biometric/terminal punch outs for target date (including manual punch-outs)
    const [totalBiometricPunchOut] = await db
      .select({ count: countDistinct(attendanceRecords.employeeCode) })
      .from(attendanceRecords)
      .where(
        and(
          isNotNull(attendanceRecords.checkOut),
          sql.raw(`DATE(date) = '${targetDateStr}'`),
          sql`(${attendanceRecords.punchSource} IS NULL OR ${attendanceRecords.punchSource} = 'terminal')`
        )
      );

    // Get total mobile punch outs for target date
    const [totalMobilePunchOut] = await db
      .select({ count: countDistinct(attendanceRecords.employeeCode) })
      .from(attendanceRecords)
      .where(
        and(
          isNotNull(attendanceRecords.checkOut),
          sql.raw(`DATE(date) = '${targetDateStr}'`),
          eq(attendanceRecords.punchSource, 'mobile')
        )
      );

    // Get employees who need auto punch-out (punched in but no punch out, and been 9+ hours)
    // Auto punch-out happens 9 hours after punch-in
    const [employeesNeedingAutoPunchOut] = await db
      .select({ count: countDistinct(attendanceRecords.employeeCode) })
      .from(attendanceRecords)
      .where(
        and(
          sql.raw(`DATE(date) = '${targetDateStr}'`),
          isNotNull(attendanceRecords.checkIn),
          isNull(attendanceRecords.checkOut),
          // Check if 9 hours have passed since punch-in
          sql`${attendanceRecords.checkIn} + INTERVAL '9 hours' <= NOW()`
        )
      );

    // Get employees who are still present (punched in but haven't reached 9-hour auto punch-out yet)
    const [employeesStillPresent] = await db
      .select({ count: countDistinct(attendanceRecords.employeeCode) })
      .from(attendanceRecords)
      .where(
        and(
          sql.raw(`DATE(date) = '${targetDateStr}'`),
          isNotNull(attendanceRecords.checkIn),
          isNull(attendanceRecords.checkOut),
          // Still within 9-hour window (not yet auto punched out)
          sql`${attendanceRecords.checkIn} + INTERVAL '9 hours' > NOW()`
        )
      );

    // Calculate unified punch outs (biometric + mobile + auto punch-outs)
    // Total punch-outs = manual punch-outs + employees who reached 9-hour auto punch-out
    const totalPunchOut = totalBiometricPunchOut.count + totalMobilePunchOut.count + employeesNeedingAutoPunchOut.count;

    // Get forced/auto punch-outs that already happened
    const [totalForcedPunchOut] = await db
      .select({ count: countDistinct(attendanceRecords.employeeCode) })
      .from(attendanceRecords)
      .where(
        and(
          sql.raw(`DATE(date) = '${targetDateStr}'`),
          sql`(${attendanceRecords.status} = 'auto_punchout' OR ${attendanceRecords.status} = 'admin_terminated')`
        )
      );

    // Calculate actual NonBio employees count from database
    // Get employees who don't have biometric attendance today but are considered present
    const [nonBioCount] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ae.employee_code)` })
      .from(
        sql`(
          SELECT 
            er.employee_code,
            er.first_name,
            er.last_name,
            er.department,
            er.designation,
            u.username
          FROM users u
          INNER JOIN employee_records er ON u.employee_id = er.employee_code
          WHERE u.is_active = true
            AND u.account_type = 'employee'
            AND er.system_account = false
            AND er.department != 'MIGRATED_TO_FORMER_EMPLOYEES'
            AND LOWER(er.first_name) != 'noc'
        ) ae`
      )
      .leftJoin(
        sql.raw(`(
          SELECT DISTINCT ar.employee_code
          FROM attendance_records ar
          WHERE DATE(ar.date) = '${targetDateStr}'
            AND ar.check_in IS NOT NULL
        ) be`),
        sql`ae.employee_code = be.employee_code`
      )
      .where(sql`be.employee_code IS NULL`);

    // Get employees with complete attendance (punch-in on target day + punch-out even if next day)
    const [completeAttendance] = await db
      .select({ count: countDistinct(attendanceRecords.employeeCode) })
      .from(attendanceRecords)
      .where(
        and(
          sql.raw(`DATE(date) = '${targetDateStr}'`),
          isNotNull(attendanceRecords.checkIn),
          isNotNull(attendanceRecords.checkOut),
          // Ensure punch-out is after punch-in (validates complete attendance)
          sql`${attendanceRecords.checkOut} > ${attendanceRecords.checkIn}`
        )
      );

    // Get late arrivals - calculate manually since timing analysis may not be working
    // Consider arrivals after 9:30 AM as late (30 min grace after 9:00 AM standard start)  
    const [lateArrivals] = await db
      .select({ count: countDistinct(attendanceRecords.employeeCode) })
      .from(attendanceRecords)
      .where(
        and(
          sql.raw(`DATE(date) = '${targetDateStr}'`),
          isNotNull(attendanceRecords.checkIn),
          sql`EXTRACT(HOUR FROM ${attendanceRecords.checkIn}) * 60 + EXTRACT(MINUTE FROM ${attendanceRecords.checkIn}) > 570`
        )
      );

    // Also get late arrivals using the official arrival_status if timing was processed
    const [officialLateArrivals] = await db
      .select({ count: countDistinct(attendanceRecords.employeeCode) })
      .from(attendanceRecords)
      .where(
        and(
          sql.raw(`DATE(date) = '${targetDateStr}'`),
          eq(attendanceRecords.arrivalStatus, 'late')
        )
      );

    console.log(`[UnifiedAttendance] LATE DEBUG for ${targetDateStr}: Manual calc=${lateArrivals.count}, Official status=${officialLateArrivals.count}`);

    // Calculate missed punchouts: employees who punched in but didn't punch out
    // This includes punch-outs that happen after midnight (they count for the punch-in day)
    const [missedPunchouts] = await db
      .select({ count: countDistinct(attendanceRecords.employeeCode) })
      .from(attendanceRecords)
      .where(
        and(
          sql.raw(`DATE(date) = '${targetDateStr}'`),
          isNotNull(attendanceRecords.checkIn),
          isNull(attendanceRecords.checkOut)
        )
      );

    console.log(`[UnifiedAttendance] MISSED PUNCHOUTS for ${targetDateStr}: ${missedPunchouts.count} employees punched in but no punch out`);

    // Calculate total hours worked and overtime with proper handling
    const [hoursData] = await db
      .select({ 
        totalHours: sql<number>`COALESCE(SUM(CAST(${attendanceRecords.totalHours} AS NUMERIC)), 0)`,
        overtimeHours: sql<number>`COALESCE(SUM(CASE WHEN CAST(${attendanceRecords.totalHours} AS NUMERIC) > 8 THEN CAST(${attendanceRecords.totalHours} AS NUMERIC) - 8 ELSE 0 END), 0)`,
        workingEmployees: sql<number>`COUNT(DISTINCT ${attendanceRecords.employeeCode})`
      })
      .from(attendanceRecords)
      .where(
        and(
          sql.raw(`DATE(date) = '${targetDateStr}'`),
          isNotNull(attendanceRecords.checkIn)
        )
      );

    // Calculate NonBio using biometric exemptions from database
    // Get count of employees marked as biometric exempt
    const [biometricExemptions] = await db
      .select({ count: count() })
      .from(sql`biometric_exemptions`)
      .where(sql`is_active = true`);
    
    const calculatedNonBio = biometricExemptions.count;
    const biometricCapacity = totalActiveEmployees - calculatedNonBio; // Total Active - Non-Bio = Biometric Capacity
    
    console.log(`[UnifiedAttendance] CALCULATED NonBio: ${calculatedNonBio} employees marked as biometric exempt in biometric_exemptions table`);
    console.log(`[UnifiedAttendance] CALCULATED Biometric Capacity: ${totalActiveEmployees} total active - ${calculatedNonBio} non-bio = ${biometricCapacity} biometric capacity`);
    
    // Calculate unified metrics using specified formulas
    // CORRECTED Formula: Total Attendance = Total Unique Punch-In + NonBio (assuming all non-bio employees attend)
    const totalAttendance = totalPunchIn + calculatedNonBio; // Daily punch-ins + non-bio employees (assumed attending)
    
    // Debug: Log the calculation to verify
    console.log(`[UnifiedAttendance] DEBUG: totalPunchIn=${totalPunchIn}, calculatedNonBio=${calculatedNonBio}, totalAttendance=${totalAttendance}`);
    
    // CORRECTED Present Logic: Present = Employees still at work (within 9-hour window)
    // Present = employees who punched in but haven't punched out yet AND haven't reached 9-hour auto punch-out
    // Auto punch-out happens at 9 hours, so only count employees still within that window as "present"
    const presentToday = employeesStillPresent.count;
    
    const absentToday = Math.max(0, totalActiveEmployees - totalAttendance);
    
    // Calculate total hours: actual hours worked + NonBio assumed hours (8 hours each)
    const actualHoursWorked = parseFloat(hoursData.totalHours) || 0;
    const nonBioHours = calculatedNonBio * 8; // Assume 8 hours per NonBio employee
    const totalHoursWorked = actualHoursWorked + nonBioHours;
    
    // Calculate average working hours: total hours / total attending employees
    const averageWorkingHours = totalAttendance > 0 ? totalHoursWorked / totalAttendance : 0;
    
    // Calculate TEE (Total Expected Employees) using MA for this day of week
    const teeCalculation = await teeCalculationService.calculateAbsenteesForDate(calculationDate, totalPunchIn);
    const teeValue = teeCalculation.teeValue;
    console.log(`[UnifiedAttendance] TEE calculation: ${teeCalculation.dayOfWeek} expected ${teeValue} employees, actual punch-ins ${totalPunchIn}, TEE-based absent ${teeCalculation.absentees}`);
    
    // Attendance rate calculation: Total Attending / Total Employees * 100
    const attendanceRate = totalActiveEmployees > 0 ? (totalAttendance / totalActiveEmployees) * 100 : 0;
    
    console.log(`[UnifiedAttendance] UNIFIED: ${totalBiometricPunchIn.count} terminal + ${totalMobilePunchIn.count} mobile = ${totalPunchIn} total punch-in | ${totalBiometricPunchOut.count} terminal + ${totalMobilePunchOut.count} mobile + ${employeesNeedingAutoPunchOut.count} auto = ${totalPunchOut} total punch-out | ${presentToday} still present (within 9hr window) | ${totalAttendance} total attendance / ${totalActiveEmployees} employees = ${attendanceRate.toFixed(1)}% rate`);

    return {
      totalEmployees: totalActiveEmployees,
      totalPunchIn: totalPunchIn,
      totalPunchOut: totalPunchOut,
      totalForcedPunchOut: employeesNeedingAutoPunchOut.count, // 9-hour auto punch-outs
      totalBiometricPunchIn: totalBiometricPunchIn.count,
      totalMobilePunchIn: totalMobilePunchIn.count,
      totalBiometricPunchOut: totalBiometricPunchOut.count,
      totalMobilePunchOut: totalMobilePunchOut.count,
      totalAttendance,
      completedToday: completeAttendance.count,
      presentToday: Math.max(0, presentToday),
      absentToday,
      nonBioEmployees: calculatedNonBio,
      lateArrivals: lateArrivals.count, // Use manual time-based calculation since arrival_status is not populated
      missedPunchouts: missedPunchouts.count, // Employees who punched in but didn't punch out
      overtimeHours: hoursData.overtimeHours || 0,
      totalHoursWorked: totalHoursWorked,
      averageWorkingHours,
      attendanceRate,
      teeValue: teeValue, // TEE (Total Expected Employees) based on MA for this day of week
      targetDate: calculationDate,
      calculatedAt: new Date()
    };
  }

  /**
   * Get actual non-bio employees (employees who don't have biometric attendance but are considered present)
   */
  async getNonBioEmployees(calculationDate: Date = new Date()): Promise<any[]> {
    // Get all active employees with user accounts (excluding system accounts)
    const activeEmployees = await db
      .select({
        employeeCode: employeeRecords.employeeCode,
        firstName: employeeRecords.firstName,
        lastName: employeeRecords.lastName,
        department: employeeRecords.department,
        designation: employeeRecords.designation,
        username: users.username,
        userId: users.id
      })
      .from(users)
      .innerJoin(employeeRecords, eq(users.employeeId, employeeRecords.employeeCode))
      .where(
        and(
          eq(users.isActive, true),
          eq(users.accountType, 'employee'),
          eq(employeeRecords.systemAccount, false),
          ne(employeeRecords.department, 'MIGRATED_TO_FORMER_EMPLOYEES'),
          sql`LOWER(${employeeRecords.firstName}) != 'noc'`
        )
      );

    // Get employees who have biometric attendance today
    const today = new Date(calculationDate.getFullYear(), calculationDate.getMonth(), calculationDate.getDate(), 0, 0, 0, 0);
    const tomorrow = new Date(calculationDate.getFullYear(), calculationDate.getMonth(), calculationDate.getDate(), 23, 59, 59, 999);

    const biometricEmployees = await db
      .select({
        employeeCode: attendanceRecords.employeeCode
      })
      .from(attendanceRecords)
      .where(
        and(
          gte(attendanceRecords.date, today),
          lte(attendanceRecords.date, tomorrow),
          isNotNull(attendanceRecords.checkIn)
        )
      )
      .groupBy(attendanceRecords.employeeCode);

    // Get set of employee codes with biometric attendance
    const biometricEmployeeCodes = new Set(biometricEmployees.map(e => e.employeeCode));

    // Filter out employees who have biometric attendance - remaining are non-bio
    const nonBioEmployees = activeEmployees.filter(emp => !biometricEmployeeCodes.has(emp.employeeCode));

    // Since we use maximum capacity (228), we need to return only the calculated number of non-bio employees
    const maxBiometricCapacity = 228;
    const calculatedNonBioCount = Math.max(0, activeEmployees.length - maxBiometricCapacity);

    // Return the first N employees based on calculated count (prioritize by department/designation)
    return nonBioEmployees
      .sort((a, b) => {
        // Sort by department first, then by designation
        if (a.department !== b.department) {
          return a.department.localeCompare(b.department);
        }
        return a.designation.localeCompare(b.designation);
      })
      .slice(0, calculatedNonBioCount);
  }

  /**
   * Get attendance metrics for multiple days (for charts)
   */
  async getMultiDayMetrics(daysBack: number = 7): Promise<UnifiedAttendanceMetrics[]> {
    const metrics: UnifiedAttendanceMetrics[] = [];
    
    // Import timezone utilities for consistent Pakistan Time calculations
    const { getCurrentSystemDate } = await import('../config/timezone');
    
    // Calculate metrics for the last N days using system timezone
    const today = new Date();
    
    for (let i = daysBack - 1; i >= 0; i--) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - i);
      
      const dayMetrics = await this.calculateMetrics(targetDate);
      metrics.push(dayMetrics);
    }
    
    return metrics;
  }

  /**
   * Get drill-down data for present employees
   */
  async getPresentEmployeeDetails(targetDate?: Date): Promise<Array<{
    employeeCode: string;
    employeeName: string;
    department: string;
    punchInTime: Date | null;
    punchOutTime: Date | null;
    hoursWorked: number;
    status: 'present' | 'non_bio';
    timeSincePunchIn?: string;
  }>> {
    const [latestRecord] = await db
      .select({ maxDate: sql<Date>`MAX(${attendanceRecords.date})` })
      .from(attendanceRecords);
    
    const calculationDate = targetDate || latestRecord?.maxDate || new Date();
    
    const today = new Date(calculationDate);
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Get present employees (punch-in without punch-out)
    const presentEmployees = await db
      .select({
        employeeCode: attendanceRecords.employeeCode,
        employeeName: sql<string>`COALESCE(${employeeRecords.firstName} || ' ' || ${employeeRecords.lastName}, ${employeeRecords.firstName}, ${attendanceRecords.employeeCode})`,
        department: employeeRecords.department,
        punchInTime: attendanceRecords.checkIn,
        punchOutTime: attendanceRecords.checkOut,
        hoursWorked: sql<number>`COALESCE(${attendanceRecords.totalHours}, 0)`,
      })
      .from(attendanceRecords)
      .leftJoin(employeeRecords, eq(attendanceRecords.employeeCode, employeeRecords.employeeCode))
      .where(
        and(
          gte(attendanceRecords.date, today),
          lte(attendanceRecords.date, tomorrow),
          isNotNull(attendanceRecords.checkIn),
          isNull(attendanceRecords.checkOut)
        )
      );

    // Get NonBio employees
    const nonBioEmployees = await db
      .select({
        employeeCode: employeeRecords.employeeCode,
        employeeName: sql<string>`COALESCE(${employeeRecords.firstName} || ' ' || ${employeeRecords.lastName}, ${employeeRecords.firstName}, ${employeeRecords.employeeCode})`,
        department: employeeRecords.department,
      })
      .from(employeeRecords)
      .where(
        and(
          eq(employeeRecords.isActive, true),
          eq(employeeRecords.systemAccount, false),
          ne(employeeRecords.department, 'MIGRATED_TO_FORMER_EMPLOYEES'),
          eq(employeeRecords.nonBio, true),
          ne(employeeRecords.firstName, 'NOC')
        )
      );

    // Format present employees
    const presentDetails = presentEmployees.map(emp => ({
      employeeCode: emp.employeeCode,
      employeeName: emp.employeeName,
      department: emp.department || 'Unknown',
      punchInTime: emp.punchInTime,
      punchOutTime: emp.punchOutTime,
      hoursWorked: emp.hoursWorked,
      status: 'present' as const,
      timeSincePunchIn: emp.punchInTime ? this.formatTimeSincePunchIn(new Date().getTime() - new Date(emp.punchInTime).getTime()) : undefined
    }));

    // Format NonBio employees
    const nonBioDetails = nonBioEmployees.map(emp => ({
      employeeCode: emp.employeeCode,
      employeeName: emp.employeeName,
      department: emp.department || 'Unknown',
      punchInTime: null,
      punchOutTime: null,
      hoursWorked: 8, // Assume 8 hours for NonBio
      status: 'non_bio' as const
    }));

    return [...presentDetails, ...nonBioDetails];
  }

  private formatTimeSincePunchIn(milliseconds: number): string {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  /**
   * Get late arrivals breakdown by status
   */
  async getLateArrivalsBreakdown(targetDate?: Date): Promise<{
    lateArrivals: Array<{
      employeeCode: string;
      employeeName: string;
      department: string;
      checkIn: Date;
      expectedArrival: string;
      lateMinutes: number;
      shift: string;
    }>;
    graceArrivals: Array<{
      employeeCode: string;
      employeeName: string;
      department: string;
      checkIn: Date;
      expectedArrival: string;
      graceMinutes: number;
      shift: string;
    }>;
    totalLate: number;
    totalGrace: number;
    totalOnTime: number;
    totalEarly: number;
  }> {
    const [latestRecord] = await db
      .select({ maxDate: sql<Date>`MAX(${attendanceRecords.date})` })
      .from(attendanceRecords);
    
    const calculationDate = targetDate || latestRecord?.maxDate || new Date();
    
    const today = new Date(calculationDate);
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Get late arrivals with employee details
    const lateArrivals = await db
      .select({
        employeeCode: attendanceRecords.employeeCode,
        employeeName: sql<string>`COALESCE(${employeeRecords.firstName} || ' ' || ${employeeRecords.lastName}, ${employeeRecords.firstName}, ${attendanceRecords.employeeCode})`,
        department: sql<string>`COALESCE(${employeeRecords.department}, 'Unknown')`,
        checkIn: attendanceRecords.checkIn,
        lateMinutes: sql<number>`COALESCE(${attendanceRecords.lateMinutes}, 0)`,
        shiftName: sql<string>`COALESCE(${employeeRecords.shift}, 'No Shift')`
      })
      .from(attendanceRecords)
      .leftJoin(employeeRecords, eq(attendanceRecords.employeeCode, employeeRecords.employeeCode))
      .where(
        and(
          gte(attendanceRecords.date, today),
          lte(attendanceRecords.date, tomorrow),
          eq(attendanceRecords.arrivalStatus, 'late'),
          isNotNull(attendanceRecords.checkIn)
        )
      );

    // Get grace period arrivals
    const graceArrivals = await db
      .select({
        employeeCode: attendanceRecords.employeeCode,
        employeeName: sql<string>`COALESCE(${employeeRecords.firstName} || ' ' || ${employeeRecords.lastName}, ${employeeRecords.firstName}, ${attendanceRecords.employeeCode})`,
        department: sql<string>`COALESCE(${employeeRecords.department}, 'Unknown')`,
        checkIn: attendanceRecords.checkIn,
        graceMinutes: sql<number>`COALESCE(${attendanceRecords.graceMinutes}, 0)`,
        shiftName: sql<string>`COALESCE(${employeeRecords.shift}, 'No Shift')`
      })
      .from(attendanceRecords)
      .leftJoin(employeeRecords, eq(attendanceRecords.employeeCode, employeeRecords.employeeCode))
      .where(
        and(
          gte(attendanceRecords.date, today),
          lte(attendanceRecords.date, tomorrow),
          eq(attendanceRecords.arrivalStatus, 'grace'),
          isNotNull(attendanceRecords.checkIn)
        )
      );

    // Get totals for each arrival status
    const [statusCounts] = await db
      .select({
        totalLate: sql<number>`COUNT(CASE WHEN ${attendanceRecords.arrivalStatus} = 'late' THEN 1 END)`,
        totalGrace: sql<number>`COUNT(CASE WHEN ${attendanceRecords.arrivalStatus} = 'grace' THEN 1 END)`,
        totalOnTime: sql<number>`COUNT(CASE WHEN ${attendanceRecords.arrivalStatus} = 'on_time' THEN 1 END)`,
        totalEarly: sql<number>`COUNT(CASE WHEN ${attendanceRecords.arrivalStatus} = 'early' THEN 1 END)`
      })
      .from(attendanceRecords)
      .where(
        and(
          gte(attendanceRecords.date, today),
          lte(attendanceRecords.date, tomorrow),
          isNotNull(attendanceRecords.checkIn)
        )
      );

    // Format the results
    const formattedLateArrivals = lateArrivals.map(emp => ({
      employeeCode: emp.employeeCode,
      employeeName: emp.employeeName,
      department: emp.department,
      checkIn: emp.checkIn!,
      expectedArrival: this.calculateExpectedArrival(emp.shiftName),
      lateMinutes: emp.lateMinutes,
      shift: emp.shiftName
    }));

    const formattedGraceArrivals = graceArrivals.map(emp => ({
      employeeCode: emp.employeeCode,
      employeeName: emp.employeeName,
      department: emp.department,
      checkIn: emp.checkIn!,
      expectedArrival: this.calculateExpectedArrival(emp.shiftName),
      graceMinutes: emp.graceMinutes,
      shift: emp.shiftName
    }));

    return {
      lateArrivals: formattedLateArrivals,
      graceArrivals: formattedGraceArrivals,
      totalLate: statusCounts?.totalLate || 0,
      totalGrace: statusCounts?.totalGrace || 0,
      totalOnTime: statusCounts?.totalOnTime || 0,
      totalEarly: statusCounts?.totalEarly || 0
    };
  }

  /**
   * Calculate expected arrival time based on shift
   */
  private calculateExpectedArrival(shiftName: string): string {
    // Default to 9:00 AM if no shift
    if (!shiftName || shiftName === 'No Shift') {
      return '9:00 AM';
    }

    // Map common shift names to expected times
    const shiftTimes: { [key: string]: string } = {
      'SYS-EARLY': '6:30 AM',
      'SYS-STANDARD': '9:00 AM', 
      'SYS-LATE-MORNING': '10:00 AM',
      'SYS-AFTERNOON': '11:30 AM',
      'SYS-TECH': '2:30 PM',
      'PSCA-Morning': '7:00 AM',
      'PSCA-Evening': '3:00 PM',
      'PSCA-Night': '11:00 PM'
    };

    return shiftTimes[shiftName] || '9:00 AM';
  }

  /**
   * Get early departure analysis
   */
  static async getEarlyDepartureAnalysis(targetDate?: Date): Promise<{
    earlyDepartures: Array<{
      employeeCode: string;
      employeeName: string;
      department: string;
      checkOut: Date;
      expectedDeparture: string;
      earlyMinutes: number;
      shift: string;
    }>;
    totalEarlyDepartures: number;
    totalLateDepartures: number;
    totalOnTimeDepartures: number;
  }> {
    const [latestRecord] = await db
      .select({ maxDate: sql<Date>`MAX(${attendanceRecords.date})` })
      .from(attendanceRecords);
    
    const calculationDate = targetDate || latestRecord?.maxDate || new Date();
    
    const today = new Date(calculationDate);
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Get early departures with employee details
    const earlyDepartures = await db
      .select({
        employeeCode: attendanceRecords.employeeCode,
        employeeName: sql<string>`COALESCE(${employeeRecords.firstName} || ' ' || ${employeeRecords.lastName}, ${employeeRecords.firstName}, ${attendanceRecords.employeeCode})`,
        department: sql<string>`COALESCE(${employeeRecords.department}, 'Unknown')`,
        checkOut: attendanceRecords.checkOut,
        earlyDepartureMinutes: sql<number>`COALESCE(${attendanceRecords.earlyDepartureMinutes}, 0)`,
        shiftName: sql<string>`COALESCE(${employeeRecords.shift}, 'No Shift')`
      })
      .from(attendanceRecords)
      .leftJoin(employeeRecords, eq(attendanceRecords.employeeCode, employeeRecords.employeeCode))
      .where(
        and(
          gte(attendanceRecords.date, today),
          lte(attendanceRecords.date, tomorrow),
          eq(attendanceRecords.departureStatus, 'early'),
          isNotNull(attendanceRecords.checkOut)
        )
      );

    // Get departure status totals
    const [departureCounts] = await db
      .select({
        totalEarly: sql<number>`COUNT(CASE WHEN ${attendanceRecords.departureStatus} = 'early' THEN 1 END)`,
        totalLate: sql<number>`COUNT(CASE WHEN ${attendanceRecords.departureStatus} = 'late' THEN 1 END)`,
        totalOnTime: sql<number>`COUNT(CASE WHEN ${attendanceRecords.departureStatus} = 'on_time' THEN 1 END)`
      })
      .from(attendanceRecords)
      .where(
        and(
          gte(attendanceRecords.date, today),
          lte(attendanceRecords.date, tomorrow),
          isNotNull(attendanceRecords.checkOut)
        )
      );

    // Format the results
    const formattedEarlyDepartures = earlyDepartures.map(emp => ({
      employeeCode: emp.employeeCode,
      employeeName: emp.employeeName,
      department: emp.department,
      checkOut: emp.checkOut!,
      expectedDeparture: this.calculateExpectedDeparture(emp.shiftName),
      earlyMinutes: emp.earlyDepartureMinutes,
      shift: emp.shiftName
    }));

    return {
      earlyDepartures: formattedEarlyDepartures,
      totalEarlyDepartures: departureCounts?.totalEarly || 0,
      totalLateDepartures: departureCounts?.totalLate || 0,
      totalOnTimeDepartures: departureCounts?.totalOnTime || 0
    };
  }

  /**
   * Calculate expected departure time based on shift
   */
  private calculateExpectedDeparture(shiftName: string): string {
    // Default to 5:00 PM if no shift
    if (!shiftName || shiftName === 'No Shift') {
      return '5:00 PM';
    }

    // Map common shift names to expected departure times
    const shiftTimes: { [key: string]: string } = {
      'SYS-EARLY': '2:30 PM',
      'SYS-STANDARD': '5:00 PM', 
      'SYS-LATE-MORNING': '6:00 PM',
      'SYS-AFTERNOON': '7:30 PM',
      'SYS-TECH': '10:30 PM',
      'PSCA-Morning': '3:00 PM',
      'PSCA-Evening': '11:00 PM',
      'PSCA-Night': '7:00 AM'
    };

    return shiftTimes[shiftName] || '5:00 PM';
  }

  /**
   * Process mobile punch through unified attendance system
   */
  async processMobilePunch(punchData: {
    employeeCode: string;
    punchType: 'checkin' | 'checkout';
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: Date;
    validationResult: any;
  }): Promise<{ punchId: number }> {
    // Create attendance record with mobile punch
    const attendanceId = await this.createAttendanceRecord(punchData);
    
    console.log(`[UnifiedAttendance] Mobile ${punchData.punchType} processed for ${punchData.employeeCode} at ${punchData.latitude},${punchData.longitude}`);
    
    return { punchId: attendanceId };
  }

  /**
   * Create attendance record for mobile punch
   */
  private async createAttendanceRecord(punchData: {
    employeeCode: string;
    punchType: 'checkin' | 'checkout';
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: Date;
  }): Promise<number> {
    const today = new Date(punchData.timestamp);
    today.setHours(0, 0, 0, 0);
    
    // Check if record exists for today
    const existingRecord = await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeCode, punchData.employeeCode),
          gte(attendanceRecords.date, today)
        )
      )
      .limit(1);
    
    if (existingRecord.length > 0) {
      // Update existing record
      const updateData = punchData.punchType === 'checkin' 
        ? { 
            checkIn: punchData.timestamp,
            latitude: punchData.latitude.toString(),
            longitude: punchData.longitude.toString(),
            punchSource: 'mobile' as const
          }
        : { 
            checkOut: punchData.timestamp,
            punchSource: 'mobile' as const
          };
      
      await db
        .update(attendanceRecords)
        .set(updateData)
        .where(eq(attendanceRecords.id, existingRecord[0].id));
      
      return existingRecord[0].id;
    } else {
      // Create new record
      const [newRecord] = await db
        .insert(attendanceRecords)
        .values({
          employeeCode: punchData.employeeCode,
          date: today,
          checkIn: punchData.punchType === 'checkin' ? punchData.timestamp : null,
          checkOut: punchData.punchType === 'checkout' ? punchData.timestamp : null,
          latitude: punchData.latitude.toString(),
          longitude: punchData.longitude.toString(),
          punchSource: 'mobile',
          status: 'active'
        })
        .returning({ id: attendanceRecords.id });
      
      return newRecord.id;
    }
  }
}

// Export singleton instance
export const unifiedAttendanceService = new UnifiedAttendanceService();