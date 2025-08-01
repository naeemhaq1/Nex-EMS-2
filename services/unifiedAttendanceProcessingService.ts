import { db } from "../db";
import { attendanceRecords, employeeRecords, attendancePullExt, shifts, dailyAttendanceSummary, accessControlExt } from "@shared/schema";
import { eq, and, gte, lte, isNull, sql, or, lt, countDistinct } from "drizzle-orm";
import { startOfDay, endOfDay, subDays, addHours, differenceInHours, format } from "date-fns";
import { BioTimeService } from "./biotimeService";
import { dataContiguityVerifier } from "../utils/dataContiguityVerifier";

interface ProcessingResult {
  rawDataPulled: number;
  attendanceRecordsProcessed: number;
  timingAnalysisCompleted: number;
  dailySummariesCreated: number;
  errors: string[];
}

/**
 * Unified Attendance Processing Service
 * Combines functionality from multiple services:
 * - CheckAttendService (attendance processing)
 * - LateEarlyAnalysisService (timing analysis)
 * - TimestampBasedPollingService (data pulling)
 * - AutomatedBioTimePolling (coordination)
 */
export class UnifiedAttendanceProcessingService {
  private bioTimeService: BioTimeService;
  private isRunning = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private readonly processingIntervalMinutes = 5; // Unified 5-minute cycle
  private readonly batchSize = 1000;
  private readonly gracePeriodMinutes = 30;

  constructor() {
    this.bioTimeService = new BioTimeService();
  }

  async start() {
    if (this.isRunning) {
      console.log("[UnifiedAttendanceProcessing] Service already running");
      return;
    }

    this.isRunning = true;
    console.log("[UnifiedAttendanceProcessing] 🚀 Starting unified attendance processing service...");
    console.log(`[UnifiedAttendanceProcessing] Processing every ${this.processingIntervalMinutes} minutes`);

    // Initial processing
    await this.performUnifiedProcessing();

    // Schedule regular processing
    this.processingInterval = setInterval(async () => {
      await this.performUnifiedProcessing();
    }, this.processingIntervalMinutes * 60 * 1000);
  }

  async stop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    console.log("[UnifiedAttendanceProcessing] Service stopped");
  }

  /**
   * Unified processing cycle:
   * 1. Pull new data from BioTime
   * 2. Process raw attendance data
   * 3. Perform timing analysis
   * 4. Generate daily summaries
   */
  async performUnifiedProcessing(): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      rawDataPulled: 0,
      attendanceRecordsProcessed: 0,
      timingAnalysisCompleted: 0,
      dailySummariesCreated: 0,
      errors: []
    };

    try {
      console.log("[UnifiedAttendanceProcessing] Starting unified processing cycle...");

      // Step 1: Pull new data from BioTime
      const pullResult = await this.pullNewData();
      result.rawDataPulled = pullResult.recordsPulled;

      // Step 2: Process raw attendance data
      const processResult = await this.processRawAttendanceData();
      result.attendanceRecordsProcessed = processResult.processed;

      // Step 3: Perform timing analysis on new records
      const timingResult = await this.performTimingAnalysis();
      result.timingAnalysisCompleted = timingResult.analyzed;

      // Step 4: Generate daily summaries
      const summaryResult = await this.generateDailySummaries();
      result.dailySummariesCreated = summaryResult.created;

      console.log("[UnifiedAttendanceProcessing] ✅ Unified processing completed");
      console.log(`[UnifiedAttendanceProcessing] Results: ${result.rawDataPulled} pulled, ${result.attendanceRecordsProcessed} processed, ${result.timingAnalysisCompleted} analyzed, ${result.dailySummariesCreated} summaries`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);
      console.error("[UnifiedAttendanceProcessing] Error during processing:", errorMessage);
    }

    return result;
  }

  /**
   * Pull new data from BioTime API
   */
  private async pullNewData(): Promise<{ recordsPulled: number }> {
    try {
      console.log("[UnifiedAttendanceProcessing] 📡 Pulling new data from BioTime...");

      // Get last record timestamp
      const lastRecordResult = await db
        .select({ timestamp: sql<string>`max((all_fields->>'punch_time')::timestamp)` })
        .from(attendancePullExt);

      const lastTimestamp = lastRecordResult[0]?.timestamp;
      const fromTimestamp = lastTimestamp ? new Date(lastTimestamp) : subDays(new Date(), 1);

      // Pull new records
      const newRecords = await this.bioTimeService.pullAttendanceData(
        fromTimestamp.toISOString(),
        new Date().toISOString()
      );

      console.log(`[UnifiedAttendanceProcessing] ✅ Pulled ${newRecords.length} new records`);
      return { recordsPulled: newRecords.length };

    } catch (error) {
      console.error("[UnifiedAttendanceProcessing] Error pulling new data:", error);
      return { recordsPulled: 0 };
    }
  }

  /**
   * Process raw attendance data into attendance records
   */
  private async processRawAttendanceData(): Promise<{ processed: number }> {
    try {
      console.log("[UnifiedAttendanceProcessing] 🔄 Processing raw attendance data...");

      // Get existing biotime_ids to prevent duplicates
      const existingBiotimeIds = await db.select({ biotimeId: attendanceRecords.biotimeId })
        .from(attendanceRecords)
        .where(sql`${attendanceRecords.biotimeId} IS NOT NULL`);

      const processedBiotimeIds = new Set(existingBiotimeIds.map(r => r.biotimeId));

      // Get unprocessed attendance data from last 3 days
      const threeDaysAgo = subDays(new Date(), 3);
      const rawData = await db.select()
        .from(attendancePullExt)
        .where(
          and(
            gte(sql`(all_fields->>'punch_time')::timestamp`, threeDaysAgo.toISOString()),
            sql`terminal_alias NOT LIKE '%lock%'` // Exclude lock devices
          )
        )
        .limit(this.batchSize);

      // Group by employee and date
      const employeeAttendanceByDate = new Map<string, Map<string, any[]>>();

      for (const record of rawData) {
        if (processedBiotimeIds.has(record.biotimeId)) continue;

        const empCode = record.empCode;
        const punchTime = record.allFields?.punch_time;
        if (!empCode || !punchTime) continue;

        const punchDate = new Date(punchTime).toISOString().split('T')[0];

        if (!employeeAttendanceByDate.has(empCode)) {
          employeeAttendanceByDate.set(empCode, new Map());
        }

        const dateMap = employeeAttendanceByDate.get(empCode)!;
        if (!dateMap.has(punchDate)) {
          dateMap.set(punchDate, []);
        }

        dateMap.get(punchDate)!.push(record);
      }

      // Process each employee's daily attendance
      let processed = 0;
      for (const [empCode, dateMap] of employeeAttendanceByDate) {
        for (const [date, records] of dateMap) {
          const result = await this.processEmployeeDailyAttendance(empCode, date, records);
          if (result.success) processed++;
        }
      }

      console.log(`[UnifiedAttendanceProcessing] ✅ Processed ${processed} daily attendance records`);
      return { processed };

    } catch (error) {
      console.error("[UnifiedAttendanceProcessing] Error processing raw data:", error);
      return { processed: 0 };
    }
  }

  /**
   * Process individual employee's daily attendance
   */
  private async processEmployeeDailyAttendance(empCode: string, date: string, records: any[]): Promise<{ success: boolean }> {
    try {
      // Check if already processed
      const existing = await db.select()
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.employeeCode, empCode),
            sql`DATE(${attendanceRecords.checkIn}) = ${date}`
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return { success: false }; // Already processed
      }

      // Sort records by punch time
      const sortedRecords = records.sort((a, b) => 
        new Date(a.allFields.punch_time).getTime() - new Date(b.allFields.punch_time).getTime()
      );

      // Process punch logic: first check-in, last check-out within 12 hours
      const firstPunch = sortedRecords[0];
      const lastPunch = sortedRecords[sortedRecords.length - 1];

      const checkInTime = new Date(firstPunch.allFields.punch_time);
      let checkOutTime: Date | null = null;
      let hoursWorked = 0;

      if (sortedRecords.length > 1) {
        const timeDiff = differenceInHours(
          new Date(lastPunch.allFields.punch_time),
          checkInTime
        );

        if (timeDiff <= 12) {
          checkOutTime = new Date(lastPunch.allFields.punch_time);
          hoursWorked = Math.min(timeDiff, 12);
        } else {
          hoursWorked = 8; // Default for missing checkout
        }
      } else {
        hoursWorked = 8; // Default for single punch
      }

      // Insert attendance record
      await db.insert(attendanceRecords).values({
        employeeCode: empCode,
        checkIn: checkInTime,
        checkOut: checkOutTime,
        hoursWorked,
        biotimeId: firstPunch.biotimeId,
        notes: `Processed ${sortedRecords.length} punches`,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return { success: true };

    } catch (error) {
      console.error(`[UnifiedAttendanceProcessing] Error processing ${empCode} on ${date}:`, error);
      return { success: false };
    }
  }

  /**
   * Perform timing analysis on attendance records
   */
  private async performTimingAnalysis(): Promise<{ analyzed: number }> {
    try {
      console.log("[UnifiedAttendanceProcessing] ⏰ Performing timing analysis...");

      // Get records without timing analysis
      const unanalyzedRecords = await db.select()
        .from(attendanceRecords)
        .leftJoin(employeeRecords, eq(attendanceRecords.employeeCode, employeeRecords.employeeCode))
        .leftJoin(shifts, eq(employeeRecords.shiftId, shifts.id))
        .where(
          and(
            isNull(attendanceRecords.lateMinutes),
            isNotNull(attendanceRecords.checkIn)
          )
        )
        .limit(this.batchSize);

      let analyzed = 0;
      for (const record of unanalyzedRecords) {
        const result = await this.analyzeRecordTiming(record);
        if (result.success) analyzed++;
      }

      console.log(`[UnifiedAttendanceProcessing] ✅ Analyzed ${analyzed} records for timing`);
      return { analyzed };

    } catch (error) {
      console.error("[UnifiedAttendanceProcessing] Error in timing analysis:", error);
      return { analyzed: 0 };
    }
  }

  /**
   * Analyze individual record timing
   */
  private async analyzeRecordTiming(record: any): Promise<{ success: boolean }> {
    try {
      const attendanceRecord = record.attendance_records;
      const shift = record.shifts;
      const checkIn = new Date(attendanceRecord.checkIn);
      const checkOut = attendanceRecord.checkOut ? new Date(attendanceRecord.checkOut) : null;

      // Calculate expected times
      const expectedStartTime = shift?.startTime || '09:00';
      const expectedEndTime = shift?.endTime || '17:00';
      
      const [startHour, startMinute] = expectedStartTime.split(':').map(Number);
      const [endHour, endMinute] = expectedEndTime.split(':').map(Number);

      const expectedStart = new Date(checkIn);
      expectedStart.setHours(startHour, startMinute, 0, 0);

      const expectedEnd = new Date(checkIn);
      expectedEnd.setHours(endHour, endMinute, 0, 0);

      // Calculate timing metrics
      const lateMinutes = Math.max(0, Math.floor((checkIn.getTime() - expectedStart.getTime()) / 60000));
      const graceMinutes = Math.min(lateMinutes, this.gracePeriodMinutes);
      const actualLateMinutes = Math.max(0, lateMinutes - this.gracePeriodMinutes);

      let earlyMinutes = 0;
      let lateDepMinutes = 0;
      let earlyDepMinutes = 0;

      if (checkOut) {
        earlyMinutes = Math.max(0, Math.floor((expectedStart.getTime() - checkIn.getTime()) / 60000));
        
        if (checkOut.getTime() > expectedEnd.getTime()) {
          lateDepMinutes = Math.floor((checkOut.getTime() - expectedEnd.getTime()) / 60000);
        } else {
          earlyDepMinutes = Math.floor((expectedEnd.getTime() - checkOut.getTime()) / 60000);
        }
      }

      // Determine statuses
      const arrivalStatus = actualLateMinutes > 0 ? 'late' : 
                           graceMinutes > 0 ? 'grace' : 
                           earlyMinutes > 0 ? 'early' : 'on_time';

      const departureStatus = checkOut ? 
                             (lateDepMinutes > 0 ? 'late' : 
                              earlyDepMinutes > 0 ? 'early' : 'on_time') : 
                             'incomplete';

      // Update record
      await db.update(attendanceRecords)
        .set({
          lateMinutes: actualLateMinutes,
          earlyMinutes,
          graceMinutes,
          earlyDepartureMinutes: earlyDepMinutes,
          lateDepartureMinutes: lateDepMinutes,
          arrivalStatus,
          departureStatus,
          updatedAt: new Date()
        })
        .where(eq(attendanceRecords.id, attendanceRecord.id));

      return { success: true };

    } catch (error) {
      console.error("[UnifiedAttendanceProcessing] Error analyzing record timing:", error);
      return { success: false };
    }
  }

  /**
   * Generate daily summaries
   */
  private async generateDailySummaries(): Promise<{ created: number }> {
    try {
      console.log("[UnifiedAttendanceProcessing] 📊 Generating daily summaries...");

      // Process last 7 days
      let created = 0;
      for (let i = 0; i < 7; i++) {
        const processDate = subDays(new Date(), i);
        const result = await this.generateDailySummary(processDate);
        if (result.success) created++;
      }

      console.log(`[UnifiedAttendanceProcessing] ✅ Generated ${created} daily summaries`);
      return { created };

    } catch (error) {
      console.error("[UnifiedAttendanceProcessing] Error generating summaries:", error);
      return { created: 0 };
    }
  }

  /**
   * Generate summary for specific date
   */
  private async generateDailySummary(date: Date): Promise<{ success: boolean }> {
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      // Check if summary already exists
      const existing = await db.select()
        .from(dailyAttendanceSummary)
        .where(sql`DATE(${dailyAttendanceSummary.date}) = ${dateStr}`)
        .limit(1);

      if (existing.length > 0) {
        return { success: false }; // Already exists
      }

      // Calculate metrics
      const totalEmployees = await db.select({ count: countDistinct(employeeRecords.employeeCode) })
        .from(employeeRecords)
        .where(and(
          eq(employeeRecords.isActive, true),
          sql`${employeeRecords.department} != 'MIGRATED_TO_FORMER_EMPLOYEES'`
        ));

      const presentEmployees = await db.select({ count: countDistinct(attendanceRecords.employeeCode) })
        .from(attendanceRecords)
        .where(and(
          gte(attendanceRecords.checkIn, dayStart),
          lte(attendanceRecords.checkIn, dayEnd)
        ));

      const nonBioEmployees = await db.select({ count: sql<number>`count(*)` })
        .from(employeeRecords)
        .where(and(
          eq(employeeRecords.isActive, true),
          eq(employeeRecords.nonBio, true),
          sql`${employeeRecords.department} != 'MIGRATED_TO_FORMER_EMPLOYEES'`
        ));

      const lateEmployees = await db.select({ count: countDistinct(attendanceRecords.employeeCode) })
        .from(attendanceRecords)
        .where(and(
          gte(attendanceRecords.checkIn, dayStart),
          lte(attendanceRecords.checkIn, dayEnd),
          sql`${attendanceRecords.lateMinutes} > 0`
        ));

      const totalActive = totalEmployees[0].count;
      const present = presentEmployees[0].count;
      const nonBio = nonBioEmployees[0].count;
      const late = lateEmployees[0].count;
      const totalAttendance = present + nonBio;
      const absent = totalActive - totalAttendance;

      // Insert summary
      await db.insert(dailyAttendanceSummary).values({
        date,
        totalEmployees: totalActive,
        presentEmployees: present,
        nonBioEmployees: nonBio,
        lateEmployees: late,
        absentEmployees: absent,
        attendanceRate: (totalAttendance / totalActive * 100),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return { success: true };

    } catch (error) {
      console.error(`[UnifiedAttendanceProcessing] Error generating summary for ${date}:`, error);
      return { success: false };
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      processingInterval: this.processingIntervalMinutes,
      batchSize: this.batchSize,
      gracePeriodMinutes: this.gracePeriodMinutes,
      lastProcessed: new Date().toISOString()
    };
  }
}

export const unifiedAttendanceProcessingService = new UnifiedAttendanceProcessingService();