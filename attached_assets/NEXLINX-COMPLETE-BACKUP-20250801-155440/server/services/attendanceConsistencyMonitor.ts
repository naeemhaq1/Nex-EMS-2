import { db } from '../db';
import { attendanceRecords, employeeRecords } from '@shared/schema';
import { eq, and, gte, lte, sql, count } from 'drizzle-orm';
import { EventEmitter } from 'events';

interface ConsistencyMetrics {
  totalEmployees: number;
  uniqueAttendees: number;
  nonBioEmployees: number;
  totalAttendance: number;
  absentees: number;
  attendanceRate: number;
  isConsistent: boolean;
  issues: string[];
}

export class AttendanceConsistencyMonitor extends EventEmitter {
  private isRunning = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private intervalMinutes = 10; // Check every 10 minutes
  private minAttendanceRate = 80; // Minimum expected attendance rate
  private consecutiveFailures = 0;
  private lastCheckTime: Date | null = null;

  constructor() {
    super();
  }

  async start() {
    if (this.isRunning) {
      console.log('[AttendanceConsistencyMonitor] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[AttendanceConsistencyMonitor] Starting consistency monitoring...');

    // Initial check
    await this.performConsistencyCheck();

    // Schedule regular checks
    this.monitoringInterval = setInterval(async () => {
      await this.performConsistencyCheck();
    }, this.intervalMinutes * 60 * 1000);

    console.log(`[AttendanceConsistencyMonitor] Monitoring started - checking every ${this.intervalMinutes} minutes`);
  }

  async stop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('[AttendanceConsistencyMonitor] Monitoring stopped');
  }

  private async performConsistencyCheck(): Promise<ConsistencyMetrics> {
    const startTime = Date.now();
    console.log('[AttendanceConsistencyMonitor] 🔍 Performing consistency check...');

    try {
      // Get today's date in Pakistan timezone
      const today = new Date();
      const pakistanTime = new Date(today.toLocaleString("en-US", {timeZone: "Asia/Karachi"}));
      
      const startOfDay = new Date(pakistanTime);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(pakistanTime);
      endOfDay.setHours(23, 59, 59, 999);

      // Get metrics for today
      const metrics = await this.calculateConsistencyMetrics(startOfDay, endOfDay);

      // Update tracking
      this.lastCheckTime = new Date();
      this.consecutiveFailures = metrics.isConsistent ? 0 : this.consecutiveFailures + 1;

      // Log results
      const elapsed = Date.now() - startTime;
      if (metrics.isConsistent) {
        console.log(`[AttendanceConsistencyMonitor] ✅ Consistency check passed in ${elapsed}ms`);
        console.log(`[AttendanceConsistencyMonitor] Attendance rate: ${metrics.attendanceRate.toFixed(1)}%`);
      } else {
        console.log(`[AttendanceConsistencyMonitor] ⚠️ Consistency issues detected in ${elapsed}ms`);
        console.log(`[AttendanceConsistencyMonitor] Attendance rate: ${metrics.attendanceRate.toFixed(1)}%`);
        metrics.issues.forEach(issue => console.log(`  - ${issue}`));
      }

      // Emit events
      this.emit('consistencyCheck', metrics);
      
      if (!metrics.isConsistent) {
        this.emit('consistencyFailure', metrics);
      }

      return metrics;

    } catch (error) {
      console.error('[AttendanceConsistencyMonitor] Error during consistency check:', error);
      this.consecutiveFailures++;
      
      const errorMetrics: ConsistencyMetrics = {
        totalEmployees: 0,
        uniqueAttendees: 0,
        nonBioEmployees: 0,
        totalAttendance: 0,
        absentees: 0,
        attendanceRate: 0,
        isConsistent: false,
        issues: [`Check failed: ${error.message}`]
      };

      this.emit('consistencyError', errorMetrics);
      return errorMetrics;
    }
  }

  private async calculateConsistencyMetrics(startOfDay: Date, endOfDay: Date): Promise<ConsistencyMetrics> {
    // Get unique attendance count for today
    const attendanceResult = await db.execute(sql`
      SELECT COUNT(DISTINCT employee_code) as unique_employees
      FROM attendance_records 
      WHERE date >= ${startOfDay.toISOString()}::date
      AND date <= ${endOfDay.toISOString()}::date
    `);

    // Get NonBio count from biometric_exemptions table (correct source)
    const nonBioResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM biometric_exemptions 
      WHERE is_active = true 
      AND exemption_type = 'individual'
    `);

    // Get total employees
    const totalResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM employee_records 
      WHERE is_active = true 
      AND system_account = false
    `);

    const uniqueAttendees = attendanceResult[0]?.unique_employees || 0;
    const nonBioEmployees = nonBioResult[0]?.count || 0;
    const totalEmployees = totalResult[0]?.count || 0;

    const totalAttendance = uniqueAttendees + nonBioEmployees;
    const absentees = totalEmployees - totalAttendance;
    const attendanceRate = totalEmployees > 0 ? (totalAttendance / totalEmployees) * 100 : 0;

    // Check for consistency issues
    const issues: string[] = [];
    let isConsistent = true;

    if (attendanceRate < this.minAttendanceRate) {
      issues.push(`Low attendance rate: ${attendanceRate.toFixed(1)}% (expected >=${this.minAttendanceRate}%)`);
      isConsistent = false;
    }

    if (uniqueAttendees === 0 && nonBioEmployees === 0) {
      issues.push('No attendance data found - potential sync failure');
      isConsistent = false;
    }

    if (totalEmployees === 0) {
      issues.push('No active employees found in database');
      isConsistent = false;
    }

    // Check for data anomalies
    if (uniqueAttendees > totalEmployees) {
      issues.push(`Attendance records exceed total employees: ${uniqueAttendees} > ${totalEmployees}`);
      isConsistent = false;
    }

    return {
      totalEmployees,
      uniqueAttendees,
      nonBioEmployees,
      totalAttendance,
      absentees,
      attendanceRate,
      isConsistent,
      issues
    };
  }

  async getStatus(): Promise<{
    isRunning: boolean;
    intervalMinutes: number;
    minAttendanceRate: number;
    consecutiveFailures: number;
    lastCheckTime: Date | null;
  }> {
    return {
      isRunning: this.isRunning,
      intervalMinutes: this.intervalMinutes,
      minAttendanceRate: this.minAttendanceRate,
      consecutiveFailures: this.consecutiveFailures,
      lastCheckTime: this.lastCheckTime
    };
  }

  updateConfig(config: {
    intervalMinutes?: number;
    minAttendanceRate?: number;
  }) {
    if (config.intervalMinutes) {
      this.intervalMinutes = config.intervalMinutes;
      
      // Restart monitoring with new interval
      if (this.isRunning) {
        this.stop();
        this.start();
      }
    }

    if (config.minAttendanceRate) {
      this.minAttendanceRate = config.minAttendanceRate;
    }

    console.log('[AttendanceConsistencyMonitor] Configuration updated:', {
      intervalMinutes: this.intervalMinutes,
      minAttendanceRate: this.minAttendanceRate
    });
  }
}

// Export singleton instance
export const attendanceConsistencyMonitor = new AttendanceConsistencyMonitor();