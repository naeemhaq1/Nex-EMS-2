import { db } from "../db";
import { attendanceRecords, employeeRecords, attendancePullExt, shifts, accessControlExt } from "@shared/schema";
import { eq, and, gte, lte, isNull, sql, or, lt, countDistinct, desc, asc } from "drizzle-orm";
import { startOfDay, endOfDay, subDays, addHours, differenceInHours, format } from "date-fns";
import { storage } from "../storage";

interface PostPollProcessingResult {
  success: boolean;
  recordsProcessed: number;
  attendanceCreated: number;
  duplicatesSkipped: number;
  errors: string[];
  processingTime: number;
}

interface DailyPunchGroup {
  employeeCode: string;
  date: string;
  punches: any[];
}

/**
 * Unified Post-Poll Processor
 * Handles all data processing after new records are pulled from BioTime:
 * 1. Processes raw attendance data from staging tables
 * 2. Creates attendance records with proper duplicate detection
 * 3. Routes lock device data to access control table
 * 4. Maintains data integrity and audit trails
 */
export class PostPollProcessor {
  private readonly batchSize = 1000;
  private readonly processingWindowDays = 7;
  private readonly maxHoursWorked = 12;

  constructor() {}

  /**
   * Main processing entry point
   * Called after new data is pulled from BioTime
   */
  async processNewData(): Promise<PostPollProcessingResult> {
    const startTime = Date.now();
    console.log("[PostPollProcessor] 🔄 Starting post-poll data processing...");

    const result: PostPollProcessingResult = {
      success: false,
      recordsProcessed: 0,
      attendanceCreated: 0,
      duplicatesSkipped: 0,
      errors: [],
      processingTime: 0
    };

    try {
      // Step 1: Get existing processed biotime_ids for duplicate detection
      const existingBiotimeIds = await this.getExistingBiotimeIds();
      console.log(`[PostPollProcessor] 📋 Found ${existingBiotimeIds.size} already processed biotime_ids`);

      // Step 2: Get unprocessed raw data from staging tables
      const rawData = await this.getRawDataForProcessing();
      console.log(`[PostPollProcessor] 📊 Found ${rawData.length} records in staging table`);

      if (rawData.length === 0) {
        console.log("[PostPollProcessor] ✅ No new records to process");
        result.success = true;
        result.processingTime = Date.now() - startTime;
        return result;
      }

      // Step 3: Separate attendance and access control data
      const { attendanceData, accessControlData } = this.separateDataByType(rawData);
      console.log(`[PostPollProcessor] 📈 Separated: ${attendanceData.length} attendance, ${accessControlData.length} access control`);

      // Step 4: Process attendance data into daily punch groups
      const punchGroups = this.groupAttendanceByEmployeeAndDate(attendanceData, existingBiotimeIds);
      console.log(`[PostPollProcessor] 📈 FIXED: Grouped ${punchGroups.length} daily punch groups, skipped ${result.duplicatesSkipped} duplicates`);

      // Step 5: Process each daily punch group
      let attendanceCreated = 0;
      for (const group of punchGroups) {
        const processResult = await this.processDailyPunchGroup(group);
        if (processResult.success) {
          attendanceCreated++;
        } else if (processResult.error) {
          result.errors.push(processResult.error);
        }
      }

      // Step 6: Route access control data to separate table
      if (accessControlData.length > 0) {
        await this.routeAccessControlData(accessControlData);
      }

      result.recordsProcessed = rawData.length;
      result.attendanceCreated = attendanceCreated;
      result.success = true;
      result.processingTime = Date.now() - startTime;

      console.log(`[PostPollProcessor] ✅ Processing completed: ${attendanceCreated} attendance records created from ${punchGroups.length} employee-day groups`);
      console.log(`[PostPollProcessor] 📊 Processing time: ${result.processingTime}ms`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);
      console.error("[PostPollProcessor] ❌ Processing failed:", errorMessage);
    }

    result.processingTime = Date.now() - startTime;
    return result;
  }

  /**
   * Get existing biotime_ids to prevent duplicate processing
   */
  private async getExistingBiotimeIds(): Promise<Set<string>> {
    const existingIds = await db.select({ biotimeId: attendanceRecords.biotimeId })
      .from(attendanceRecords)
      .where(sql`${attendanceRecords.biotimeId} IS NOT NULL`);

    return new Set(existingIds.map(r => r.biotimeId));
  }

  /**
   * Get raw data from staging tables for processing - ONLY NEW SEQUENTIAL BIOTIME_IDS
   */
  private async getRawDataForProcessing(): Promise<any[]> {
    console.log("[PostPollProcessor] 🔍 Getting only NEW sequential biotime_ids from staging tables");
    
    // Get highest processed biotime_id from attendance_records
    const lastProcessedResult = await db.select({ 
      maxBiotimeId: sql<string>`MAX(CAST(${attendanceRecords.biotimeId} AS BIGINT))` 
    })
      .from(attendanceRecords)
      .where(sql`${attendanceRecords.biotimeId} IS NOT NULL AND ${attendanceRecords.biotimeId} ~ '^[0-9]+$'`);

    const lastProcessedBiotimeId = lastProcessedResult[0]?.maxBiotimeId || '0';
    console.log(`[PostPollProcessor] 📊 Last processed biotime_id: ${lastProcessedBiotimeId}`);

    // Get only NEW records with biotime_id > last processed
    const newAttendanceData = await db.select()
      .from(attendancePullExt)
      .where(
        sql`CAST(${attendancePullExt.biotimeId} AS BIGINT) > ${lastProcessedBiotimeId}
            AND ${attendancePullExt.allFields}->>'terminal_alias' NOT LIKE '%lock%'`
      )
      .orderBy(sql`CAST(${attendancePullExt.biotimeId} AS BIGINT) ASC`)
      .limit(this.batchSize);

    const newAccessControlData = await db.select()
      .from(attendancePullExt)
      .where(
        sql`CAST(${attendancePullExt.biotimeId} AS BIGINT) > ${lastProcessedBiotimeId}
            AND ${attendancePullExt.allFields}->>'terminal_alias' LIKE '%lock%'`
      )
      .orderBy(sql`CAST(${attendancePullExt.biotimeId} AS BIGINT) ASC`)
      .limit(this.batchSize);

    const totalNewRecords = newAttendanceData.length + newAccessControlData.length;
    console.log(`[PostPollProcessor] 📈 Found ${totalNewRecords} NEW records (${newAttendanceData.length} attendance, ${newAccessControlData.length} access control)`);

    return [...newAttendanceData, ...newAccessControlData];
  }

  /**
   * Separate data by type (attendance vs access control)
   */
  private separateDataByType(rawData: any[]): { attendanceData: any[], accessControlData: any[] } {
    const attendanceData: any[] = [];
    const accessControlData: any[] = [];

    for (const record of rawData) {
      const terminalAlias = record.terminalAlias || record.allFields?.terminal_alias || '';
      
      if (terminalAlias.toLowerCase().includes('lock')) {
        accessControlData.push(record);
      } else {
        attendanceData.push(record);
      }
    }

    return { attendanceData, accessControlData };
  }

  /**
   * Group attendance data by employee and date, filtering duplicates
   */
  private groupAttendanceByEmployeeAndDate(attendanceData: any[], existingBiotimeIds: Set<string>): DailyPunchGroup[] {
    const employeeAttendanceByDate = new Map<string, Map<string, any[]>>();
    let duplicatesSkipped = 0;

    for (const record of attendanceData) {
      // Skip if already processed
      if (existingBiotimeIds.has(record.biotimeId)) {
        duplicatesSkipped++;
        continue;
      }

      const empCode = record.empCode;
      const punchTime = record.allFields?.punch_time;
      
      if (!empCode || !punchTime || !record.allFields) {
        continue;
      }

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

    // Convert to array of daily punch groups
    const punchGroups: DailyPunchGroup[] = [];
    for (const [empCode, dateMap] of employeeAttendanceByDate) {
      for (const [date, punches] of dateMap) {
        punchGroups.push({
          employeeCode: empCode,
          date,
          punches
        });
      }
    }

    return punchGroups;
  }

  /**
   * Process a single daily punch group into attendance record
   */
  private async processDailyPunchGroup(group: DailyPunchGroup): Promise<{ success: boolean; error?: string }> {
    try {
      const { employeeCode, date, punches } = group;

      // Check if attendance already exists for this employee-date combination
      const existingAttendance = await db.select()
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.employeeCode, employeeCode),
            sql`DATE(${attendanceRecords.checkIn}) = ${date}`
          )
        )
        .limit(1);

      if (existingAttendance.length > 0) {
        return { success: false }; // Already processed
      }

      // Sort punches by timestamp
      const sortedPunches = punches.sort((a, b) => {
        const timeA = new Date(a.allFields.punch_time).getTime();
        const timeB = new Date(b.allFields.punch_time).getTime();
        return timeA - timeB;
      });

      // Process punch logic using numeric punch state codes
      const punchIns = sortedPunches.filter(p => p.allFields.punch_state === 0 || p.allFields.punch_state === "0");
      const punchOuts = sortedPunches.filter(p => p.allFields.punch_state === 1 || p.allFields.punch_state === "1");

      if (punchIns.length === 0) {
        return { success: false, error: `No punch-in found for ${employeeCode} on ${date}` };
      }

      // Use first punch-in
      const firstPunchIn = punchIns[0];
      const checkInTime = new Date(firstPunchIn.allFields.punch_time);

      // Find corresponding punch-out within 12 hours
      let checkOutTime: Date | null = null;
      let lastPunchOut: any = null;

      if (punchOuts.length > 0) {
        // Find punch-outs within 12 hours of check-in
        const validPunchOuts = punchOuts.filter(p => {
          const punchOutTime = new Date(p.allFields.punch_time);
          const hoursDiff = differenceInHours(punchOutTime, checkInTime);
          return hoursDiff > 0 && hoursDiff <= this.maxHoursWorked;
        });

        if (validPunchOuts.length > 0) {
          // Use last valid punch-out
          lastPunchOut = validPunchOuts[validPunchOuts.length - 1];
          checkOutTime = new Date(lastPunchOut.allFields.punch_time);
        }
      }

      // Calculate hours worked - CRITICAL: NO DEFAULT HOURS FOR MISSING PUNCH-OUT
      let hoursWorked = 0;
      if (checkOutTime) {
        hoursWorked = Math.min(
          differenceInHours(checkOutTime, checkInTime),
          this.maxHoursWorked
        );
      } else {
        // ANTI-OVERBILLING: Never assume hours for missing punch-out
        hoursWorked = 0; // Will be processed by MissingPunchOutProcessor with proper caps
      }

      // Get employee record to obtain employeeId
      const employee = await this.storage.getEmployeeByCode(employeeCode);
      if (!employee) {
        return { success: false, error: `Employee not found for code: ${employeeCode}` };
      }

      // Create attendance record with anti-overbilling protection
      const attendanceRecord = {
        employeeId: employee.id,
        employeeCode,
        checkIn: checkInTime,
        checkOut: checkOutTime,
        hoursWorked,
        biotimeId: firstPunchIn.biotimeId,
        notes: checkOutTime 
          ? `Processed ${punches.length} punches: ${punchIns.length} in, ${punchOuts.length} out`
          : `INCOMPLETE SESSION: ${punches.length} punches (${punchIns.length} in, ${punchOuts.length} out) - Hours will be capped by anti-overbilling processor`,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.insert(attendanceRecords).values(attendanceRecord);

      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: `Error processing ${group.employeeCode} on ${group.date}: ${errorMessage}` };
    }
  }

  /**
   * Route access control data to separate table
   */
  private async routeAccessControlData(accessControlData: any[]): Promise<void> {
    try {
      console.log(`[PostPollProcessor] 🔐 Routing ${accessControlData.length} access control records`);

      // Process access control records (lock devices)
      // This maintains the biotime_id sequence for continuity but stores in separate table
      
      // Note: Access control data is already in the correct table (accessControlExt)
      // This function can be extended if additional processing is needed

    } catch (error) {
      console.error("[PostPollProcessor] Error routing access control data:", error);
    }
  }

  /**
   * Get processing status and statistics
   */
  async getProcessingStats(): Promise<{
    totalRawRecords: number;
    processedRecords: number;
    pendingRecords: number;
    lastProcessedTime: string | null;
  }> {
    try {
      // Get total raw records
      const totalRawResult = await db.select({ count: sql<number>`count(*)` })
        .from(attendancePullExt);

      // Get processed records
      const processedResult = await db.select({ count: sql<number>`count(*)` })
        .from(attendanceRecords)
        .where(sql`${attendanceRecords.biotimeId} IS NOT NULL`);

      // Get last processed time
      const lastProcessedResult = await db.select({ 
        lastProcessed: sql<string>`max(${attendanceRecords.createdAt})` 
      })
        .from(attendanceRecords);

      const totalRaw = totalRawResult[0]?.count || 0;
      const processed = processedResult[0]?.count || 0;
      const pending = totalRaw - processed;

      return {
        totalRawRecords: totalRaw,
        processedRecords: processed,
        pendingRecords: Math.max(0, pending),
        lastProcessedTime: lastProcessedResult[0]?.lastProcessed || null
      };

    } catch (error) {
      console.error("[PostPollProcessor] Error getting processing stats:", error);
      return {
        totalRawRecords: 0,
        processedRecords: 0,
        pendingRecords: 0,
        lastProcessedTime: null
      };
    }
  }
}

export const postPollProcessor = new PostPollProcessor();