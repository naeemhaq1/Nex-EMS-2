import { db } from '../db';
import { attendancePullExt, attendanceRecords, employeeRecords } from '@shared/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { EventEmitter } from 'events';

interface PollingConfig {
  intervalMinutes: number;        // How often to poll (e.g., 5 minutes)
  overlapMinutes: number;         // Overlap buffer (e.g., 2 minutes)
  retrievalMinutes: number;       // How far back to retrieve (e.g., 7 minutes)
  maxRetries: number;            // Maximum retry attempts
  retryDelayMs: number;          // Delay between retries
  minAttendanceRate: number;     // Minimum expected attendance rate
  duplicateCleanupHours: number; // Keep duplicates for this many hours
}

interface PollResult {
  success: boolean;
  recordsPulled: number;
  recordsProcessed: number;
  uniqueEmployees: number;
  duplicatesHandled: number;
  timeRange: {
    start: Date;
    end: Date;
  };
  issues: string[];
}

export class IntelligentPollingService extends EventEmitter {
  private config: PollingConfig;
  private isRunning = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastPollTime: Date | null = null;
  private consecutiveFailures = 0;

  constructor(config: PollingConfig = {
    intervalMinutes: 5,
    overlapMinutes: 2,
    retrievalMinutes: 7,
    maxRetries: 3,
    retryDelayMs: 30000,
    minAttendanceRate: 80,
    duplicateCleanupHours: 24
  }) {
    super();
    this.config = config;
  }

  async start() {
    if (this.isRunning) {
      console.log('[IntelligentPollingService] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[IntelligentPollingService] Starting intelligent polling service...');
    console.log(`[IntelligentPollingService] Configuration: Poll every ${this.config.intervalMinutes}min, retrieve ${this.config.retrievalMinutes}min with ${this.config.overlapMinutes}min overlap`);

    // Initial poll
    await this.performIntelligentPoll();

    // Schedule regular polling
    this.pollingInterval = setInterval(async () => {
      await this.performIntelligentPoll();
    }, this.config.intervalMinutes * 60 * 1000);

    console.log('[IntelligentPollingService] Intelligent polling started');
  }

  async stop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    console.log('[IntelligentPollingService] Polling stopped');
  }

  private async performIntelligentPoll(): Promise<PollResult> {
    const startTime = Date.now();
    console.log('[IntelligentPollingService] 🔄 Starting intelligent poll cycle...');

    try {
      // Calculate time range with overlap
      const now = new Date();
      const endTime = new Date(now.getTime() - (this.config.overlapMinutes * 60 * 1000));
      const startTime = new Date(endTime.getTime() - (this.config.retrievalMinutes * 60 * 1000));

      console.log(`[IntelligentPollingService] Time range: ${startTime.toISOString()} to ${endTime.toISOString()}`);
      console.log(`[IntelligentPollingService] Overlap buffer: ${this.config.overlapMinutes} minutes`);

      // Step 1: Pull raw data from BioTime
      const pullResult = await this.pullBioTimeData(startTime, endTime);
      
      // Step 2: Process raw data with duplicate handling
      const processResult = await this.processRawDataWithDuplicateHandling(startTime, endTime);
      
      // Step 3: Validate consistency
      const validationResult = await this.validateDataConsistency();
      
      // Step 4: Cleanup old duplicates
      await this.cleanupOldDuplicates();

      const result: PollResult = {
        success: pullResult.success && processResult.success,
        recordsPulled: pullResult.recordsPulled,
        recordsProcessed: processResult.recordsProcessed,
        uniqueEmployees: processResult.uniqueEmployees,
        duplicatesHandled: processResult.duplicatesHandled,
        timeRange: { start: startTime, end: endTime },
        issues: [...pullResult.issues, ...processResult.issues, ...validationResult.issues]
      };

      // Update tracking
      this.lastPollTime = now;
      this.consecutiveFailures = result.success ? 0 : this.consecutiveFailures + 1;

      // Log results
      const elapsed = Date.now() - startTime;
      if (result.success) {
        console.log(`[IntelligentPollingService] ✅ Poll completed in ${elapsed}ms`);
        console.log(`[IntelligentPollingService] Pulled: ${result.recordsPulled}, Processed: ${result.recordsProcessed}, Unique: ${result.uniqueEmployees}`);
      } else {
        console.log(`[IntelligentPollingService] ❌ Poll failed in ${elapsed}ms`);
        result.issues.forEach(issue => console.log(`  - ${issue}`));
      }

      // Emit events
      this.emit('pollCompleted', result);
      
      if (!result.success) {
        this.emit('pollFailed', result);
        
        // Trigger extended polling if consecutive failures
        if (this.consecutiveFailures >= 2) {
          await this.triggerExtendedPolling();
        }
      }

      return result;

    } catch (error) {
      console.error('[IntelligentPollingService] Critical error during poll:', error);
      this.consecutiveFailures++;
      
      const errorResult: PollResult = {
        success: false,
        recordsPulled: 0,
        recordsProcessed: 0,
        uniqueEmployees: 0,
        duplicatesHandled: 0,
        timeRange: { start: new Date(), end: new Date() },
        issues: [`Critical error: ${error.message}`]
      };

      this.emit('pollError', errorResult);
      return errorResult;
    }
  }

  private async pullBioTimeData(startTime: Date, endTime: Date): Promise<{
    success: boolean;
    recordsPulled: number;
    issues: string[];
  }> {
    console.log('[IntelligentPollingService] 📡 Pulling BioTime data...');
    
    try {
      // Import BioTime service
      const { BioTimeService } = await import('./biotimeService');
      const bioTimeService = new BioTimeService();

      // Pull attendance data for the time range
      const result = await bioTimeService.pullAttendanceData(startTime, endTime);
      
      console.log(`[IntelligentPollingService] BioTime pull completed: ${result.recordsPulled} records`);
      
      return {
        success: true,
        recordsPulled: result.recordsPulled,
        issues: []
      };

    } catch (error) {
      console.error('[IntelligentPollingService] Error pulling BioTime data:', error);
      return {
        success: false,
        recordsPulled: 0,
        issues: [`BioTime pull failed: ${error.message}`]
      };
    }
  }

  private async processRawDataWithDuplicateHandling(startTime: Date, endTime: Date): Promise<{
    success: boolean;
    recordsProcessed: number;
    uniqueEmployees: number;
    duplicatesHandled: number;
    issues: string[];
  }> {
    console.log('[IntelligentPollingService] 🔧 Processing raw data with duplicate handling...');
    
    try {
      // Get all raw data in the time range
      const rawData = await db
        .select({
          id: attendancePullExt.id,
          punchTime: sql<string>`${attendancePullExt.allFields}->>'punch_time'`,
          empCode: sql<string>`${attendancePullExt.allFields}->>'emp_code'`,
          punchState: sql<string>`${attendancePullExt.allFields}->>'punch_state'`,
          terminal: sql<string>`${attendancePullExt.allFields}->>'terminal'`,
          allFields: attendancePullExt.allFields
        })
        .from(attendancePullExt)
        .where(and(
          gte(sql`(${attendancePullExt.allFields}->>'punch_time')::timestamp`, startTime),
          lte(sql`(${attendancePullExt.allFields}->>'punch_time')::timestamp`, endTime)
        ))
        .orderBy(sql`(${attendancePullExt.allFields}->>'punch_time')::timestamp`);

      console.log(`[IntelligentPollingService] Found ${rawData.length} raw records to process`);

      if (rawData.length === 0) {
        return {
          success: true,
          recordsProcessed: 0,
          uniqueEmployees: 0,
          duplicatesHandled: 0,
          issues: []
        };
      }

      // Group by employee and day for duplicate handling
      const employeeDataByDay = new Map<string, Map<string, any>>();
      let duplicatesHandled = 0;

      for (const record of rawData) {
        const empCode = record.empCode;
        const punchTime = new Date(record.punchTime);
        const dayKey = punchTime.toISOString().split('T')[0]; // YYYY-MM-DD
        const employeeKey = `${empCode}-${dayKey}`;

        if (!employeeDataByDay.has(employeeKey)) {
          employeeDataByDay.set(employeeKey, new Map([
            ['empCode', empCode],
            ['date', dayKey],
            ['punches', []],
            ['checkIn', null],
            ['checkOut', null]
          ]));
        }

        const employeeData = employeeDataByDay.get(employeeKey)!;
        const punches = employeeData.get('punches');
        
        // Check for duplicate punch (same employee, same time, same state)
        const isDuplicate = punches.some((p: any) => 
          Math.abs(p.time.getTime() - punchTime.getTime()) < 60000 && // Within 1 minute
          p.state === record.punchState
        );

        if (isDuplicate) {
          duplicatesHandled++;
          console.log(`[IntelligentPollingService] Duplicate punch filtered: ${empCode} at ${punchTime.toISOString()}`);
          continue;
        }

        // Add unique punch
        punches.push({
          time: punchTime,
          state: record.punchState,
          terminal: record.terminal,
          rawId: record.id
        });

        // Update check-in/out times
        if (record.punchState === '0') { // Check-in
          if (!employeeData.get('checkIn')) {
            employeeData.set('checkIn', punchTime);
          }
        } else if (record.punchState === '1') { // Check-out
          employeeData.set('checkOut', punchTime);
        }
      }

      console.log(`[IntelligentPollingService] Processed ${employeeDataByDay.size} unique employee-day combinations`);
      console.log(`[IntelligentPollingService] Handled ${duplicatesHandled} duplicate punches`);

      // Create or update attendance records
      let recordsProcessed = 0;
      const uniqueEmployees = new Set<string>();

      for (const [employeeKey, employeeData] of employeeDataByDay) {
        const empCode = employeeData.get('empCode');
        const date = employeeData.get('date');
        const punches = employeeData.get('punches');
        const checkIn = employeeData.get('checkIn');
        const checkOut = employeeData.get('checkOut');

        // Verify employee exists and is active
        const employee = await db
          .select()
          .from(employeeRecords)
          .where(and(
            eq(employeeRecords.employeeCode, empCode),
            eq(employeeRecords.isActive, true),
            eq(employeeRecords.systemAccount, false)
          ))
          .limit(1);

        if (employee.length === 0) {
          console.log(`[IntelligentPollingService] Skipping unknown/inactive employee: ${empCode}`);
          continue;
        }

        // Check if attendance record already exists
        const existingRecord = await db.execute(sql`
          SELECT id FROM attendance_records 
          WHERE employee_code = ${empCode} 
          AND date::date = ${date}::date
          LIMIT 1
        `);

        if (existingRecord.length > 0) {
          // Update existing record if needed
          const updateResult = await this.updateExistingRecord(existingRecord[0].id, checkIn, checkOut, punches);
          if (updateResult) {
            recordsProcessed++;
            uniqueEmployees.add(empCode);
          }
        } else {
          // Create new record
          const createResult = await this.createAttendanceRecord(empCode, date, checkIn, checkOut, punches);
          if (createResult) {
            recordsProcessed++;
            uniqueEmployees.add(empCode);
          }
        }
      }

      console.log(`[IntelligentPollingService] Successfully processed ${recordsProcessed} attendance records`);
      console.log(`[IntelligentPollingService] Unique employees: ${uniqueEmployees.size}`);

      return {
        success: true,
        recordsProcessed,
        uniqueEmployees: uniqueEmployees.size,
        duplicatesHandled,
        issues: []
      };

    } catch (error) {
      console.error('[IntelligentPollingService] Error processing raw data:', error);
      return {
        success: false,
        recordsProcessed: 0,
        uniqueEmployees: 0,
        duplicatesHandled: 0,
        issues: [`Data processing failed: ${error.message}`]
      };
    }
  }

  private async createAttendanceRecord(empCode: string, date: string, checkIn: Date | null, checkOut: Date | null, punches: any[]): Promise<boolean> {
    try {
      const hoursWorked = checkIn && checkOut ? 
        Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60) * 100) / 100 : 
        null;

      const status = checkOut ? 'present' : 'incomplete';
      const notes = `Processed ${punches.length} punch(es) by intelligent poller`;

      await db.execute(sql`
        INSERT INTO attendance_records (
          employee_code, date, check_in, check_out, 
          total_hours, status, notes, created_at, updated_at
        ) VALUES (
          ${empCode}, ${date}::date, 
          ${checkIn?.toISOString() || null}, 
          ${checkOut?.toISOString() || null},
          ${hoursWorked}, ${status}, ${notes}, 
          ${new Date().toISOString()}, ${new Date().toISOString()}
        )
      `);

      return true;

    } catch (error) {
      console.error(`[IntelligentPollingService] Error creating record for ${empCode}:`, error);
      return false;
    }
  }

  private async updateExistingRecord(recordId: number, checkIn: Date | null, checkOut: Date | null, punches: any[]): Promise<boolean> {
    try {
      const hoursWorked = checkIn && checkOut ? 
        Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60) * 100) / 100 : 
        null;

      const status = checkOut ? 'present' : 'incomplete';
      const notes = `Updated with ${punches.length} punch(es) by intelligent poller`;

      await db.execute(sql`
        UPDATE attendance_records 
        SET check_in = ${checkIn?.toISOString() || null},
            check_out = ${checkOut?.toISOString() || null},
            total_hours = ${hoursWorked},
            status = ${status},
            notes = ${notes},
            updated_at = ${new Date().toISOString()}
        WHERE id = ${recordId}
      `);

      return true;

    } catch (error) {
      console.error(`[IntelligentPollingService] Error updating record ${recordId}:`, error);
      return false;
    }
  }

  private async validateDataConsistency(): Promise<{ issues: string[] }> {
    try {
      // Get today's metrics
      const today = new Date();
      const pakistanTime = new Date(today.toLocaleString("en-US", {timeZone: "Asia/Karachi"}));
      
      const startOfDay = new Date(pakistanTime);
      startOfDay.setHours(0, 0, 0, 0);

      // Get unique attendance count
      const attendanceResult = await db.execute(sql`
        SELECT COUNT(DISTINCT employee_code) as unique_employees
        FROM attendance_records 
        WHERE date::date = ${startOfDay.toISOString()}::date
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
      const attendanceRate = (totalAttendance / totalEmployees) * 100;

      const issues: string[] = [];

      if (attendanceRate < this.config.minAttendanceRate) {
        issues.push(`Low attendance rate: ${attendanceRate.toFixed(1)}% (expected >=${this.config.minAttendanceRate}%)`);
      }

      if (issues.length === 0) {
        console.log(`[IntelligentPollingService] ✅ Data consistency validated: ${attendanceRate.toFixed(1)}% attendance`);
      } else {
        console.log(`[IntelligentPollingService] ⚠️ Consistency issues detected:`);
        issues.forEach(issue => console.log(`  - ${issue}`));
      }

      return { issues };

    } catch (error) {
      console.error('[IntelligentPollingService] Error validating consistency:', error);
      return { issues: [`Validation failed: ${error.message}`] };
    }
  }

  private async cleanupOldDuplicates(): Promise<void> {
    try {
      const cleanupThreshold = new Date(Date.now() - (this.config.duplicateCleanupHours * 60 * 60 * 1000));
      
      // Could implement cleanup logic here if needed
      // For now, we rely on the staging table's natural duplicate filtering
      
    } catch (error) {
      console.error('[IntelligentPollingService] Error cleaning up duplicates:', error);
    }
  }

  private async triggerExtendedPolling(): Promise<void> {
    console.log('[IntelligentPollingService] 🔄 Triggering extended polling due to consecutive failures...');
    
    try {
      // Extend polling to last 24 hours
      const now = new Date();
      const extendedStart = new Date(now.getTime() - (24 * 60 * 60 * 1000));
      
      console.log(`[IntelligentPollingService] Extended polling from ${extendedStart.toISOString()}`);
      
      // Perform extended poll
      const pullResult = await this.pullBioTimeData(extendedStart, now);
      const processResult = await this.processRawDataWithDuplicateHandling(extendedStart, now);
      
      console.log(`[IntelligentPollingService] Extended polling completed: ${pullResult.recordsPulled} pulled, ${processResult.recordsProcessed} processed`);
      
      // Reset failure counter if successful
      if (pullResult.success && processResult.success) {
        this.consecutiveFailures = 0;
        console.log('[IntelligentPollingService] ✅ Extended polling successful, failure counter reset');
      }
      
    } catch (error) {
      console.error('[IntelligentPollingService] Error during extended polling:', error);
    }
  }

  async getStatus(): Promise<{
    isRunning: boolean;
    config: PollingConfig;
    lastPollTime: Date | null;
    consecutiveFailures: number;
  }> {
    return {
      isRunning: this.isRunning,
      config: this.config,
      lastPollTime: this.lastPollTime,
      consecutiveFailures: this.consecutiveFailures
    };
  }

  updateConfig(newConfig: Partial<PollingConfig>) {
    this.config = { ...this.config, ...newConfig };
    console.log('[IntelligentPollingService] Configuration updated:', this.config);
  }
}

// Export singleton instance
export const intelligentPollingService = new IntelligentPollingService();