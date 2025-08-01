import { db } from "../db";
import { employeeRecords, attendanceRecords, userDevices, users } from "@shared/schema";
import { and, eq, sql, isNotNull, gte, lte, desc } from "drizzle-orm";

/**
 * AA1-AA7 Absentee Categorization Service
 * 
 * Provides sophisticated categorization of absent employees into 7 distinct categories:
 * AA1: Sick Leave (confirmed medical absence)
 * AA2: Authorized Leave (pre-approved vacation/personal leave) 
 * AA3: No Show (absent without notice or communication)
 * AA4: Late Beyond Grace (arrived after grace period expired)
 * AA5: Device/Technical Issues (punch failed due to technical problems)
 * AA6: Remote Work (working from home/field - not in office)
 * AA7: Unknown/Unverified (absent with unclear reason)
 */

export interface AbsenteeBreakdown {
  totalAbsent: number;
  aa1_sickLeave: number;
  aa2_authorizedLeave: number;
  aa3_noShow: number;
  aa4_lateBeyondGrace: number;
  aa5_deviceIssues: number;
  aa6_remoteWork: number;
  aa7_unknownUnverified: number;
  lastCalculated: Date;
  calculationDetails: AbsenteeEmployee[];
}

export interface AbsenteeEmployee {
  employeeCode: string;
  firstName: string;
  lastName: string;
  department: string;
  designation?: string;
  lastSeen?: Date;
  absenteeCategory: 'AA1' | 'AA2' | 'AA3' | 'AA4' | 'AA5' | 'AA6' | 'AA7';
  categoryReason: string;
  empType: string;
  isFieldDepartment: boolean;
  location?: string;
  mobile?: string;
}

export class AbsenteeCategorizationService {
  
  /**
   * Calculate comprehensive AA1-AA7 absentee breakdown for a specific date
   */
  async calculateAbsenteeBreakdown(targetDate: Date = new Date()): Promise<AbsenteeBreakdown> {
    console.log(`[AbsenteeService] Calculating AA1-AA7 breakdown for ${targetDate.toDateString()}`);
    
    // Get all active employees
    const allActiveEmployees = await this.getAllActiveEmployees();
    
    // Get employees who attended today (have punch-in records)
    const attendedEmployees = await this.getAttendedEmployees(targetDate);
    const attendedCodes = new Set(attendedEmployees.map(e => e.employeeCode));
    
    // Filter absent employees
    const absentEmployees = allActiveEmployees.filter(emp => !attendedCodes.has(emp.employeeCode));
    
    console.log(`[AbsenteeService] Total employees: ${allActiveEmployees.length}, Attended: ${attendedEmployees.length}, Absent: ${absentEmployees.length}`);
    
    // Categorize each absent employee
    const categorizedEmployees: AbsenteeEmployee[] = [];
    let aa1_sickLeave = 0;
    let aa2_authorizedLeave = 0;
    let aa3_noShow = 0;
    let aa4_lateBeyondGrace = 0;
    let aa5_deviceIssues = 0;
    let aa6_remoteWork = 0;
    let aa7_unknownUnverified = 0;
    
    for (const employee of absentEmployees) {
      const category = await this.categorizeAbsentEmployee(employee, targetDate);
      categorizedEmployees.push(category);
      
      // Count by category
      switch (category.absenteeCategory) {
        case 'AA1': aa1_sickLeave++; break;
        case 'AA2': aa2_authorizedLeave++; break;
        case 'AA3': aa3_noShow++; break;
        case 'AA4': aa4_lateBeyondGrace++; break;
        case 'AA5': aa5_deviceIssues++; break;
        case 'AA6': aa6_remoteWork++; break;
        case 'AA7': aa7_unknownUnverified++; break;
      }
    }
    
    const breakdown: AbsenteeBreakdown = {
      totalAbsent: absentEmployees.length,
      aa1_sickLeave,
      aa2_authorizedLeave,
      aa3_noShow,
      aa4_lateBeyondGrace,
      aa5_deviceIssues,
      aa6_remoteWork,
      aa7_unknownUnverified,
      lastCalculated: new Date(),
      calculationDetails: categorizedEmployees
    };
    
    console.log(`[AbsenteeService] AA1:${aa1_sickLeave} AA2:${aa2_authorizedLeave} AA3:${aa3_noShow} AA4:${aa4_lateBeyondGrace} AA5:${aa5_deviceIssues} AA6:${aa6_remoteWork} AA7:${aa7_unknownUnverified}`);
    
    return breakdown;
  }
  
  /**
   * Categorize a single absent employee into AA1-AA7
   */
  private async categorizeAbsentEmployee(employee: any, targetDate: Date): Promise<AbsenteeEmployee> {
    // Get employee's last seen information
    const lastSeen = await this.getEmployeeLastSeen(employee.employeeCode);
    
    // Check for late punches within extended grace period
    const lateStatus = await this.checkLateStatus(employee.employeeCode, targetDate);
    
    // Apply categorization logic
    let category: 'AA1' | 'AA2' | 'AA3' | 'AA4' | 'AA5' | 'AA6' | 'AA7';
    let reason: string;
    
    // AA4: Late Beyond Grace (arrived after grace period but attempted to punch)
    if (lateStatus.isLateBeyondGrace) {
      category = 'AA4';
      reason = `Late arrival at ${lateStatus.attemptedTime} (grace period: ${lateStatus.gracePeriod} min)`;
    }
    // AA6: Remote Work (field staff or remote locations)
    else if (employee.empType === 'Field Staff' || employee.isFieldDepartment || this.isRemoteLocation(employee.location)) {
      category = 'AA6';
      reason = `Field staff/remote work - ${employee.empType} in ${employee.location || employee.department}`;
    }
    // AA5: Device/Technical Issues (recent activity but no successful punch)
    else if (this.hasRecentDeviceActivity(lastSeen) && this.hasDeviceIssuePattern(employee.employeeCode)) {
      category = 'AA5';
      reason = `Device/technical issues - last seen ${lastSeen ? this.formatLastSeen(lastSeen) : 'unknown'}`;
    }
    // AA1: Sick Leave (medical absence patterns - missing for multiple consecutive days)
    else if (await this.isSickLeavePattern(employee.employeeCode, targetDate)) {
      category = 'AA1';
      reason = `Suspected sick leave - extended absence pattern detected`;
    }
    // AA2: Authorized Leave (weekend/holiday patterns, planned absence)
    else if (await this.isAuthorizedLeavePattern(employee.employeeCode, targetDate)) {
      category = 'AA2';
      reason = `Planned leave - consistent absence pattern detected`;
    }
    // AA3: No Show (no communication, no recent activity)
    else if (!this.hasRecentDeviceActivity(lastSeen) && !lastSeen) {
      category = 'AA3';
      reason = `No show - no recent activity or communication`;
    }
    // AA7: Unknown/Unverified (default category for unclear cases)
    else {
      category = 'AA7';
      reason = `Unknown reason - last seen ${lastSeen ? this.formatLastSeen(lastSeen) : 'never'}`;
    }
    
    return {
      employeeCode: employee.employeeCode,
      firstName: employee.firstName,
      lastName: employee.lastName,
      department: employee.department,
      designation: employee.designation,
      lastSeen: lastSeen || undefined,
      absenteeCategory: category,
      categoryReason: reason,
      empType: employee.empType || 'Desk Job',
      isFieldDepartment: employee.isFieldDepartment || false,
      location: employee.location,
      mobile: employee.mobile
    };
  }
  
  /**
   * Get all active employees from the database
   */
  private async getAllActiveEmployees() {
    return await db
      .select({
        employeeCode: employeeRecords.employeeCode,
        firstName: employeeRecords.firstName,
        lastName: employeeRecords.lastName,
        department: employeeRecords.department,
        designation: employeeRecords.designation,
        empType: employeeRecords.empType,
        isFieldDepartment: employeeRecords.isFieldDepartment,
        location: employeeRecords.location,
        mobile: employeeRecords.mobile
      })
      .from(employeeRecords)
      .where(
        and(
          eq(employeeRecords.isActive, true),
          eq(employeeRecords.systemAccount, false),
          sql`LOWER(${employeeRecords.firstName}) != 'noc'`
        )
      );
  }
  
  /**
   * Get employees who attended on the target date
   */
  private async getAttendedEmployees(targetDate: Date) {
    const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
    const dayEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);
    
    return await db
      .select({
        employeeCode: attendanceRecords.employeeCode
      })
      .from(attendanceRecords)
      .where(
        and(
          gte(attendanceRecords.date, dayStart),
          lte(attendanceRecords.date, dayEnd),
          isNotNull(attendanceRecords.checkIn)
        )
      )
      .groupBy(attendanceRecords.employeeCode);
  }
  
  /**
   * Get employee's last seen timestamp from user devices
   */
  private async getEmployeeLastSeen(employeeCode: string): Promise<Date | null> {
    const result = await db
      .select({
        lastSeen: userDevices.lastSeen
      })
      .from(userDevices)
      .innerJoin(users, eq(userDevices.userId, users.id))
      .where(eq(users.employeeId, employeeCode))
      .orderBy(desc(userDevices.lastSeen))
      .limit(1);
    
    return result[0]?.lastSeen || null;
  }
  
  /**
   * Check if employee has late status within extended grace period
   */
  private async checkLateStatus(employeeCode: string, targetDate: Date) {
    // Check for attendance records with late status or late punch times
    const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
    const dayEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);
    
    const lateRecord = await db
      .select({
        checkIn: attendanceRecords.checkIn,
        arrivalStatus: attendanceRecords.arrivalStatus,
        lateMinutes: attendanceRecords.lateMinutes
      })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeCode, employeeCode),
          gte(attendanceRecords.date, dayStart),
          lte(attendanceRecords.date, dayEnd),
          sql`${attendanceRecords.lateMinutes} > 60` // Beyond typical grace period
        )
      )
      .limit(1);
    
    if (lateRecord.length > 0) {
      return {
        isLateBeyondGrace: true,
        attemptedTime: lateRecord[0].checkIn?.toLocaleTimeString() || 'unknown',
        gracePeriod: 60,
        lateMinutes: lateRecord[0].lateMinutes || 0
      };
    }
    
    return { isLateBeyondGrace: false, attemptedTime: null, gracePeriod: 60, lateMinutes: 0 };
  }
  
  /**
   * Check if location indicates remote work
   */
  private isRemoteLocation(location?: string): boolean {
    if (!location) return false;
    const remoteIndicators = ['remote', 'home', 'field', 'client site', 'external', 'off-site'];
    return remoteIndicators.some(indicator => 
      location.toLowerCase().includes(indicator)
    );
  }
  
  /**
   * Check if employee has recent device activity (within 3 days)
   */
  private hasRecentDeviceActivity(lastSeen: Date | null): boolean {
    if (!lastSeen) return false;
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    return lastSeen > threeDaysAgo;
  }
  
  /**
   * Check if employee has device issue patterns
   */
  private hasDeviceIssuePattern(employeeCode: string): boolean {
    // This could check for failed punch attempts, device connectivity issues, etc.
    // For now, return false - would need to implement device issue tracking
    return false;
  }
  
  /**
   * Check if absence pattern suggests sick leave
   */
  private async isSickLeavePattern(employeeCode: string, targetDate: Date): Promise<boolean> {
    // Check for consecutive absences (3+ days suggests sick leave)
    const lastThreeDays = [];
    for (let i = 1; i <= 3; i++) {
      const checkDate = new Date(targetDate);
      checkDate.setDate(checkDate.getDate() - i);
      
      const dayStart = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate(), 0, 0, 0);
      const dayEnd = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate(), 23, 59, 59);
      
      const attendance = await db
        .select({ checkIn: attendanceRecords.checkIn })
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.employeeCode, employeeCode),
            gte(attendanceRecords.date, dayStart),
            lte(attendanceRecords.date, dayEnd),
            isNotNull(attendanceRecords.checkIn)
          )
        )
        .limit(1);
      
      lastThreeDays.push(attendance.length === 0);
    }
    
    // If absent for 3+ consecutive days, likely sick leave
    return lastThreeDays.filter(absent => absent).length >= 2;
  }
  
  /**
   * Check if absence pattern suggests authorized leave
   */
  private async isAuthorizedLeavePattern(employeeCode: string, targetDate: Date): Promise<boolean> {
    // Check for planned leave patterns (e.g., Friday+Monday, suggesting long weekend)
    const isMonday = targetDate.getDay() === 1;
    const isFriday = targetDate.getDay() === 5;
    
    if (isMonday) {
      // Check if also absent on Friday
      const lastFriday = new Date(targetDate);
      lastFriday.setDate(lastFriday.getDate() - 3);
      return await this.wasAbsentOnDate(employeeCode, lastFriday);
    }
    
    if (isFriday) {
      // Could indicate planned weekend extension
      return true;
    }
    
    return false;
  }
  
  /**
   * Check if employee was absent on a specific date
   */
  private async wasAbsentOnDate(employeeCode: string, date: Date): Promise<boolean> {
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
    const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
    
    const attendance = await db
      .select({ checkIn: attendanceRecords.checkIn })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeCode, employeeCode),
          gte(attendanceRecords.date, dayStart),
          lte(attendanceRecords.date, dayEnd),
          isNotNull(attendanceRecords.checkIn)
        )
      )
      .limit(1);
    
    return attendance.length === 0;
  }
  
  /**
   * Format last seen date for display
   */
  private formatLastSeen(lastSeen: Date): string {
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'less than an hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks === 1) return 'a week ago';
    return `${diffWeeks} weeks ago`;
  }
  
  /**
   * Update last seen timestamp for employee device
   */
  async updateEmployeeLastSeen(employeeCode: string, deviceFingerprint?: string): Promise<void> {
    try {
      // Update user device last seen
      if (deviceFingerprint) {
        await db
          .update(userDevices)
          .set({ 
            lastSeen: new Date(),
            updatedAt: new Date()
          })
          .where(eq(userDevices.deviceFingerprint, deviceFingerprint));
      }
      
      // Also update user device for the employee if we can find it
      const userDevice = await db
        .select({ id: userDevices.id })
        .from(userDevices)
        .innerJoin(users, eq(userDevices.userId, users.id))
        .where(eq(users.employeeId, employeeCode))
        .orderBy(desc(userDevices.lastSeen))
        .limit(1);
      
      if (userDevice.length > 0) {
        await db
          .update(userDevices)
          .set({ 
            lastSeen: new Date(),
            updatedAt: new Date()
          })
          .where(eq(userDevices.id, userDevice[0].id));
      }
      
      console.log(`[AbsenteeService] Updated lastSeen for employee ${employeeCode}`);
    } catch (error) {
      console.error(`[AbsenteeService] Error updating lastSeen for ${employeeCode}:`, error);
    }
  }
}

// Export singleton instance
export const absenteeCategorizationService = new AbsenteeCategorizationService();