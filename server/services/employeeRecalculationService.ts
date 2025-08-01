import { db } from '../database.js';
import { users, employeeRecords, attendanceRecords } from '../../shared/schema.js';
import { sql, count, countDistinct, and, eq, ne, isNotNull } from 'drizzle-orm';

interface RecalculationResult {
  totalActiveEmployees: number;
  totalBiometricCapacity: number;
  totalNonBioEmployees: number;
  biometricEmployeesToday: number;
  nonBiometricEmployeesToday: number;
  recalculatedAt: Date;
  departmentBreakdown: Array<{
    department: string;
    totalEmployees: number;
    activeEmployees: number;
    biometricUsers: number;
    nonBioUsers: number;
  }>;
}

/**
 * Employee Recalculation Service
 * Provides functions to recalculate Non-bio and Total Employee metrics
 * for accurate dashboard statistics and workforce analytics
 */
class EmployeeRecalculationService {
  
  // Maximum biometric terminal capacity based on historical data analysis
  private static readonly MAX_BIOMETRIC_CAPACITY = 228;

  /**
   * Recalculate all employee metrics including Non-bio and Total Employees
   * This function should be called whenever employee statuses change significantly
   */
  async recalculateEmployeeMetrics(targetDate?: Date): Promise<RecalculationResult> {
    const calculationDate = targetDate || new Date();
    const dateStr = calculationDate.toISOString().split('T')[0];

    console.log(`[EmployeeRecalculation] Starting recalculation for date: ${dateStr}`);

    try {
      // Step 1: Calculate total active employees
      const [totalActiveUsers] = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.isActive, true));

      // Step 2: Calculate system accounts (admin/test accounts)
      const [totalSystemAccounts] = await db
        .select({ count: count() })
        .from(users)
        .where(
          and(
            eq(users.isActive, true),
            eq(users.accountType, 'system')
          )
        );

      // Step 3: Calculate total active employees with valid employee records
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

      const totalActiveEmployees = totalActiveUsers.count - totalSystemAccounts.count;

      // Step 4: Calculate biometric users for today
      const [biometricUsersToday] = await db
        .select({ count: countDistinct(attendanceRecords.employeeCode) })
        .from(attendanceRecords)
        .where(
          and(
            sql`DATE(${attendanceRecords.date}) = ${dateStr}`,
            isNotNull(attendanceRecords.checkIn),
            sql`(${attendanceRecords.punchSource} IS NULL OR ${attendanceRecords.punchSource} = 'terminal')`
          )
        );

      // Step 5: Calculate mobile users for today
      const [mobileUsersToday] = await db
        .select({ count: countDistinct(attendanceRecords.employeeCode) })
        .from(attendanceRecords)
        .where(
          and(
            sql`DATE(${attendanceRecords.date}) = ${dateStr}`,
            isNotNull(attendanceRecords.checkIn),
            eq(attendanceRecords.punchSource, 'mobile')
          )
        );

      // Step 6: Calculate Non-bio employees using maximum capacity approach
      // Non-bio = Total Active Employees - Maximum Biometric Capacity
      const totalNonBioEmployees = Math.max(0, totalActiveEmployees - EmployeeRecalculationService.MAX_BIOMETRIC_CAPACITY);

      // Step 7: Calculate actual non-biometric users today
      // These are employees who didn't use biometric terminals today
      const nonBiometricEmployeesToday = Math.max(0, totalActiveEmployees - biometricUsersToday.count - mobileUsersToday.count);

      // Step 8: Get department breakdown
      const departmentBreakdown = await this.calculateDepartmentBreakdown(dateStr);

      console.log(`[EmployeeRecalculation] Results - Total Active: ${totalActiveEmployees}, Biometric Today: ${biometricUsersToday.count}, Non-bio: ${totalNonBioEmployees}`);

      return {
        totalActiveEmployees,
        totalBiometricCapacity: EmployeeRecalculationService.MAX_BIOMETRIC_CAPACITY,
        totalNonBioEmployees,
        biometricEmployeesToday: biometricUsersToday.count,
        nonBiometricEmployeesToday,
        recalculatedAt: new Date(),
        departmentBreakdown
      };

    } catch (error) {
      console.error('[EmployeeRecalculation] Error during recalculation:', error);
      throw new Error(`Failed to recalculate employee metrics: ${error.message}`);
    }
  }

  /**
   * Calculate department-wise breakdown of employee metrics
   */
  private async calculateDepartmentBreakdown(dateStr: string): Promise<Array<{
    department: string;
    totalEmployees: number;
    activeEmployees: number;
    biometricUsers: number;
    nonBioUsers: number;
  }>> {
    const departmentStats = await db.execute(sql`
      SELECT 
        er.department,
        COUNT(DISTINCT er.employee_code) as total_employees,
        COUNT(DISTINCT CASE WHEN u.is_active = true THEN er.employee_code END) as active_employees,
        COUNT(DISTINCT CASE 
          WHEN ar.employee_code IS NOT NULL 
          AND (ar.punch_source IS NULL OR ar.punch_source = 'terminal')
          THEN ar.employee_code 
        END) as biometric_users,
        COUNT(DISTINCT CASE 
          WHEN ar.employee_code IS NOT NULL 
          AND ar.punch_source = 'mobile'
          THEN ar.employee_code 
        END) as mobile_users
      FROM employee_records er
      LEFT JOIN users u ON er.employee_code = u.employee_id
      LEFT JOIN attendance_records ar ON er.employee_code = ar.employee_code 
        AND DATE(ar.date) = ${dateStr}
        AND ar.check_in IS NOT NULL
      WHERE er.department NOT IN ('MIGRATED_TO_FORMER_EMPLOYEES', 'Unknown')
      GROUP BY er.department
      HAVING COUNT(DISTINCT er.employee_code) > 0
      ORDER BY active_employees DESC
    `);

    return departmentStats.map(row => {
      const totalEmployees = Number(row.total_employees) || 0;
      const activeEmployees = Number(row.active_employees) || 0;
      const biometricUsers = Number(row.biometric_users) || 0;
      const mobileUsers = Number(row.mobile_users) || 0;
      
      // Non-bio users = active employees who didn't use any attendance system today
      const nonBioUsers = Math.max(0, activeEmployees - biometricUsers - mobileUsers);

      return {
        department: String(row.department),
        totalEmployees,
        activeEmployees,
        biometricUsers: biometricUsers + mobileUsers, // Combined biometric + mobile
        nonBioUsers
      };
    });
  }

  /**
   * Update employee activation status based on recent biometric usage
   * Activates employees who are using biometric terminals but marked inactive
   */
  async updateEmployeeActivationStatus(daysBack: number = 7): Promise<{
    usersActivated: number;
    employeesUnstoppedPay: number;
    affectedDepartments: string[];
  }> {
    console.log(`[EmployeeRecalculation] Updating activation status for employees with biometric usage in last ${daysBack} days`);

    try {
      // Activate users who have recent biometric attendance but are inactive
      const usersActivatedResult = await db.execute(sql`
        UPDATE users 
        SET is_active = true 
        WHERE employee_id IN (
          SELECT DISTINCT ar.employee_code
          FROM attendance_records ar
          JOIN employee_records er ON ar.employee_code = er.employee_code
          LEFT JOIN users u ON ar.employee_code = u.employee_id
          WHERE ar.date >= CURRENT_DATE - INTERVAL '${daysBack} days'
            AND (ar.punch_source = 'terminal' OR ar.punch_source IS NULL)
            AND er.department NOT IN ('MIGRATED_TO_FORMER_EMPLOYEES', 'Unknown')
            AND (u.is_active = false OR u.is_active IS NULL)
        )
      `);

      // Unstop pay for employees with recent biometric attendance
      const employeesUnstoppedResult = await db.execute(sql`
        UPDATE employee_records 
        SET stop_pay = false, stoppay = 'false' 
        WHERE employee_code IN (
          SELECT DISTINCT ar.employee_code
          FROM attendance_records ar
          JOIN employee_records er ON ar.employee_code = er.employee_code
          WHERE ar.date >= CURRENT_DATE - INTERVAL '${daysBack} days'
            AND (ar.punch_source = 'terminal' OR ar.punch_source IS NULL)
            AND er.department NOT IN ('MIGRATED_TO_FORMER_EMPLOYEES', 'Unknown')
            AND (er.stop_pay = true OR er.stoppay = 'true')
        )
      `);

      // Get affected departments
      const affectedDepartments = await db.execute(sql`
        SELECT DISTINCT er.department
        FROM attendance_records ar
        JOIN employee_records er ON ar.employee_code = er.employee_code
        WHERE ar.date >= CURRENT_DATE - INTERVAL '${daysBack} days'
          AND (ar.punch_source = 'terminal' OR ar.punch_source IS NULL)
          AND er.department NOT IN ('MIGRATED_TO_FORMER_EMPLOYEES', 'Unknown')
        ORDER BY er.department
      `);

      const usersActivated = usersActivatedResult.rowCount || 0;
      const employeesUnstopped = employeesUnstoppedResult.rowCount || 0;
      const departments = affectedDepartments.map(row => String(row.department));

      console.log(`[EmployeeRecalculation] Updated activation - Users: ${usersActivated}, Employees: ${employeesUnstopped}, Departments: ${departments.length}`);

      return {
        usersActivated,
        employeesUnstoppedPay: employeesUnstopped,
        affectedDepartments: departments
      };

    } catch (error) {
      console.error('[EmployeeRecalculation] Error updating activation status:', error);
      throw new Error(`Failed to update activation status: ${error.message}`);
    }
  }

  /**
   * Get current employee statistics for validation
   */
  async getCurrentEmployeeStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    systemAccounts: number;
    employeeAccounts: number;
    stoppedPayEmployees: number;
    todayBiometricUsers: number;
    todayMobileUsers: number;
  }> {
    const today = new Date().toISOString().split('T')[0];

    const [totalUsers] = await db.select({ count: count() }).from(users);
    const [activeUsers] = await db.select({ count: count() }).from(users).where(eq(users.isActive, true));
    const [systemAccounts] = await db.select({ count: count() }).from(users).where(eq(users.accountType, 'system'));
    const [employeeAccounts] = await db.select({ count: count() }).from(users).where(eq(users.accountType, 'employee'));
    
    const [stoppedPayEmployees] = await db
      .select({ count: count() })
      .from(employeeRecords)
      .where(sql`${employeeRecords.stopPay} = true OR ${employeeRecords.stoppay} = 'true'`);

    const [todayBiometric] = await db
      .select({ count: countDistinct(attendanceRecords.employeeCode) })
      .from(attendanceRecords)
      .where(
        and(
          sql`DATE(${attendanceRecords.date}) = ${today}`,
          isNotNull(attendanceRecords.checkIn),
          sql`(${attendanceRecords.punchSource} IS NULL OR ${attendanceRecords.punchSource} = 'terminal')`
        )
      );

    const [todayMobile] = await db
      .select({ count: countDistinct(attendanceRecords.employeeCode) })
      .from(attendanceRecords)
      .where(
        and(
          sql`DATE(${attendanceRecords.date}) = ${today}`,
          isNotNull(attendanceRecords.checkIn),
          eq(attendanceRecords.punchSource, 'mobile')
        )
      );

    return {
      totalUsers: totalUsers.count,
      activeUsers: activeUsers.count,
      systemAccounts: systemAccounts.count,
      employeeAccounts: employeeAccounts.count,
      stoppedPayEmployees: stoppedPayEmployees.count,
      todayBiometricUsers: todayBiometric.count,
      todayMobileUsers: todayMobile.count
    };
  }
}

export default new EmployeeRecalculationService();
export { RecalculationResult };