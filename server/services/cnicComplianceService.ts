import { db } from "../db";
import { employeeRecords } from "@shared/schema";
import { eq, and, sql, isNull, isNotNull } from "drizzle-orm";
import { log } from "../vite";

export class CnicComplianceService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastRunTime: Date | null = null;
  private nextRunTime: Date | null = null;

  constructor() {
    this.calculateNextRunTime();
  }

  private calculateNextRunTime() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0); // Run at 2 AM daily
    this.nextRunTime = tomorrow;
  }

  async start() {
    if (this.isRunning) {
      log('CNIC Compliance Service is already running', 'cnic-compliance');
      return;
    }

    this.isRunning = true;
    log('Starting CNIC Compliance Service', 'cnic-compliance');

    // Run immediately on startup
    await this.runComplianceCheck();

    // Schedule daily runs
    this.scheduleNextRun();
  }

  private scheduleNextRun() {
    if (this.intervalId) {
      clearTimeout(this.intervalId);
    }

    const now = new Date();
    const timeUntilNext = this.nextRunTime!.getTime() - now.getTime();

    log(`Next CNIC compliance check scheduled at: ${this.nextRunTime!.toLocaleString()}`, 'cnic-compliance');

    this.intervalId = setTimeout(async () => {
      await this.runComplianceCheck();
      this.calculateNextRunTime();
      this.scheduleNextRun();
    }, timeUntilNext);
  }

  async runComplianceCheck() {
    try {
      log('Starting CNIC compliance check...', 'cnic-compliance');
      const startTime = Date.now();

      // Step 1: Mark employees with missing CNICs (exclude system accounts)
      const missingCnicUpdate = await db
        .update(employeeRecords)
        .set({
          cnicMissing: 'yes',
          stopPay: true,
          updatedAt: new Date()
        })
        .where(and(
          eq(employeeRecords.isActive, true),
          eq(employeeRecords.systemAccount, false),
          isNull(employeeRecords.nationalId)
        ))
        .returning({ employeeCode: employeeRecords.employeeCode });

      log(`Updated ${missingCnicUpdate.length} employees with missing CNICs (cnic_missing = 'yes', stop_pay = true)`, 'cnic-compliance');

      // Step 2: Mark employees with CNICs as compliant (exclude system accounts)
      const hasCnicUpdate = await db
        .update(employeeRecords)
        .set({
          cnicMissing: 'no',
          stopPay: false,
          updatedAt: new Date()
        })
        .where(and(
          eq(employeeRecords.isActive, true),
          eq(employeeRecords.systemAccount, false),
          isNotNull(employeeRecords.nationalId)
        ))
        .returning({ employeeCode: employeeRecords.employeeCode });

      log(`Updated ${hasCnicUpdate.length} employees with CNICs (cnic_missing = 'no', stop_pay = false)`, 'cnic-compliance');

      // Step 3: Get summary statistics (exclude system accounts)
      const summary = await db
        .select({
          totalEmployees: sql<number>`COUNT(*)`,
          missingCnic: sql<number>`COUNT(CASE WHEN ${employeeRecords.nationalId} IS NULL THEN 1 END)`,
          hasCnic: sql<number>`COUNT(CASE WHEN ${employeeRecords.nationalId} IS NOT NULL THEN 1 END)`,
          stopPayEnabled: sql<number>`COUNT(CASE WHEN ${employeeRecords.stopPay} = true THEN 1 END)`,
          stopPayDisabled: sql<number>`COUNT(CASE WHEN ${employeeRecords.stopPay} = false THEN 1 END)`
        })
        .from(employeeRecords)
        .where(and(
          eq(employeeRecords.isActive, true),
          eq(employeeRecords.systemAccount, false)
        ));

      const stats = summary[0];
      
      const duration = Date.now() - startTime;
      this.lastRunTime = new Date();

      log(`CNIC compliance check completed in ${duration}ms`, 'cnic-compliance');
      log(`Summary: ${stats.totalEmployees} total employees, ${stats.missingCnic} missing CNICs, ${stats.hasCnic} with CNICs`, 'cnic-compliance');
      log(`STOPPAY Status: ${stats.stopPayEnabled} enabled, ${stats.stopPayDisabled} disabled`, 'cnic-compliance');

      // Log individual employee codes for audit trail
      if (missingCnicUpdate.length > 0) {
        log(`Employees marked as non-compliant: ${missingCnicUpdate.map(e => e.employeeCode).join(', ')}`, 'cnic-compliance');
      }

      return {
        success: true,
        timestamp: this.lastRunTime,
        duration,
        stats: {
          totalEmployees: Number(stats.totalEmployees),
          missingCnic: Number(stats.missingCnic),
          hasCnic: Number(stats.hasCnic),
          stopPayEnabled: Number(stats.stopPayEnabled),
          stopPayDisabled: Number(stats.stopPayDisabled)
        },
        updates: {
          missingCnicCount: missingCnicUpdate.length,
          hasCnicCount: hasCnicUpdate.length
        }
      };

    } catch (error) {
      log(`CNIC compliance check failed: ${error}`, 'cnic-compliance');
      throw error;
    }
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }

    log('CNIC Compliance Service stopped', 'cnic-compliance');
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRunTime: this.lastRunTime,
      nextRunTime: this.nextRunTime,
      serviceName: 'CNIC Compliance Service'
    };
  }

  // Manual trigger for testing
  async triggerManualCheck() {
    log('Manual CNIC compliance check triggered', 'cnic-compliance');
    return await this.runComplianceCheck();
  }
}

export const cnicComplianceService = new CnicComplianceService();