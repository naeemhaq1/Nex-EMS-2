import { db } from "../db";
import { userDevices, users, attendanceRecords, employeeRecords } from "@shared/schema";
import { eq, desc, and, gte, lte, isNotNull } from "drizzle-orm";

/**
 * Enhanced Last Seen Tracking Service
 * 
 * Tracks and updates employee last seen timestamps across all interaction points:
 * - Device login/authentication
 * - Attendance punches (check-in, check-out, break)
 * - Mobile app activity
 * - Dashboard access
 * - Any system interaction
 */

export interface LastSeenInfo {
  employeeCode: string;
  deviceFingerprint?: string;
  lastSeen: Date;
  deviceType: string;
  platform: string;
  browser: string;
  lastActivity: 'login' | 'punch' | 'dashboard' | 'mobile' | 'api' | 'unknown';
  hoursAgo: number;
  daysAgo: number;
  formattedLastSeen: string;
}

export class LastSeenTrackingService {
  
  /**
   * Update last seen timestamp for any employee interaction
   */
  async updateLastSeen(
    employeeCode: string, 
    activityType: 'login' | 'punch' | 'dashboard' | 'mobile' | 'api' = 'api',
    deviceFingerprint?: string,
    additionalData?: any
  ): Promise<void> {
    try {
      const now = new Date();
      
      console.log(`[LastSeen] Updating for ${employeeCode} - ${activityType} ${deviceFingerprint ? `on ${deviceFingerprint}` : ''}`);
      
      // Update specific device if fingerprint provided
      if (deviceFingerprint) {
        await db
          .update(userDevices)
          .set({ 
            lastSeen: now,
            updatedAt: now,
            loginCount: additionalData?.incrementLogin ? 
              (await this.getDeviceLoginCount(deviceFingerprint)) + 1 : undefined
          })
          .where(eq(userDevices.deviceFingerprint, deviceFingerprint));
      }
      
      // Update all devices for this employee (find by employeeId)
      const userDevicesForEmployee = await db
        .select({ 
          deviceId: userDevices.id,
          deviceFingerprint: userDevices.deviceFingerprint
        })
        .from(userDevices)
        .innerJoin(users, eq(userDevices.userId, users.id))
        .where(eq(users.employeeId, employeeCode));
      
      if (userDevicesForEmployee.length > 0) {
        // Update all devices for this employee
        for (const device of userDevicesForEmployee) {
          await db
            .update(userDevices)
            .set({ 
              lastSeen: now,
              updatedAt: now
            })
            .where(eq(userDevices.id, device.deviceId));
        }
        
        console.log(`[LastSeen] Updated ${userDevicesForEmployee.length} devices for ${employeeCode}`);
      } else {
        console.log(`[LastSeen] No devices found for employee ${employeeCode}`);
      }
      
    } catch (error) {
      console.error(`[LastSeen] Error updating lastSeen for ${employeeCode}:`, error);
    }
  }
  
  /**
   * Track attendance punch activity and update last seen + lasttime
   */
  async trackAttendancePunch(
    employeeCode: string, 
    punchType: 'check_in' | 'check_out' | 'break_in' | 'break_out',
    deviceFingerprint?: string,
    punchSource: 'terminal' | 'mobile_app' | 'admin' = 'terminal'
  ): Promise<void> {
    try {
      const punchTime = new Date();
      
      // Update last seen for punch activity
      await this.updateLastSeen(employeeCode, 'punch', deviceFingerprint, {
        punchType,
        punchSource,
        timestamp: punchTime
      });
      
      // Update lasttime specifically for punch timing
      await this.updateLastPunchTime(employeeCode, punchTime, punchType, punchSource);
      
      console.log(`[LastSeen] Tracked ${punchType} punch for ${employeeCode} from ${punchSource} at ${punchTime.toISOString()}`);
      
    } catch (error) {
      console.error(`[LastSeen] Error tracking punch for ${employeeCode}:`, error);
    }
  }

  /**
   * Update lasttime and lastbpunch fields for attendance punch timing in employee records
   */
  async updateLastPunchTime(
    employeeCode: string,
    punchTime: Date,
    punchType: string,
    punchSource: string
  ): Promise<void> {
    try {
      // Determine if this is a biometric punch
      const isBiometricPunch = punchSource === 'terminal' || punchSource === 'biometric';
      
      // Prepare update object - always update lasttime
      const updateData: any = {
        lasttime: punchTime,
        updatedAt: new Date()
      };
      
      // Only update lastbpunch if this is a biometric punch
      if (isBiometricPunch) {
        updateData.lastbpunch = punchTime;
      }

      // Update employee records table
      const result = await db.update(employeeRecords)
        .set(updateData)
        .where(eq(employeeRecords.employeeCode, employeeCode));

      const punchTypeLog = isBiometricPunch ? 'biometric+general' : 'general only';
      console.log(`[LastTime] Updated ${punchTypeLog} punch time for employee ${employeeCode}: ${punchTime.toISOString()} (${punchType} via ${punchSource})`);
    } catch (error) {
      console.error('[LastTime] Error updating punch times:', error);
    }
  }
  
  /**
   * Track login activity
   */
  async trackLogin(
    employeeCode: string,
    deviceFingerprint: string,
    loginData: any
  ): Promise<void> {
    try {
      await this.updateLastSeen(employeeCode, 'login', deviceFingerprint, {
        incrementLogin: true,
        loginData,
        timestamp: new Date()
      });
      
      console.log(`[LastSeen] Tracked login for ${employeeCode}`);
      
    } catch (error) {
      console.error(`[LastSeen] Error tracking login for ${employeeCode}:`, error);
    }
  }
  
  /**
   * Track dashboard/mobile app activity
   */
  async trackDashboardActivity(
    employeeCode: string,
    activityType: 'dashboard' | 'mobile' = 'dashboard',
    deviceFingerprint?: string
  ): Promise<void> {
    try {
      await this.updateLastSeen(employeeCode, activityType, deviceFingerprint);
      
    } catch (error) {
      console.error(`[LastSeen] Error tracking dashboard activity for ${employeeCode}:`, error);
    }
  }
  
  /**
   * Get detailed last seen information for an employee
   */
  async getEmployeeLastSeen(employeeCode: string): Promise<LastSeenInfo | null> {
    try {
      const result = await db
        .select({
          deviceFingerprint: userDevices.deviceFingerprint,
          lastSeen: userDevices.lastSeen,
          deviceType: userDevices.deviceType,
          platform: userDevices.platform,
          browser: userDevices.browser,
          operatingSystem: userDevices.operatingSystem
        })
        .from(userDevices)
        .innerJoin(users, eq(userDevices.userId, users.id))
        .where(eq(users.employeeId, employeeCode))
        .orderBy(desc(userDevices.lastSeen))
        .limit(1);
      
      if (result.length === 0) return null;
      
      const device = result[0];
      const now = new Date();
      const diffMs = now.getTime() - device.lastSeen.getTime();
      const hoursAgo = Math.floor(diffMs / (1000 * 60 * 60));
      const daysAgo = Math.floor(hoursAgo / 24);
      
      return {
        employeeCode,
        deviceFingerprint: device.deviceFingerprint,
        lastSeen: device.lastSeen,
        deviceType: device.deviceType,
        platform: device.platform,
        browser: device.browser,
        lastActivity: 'unknown', // Would need activity tracking to determine
        hoursAgo,
        daysAgo,
        formattedLastSeen: this.formatLastSeen(device.lastSeen)
      };
      
    } catch (error) {
      console.error(`[LastSeen] Error getting lastSeen for ${employeeCode}:`, error);
      return null;
    }
  }
  
  /**
   * Get last seen information for multiple employees
   */
  async getMultipleEmployeesLastSeen(employeeCodes: string[]): Promise<Map<string, LastSeenInfo>> {
    const results = new Map<string, LastSeenInfo>();
    
    try {
      for (const employeeCode of employeeCodes) {
        const lastSeen = await this.getEmployeeLastSeen(employeeCode);
        if (lastSeen) {
          results.set(employeeCode, lastSeen);
        }
      }
      
    } catch (error) {
      console.error(`[LastSeen] Error getting multiple lastSeen:`, error);
    }
    
    return results;
  }
  
  /**
   * Get employees last seen within a specific timeframe
   */
  async getEmployeesLastSeenWithin(hours: number): Promise<LastSeenInfo[]> {
    try {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - hours);
      
      const results = await db
        .select({
          employeeCode: users.employeeId,
          deviceFingerprint: userDevices.deviceFingerprint,
          lastSeen: userDevices.lastSeen,
          deviceType: userDevices.deviceType,
          platform: userDevices.platform,
          browser: userDevices.browser
        })
        .from(userDevices)
        .innerJoin(users, eq(userDevices.userId, users.id))
        .where(
          and(
            gte(userDevices.lastSeen, cutoffTime),
            isNotNull(users.employeeId)
          )
        )
        .orderBy(desc(userDevices.lastSeen));
      
      return results.map(device => {
        const now = new Date();
        const diffMs = now.getTime() - device.lastSeen.getTime();
        const hoursAgo = Math.floor(diffMs / (1000 * 60 * 60));
        const daysAgo = Math.floor(hoursAgo / 24);
        
        return {
          employeeCode: device.employeeCode!,
          deviceFingerprint: device.deviceFingerprint,
          lastSeen: device.lastSeen,
          deviceType: device.deviceType,
          platform: device.platform,
          browser: device.browser,
          lastActivity: 'unknown',
          hoursAgo,
          daysAgo,
          formattedLastSeen: this.formatLastSeen(device.lastSeen)
        };
      });
      
    } catch (error) {
      console.error(`[LastSeen] Error getting employees within timeframe:`, error);
      return [];
    }
  }
  
  /**
   * Get device login count
   */
  private async getDeviceLoginCount(deviceFingerprint: string): Promise<number> {
    try {
      const result = await db
        .select({ loginCount: userDevices.loginCount })
        .from(userDevices)
        .where(eq(userDevices.deviceFingerprint, deviceFingerprint))
        .limit(1);
      
      return result[0]?.loginCount || 0;
      
    } catch (error) {
      console.error(`[LastSeen] Error getting login count:`, error);
      return 0;
    }
  }
  
  /**
   * Format last seen timestamp for human reading
   */
  private formatLastSeen(lastSeen: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
    }
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months !== 1 ? 's' : ''} ago`;
    }
    
    const years = Math.floor(diffDays / 365);
    return `${years} year${years !== 1 ? 's' : ''} ago`;
  }
  
  /**
   * Track API activity
   */
  async trackAPIActivity(employeeCode: string, endpoint: string, deviceFingerprint?: string): Promise<void> {
    try {
      await this.updateLastSeen(employeeCode, 'api', deviceFingerprint, {
        endpoint,
        timestamp: new Date()
      });
      
    } catch (error) {
      console.error(`[LastSeen] Error tracking API activity for ${employeeCode}:`, error);
    }
  }
  
  /**
   * Get last punch activity for correlation with last seen
   */
  async getLastPunchActivity(employeeCode: string): Promise<any> {
    try {
      const result = await db
        .select({
          date: attendanceRecords.date,
          checkIn: attendanceRecords.checkIn,
          checkOut: attendanceRecords.checkOut,
          punchSource: attendanceRecords.punchSource
        })
        .from(attendanceRecords)
        .where(eq(attendanceRecords.employeeCode, employeeCode))
        .orderBy(desc(attendanceRecords.date))
        .limit(1);
      
      return result[0] || null;
      
    } catch (error) {
      console.error(`[LastSeen] Error getting last punch for ${employeeCode}:`, error);
      return null;
    }
  }
}

// Export singleton instance
export const lastSeenTrackingService = new LastSeenTrackingService();