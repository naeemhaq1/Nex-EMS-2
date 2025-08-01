import { db } from '../db';
import { attendanceRecords, attendancePullExt } from '@shared/schema';
import { sql, eq, and, or, desc } from 'drizzle-orm';
import { formatInSystemTimezone } from '../config/timezone';
import { employeeNameLookupService } from './employeeNameLookupService';
import { employeeFieldProtection } from './employeeFieldProtectionService';

interface RealTimeProcessingResult {
  success: boolean;
  recordsProcessed: number;
  attendanceCreated: number;
  processingTime: number;
  errors: string[];
}

/**
 * Real-Time Processor for Timestamp-Based Polling
 * Processes new sequential records immediately as they arrive from BioTime API
 * Unlike PostPollProcessor which batches historical data, this processes records sequentially
 */
export class RealTimeProcessor {
  
  /**
   * Process only NEW sequential records from staging table
   * Gets records with biotime_id > last processed ID and processes them immediately
   */
  async processNewSequentialRecords(): Promise<RealTimeProcessingResult> {
    const startTime = Date.now();
    
    const result: RealTimeProcessingResult = {
      success: false,
      recordsProcessed: 0,
      attendanceCreated: 0,
      processingTime: 0,
      errors: []
    };

    try {
      console.log('[RealTimeProcessor] 🔄 Processing new sequential records...');
      
      // Get highest processed biotime_id
      const lastProcessedResult = await db.select({ 
        maxBiotimeId: sql<string>`MAX(CAST(${attendanceRecords.biotimeId} AS BIGINT))` 
      })
        .from(attendanceRecords)
        .where(sql`${attendanceRecords.biotimeId} IS NOT NULL AND ${attendanceRecords.biotimeId} ~ '^[0-9]+$'`);

      const lastProcessedBiotimeId = lastProcessedResult[0]?.maxBiotimeId || '0';
      console.log(`[RealTimeProcessor] 📊 Last processed biotime_id: ${lastProcessedBiotimeId}`);

      // FORCE PROCESS: Get all unprocessed records from today (regardless of biotime_id)
      const todayRecords = await db.select()
        .from(attendancePullExt)
        .where(
          and(
            sql`(${attendancePullExt.allFields}->>'punch_time')::timestamp >= '2025-07-15 00:00:00'`,
            sql`(${attendancePullExt.allFields}->>'punch_time')::timestamp < '2025-07-15 23:59:59'`,
            sql`${attendancePullExt.allFields}->>'terminal_alias' NOT LIKE '%lock%'`
          )
        )
        .orderBy(sql`CAST(${attendancePullExt.biotimeId} AS BIGINT) ASC`)
        .limit(500);

      // Get NEW sequential records from staging table (data is now cleaned, no duplicates)
      const newRecords = await db.select()
        .from(attendancePullExt)
        .where(
          and(
            sql`CAST(${attendancePullExt.biotimeId} AS BIGINT) > ${lastProcessedBiotimeId}`,
            sql`${attendancePullExt.allFields}->>'terminal_alias' NOT LIKE '%lock%'`
          )
        )
        .orderBy(sql`CAST(${attendancePullExt.biotimeId} AS BIGINT) ASC`)
        .limit(500); // Process in smaller batches for real-time

      // Use today's records if no new sequential records found
      const recordsToProcess = newRecords.length > 0 ? newRecords : todayRecords;
      
      console.log(`[RealTimeProcessor] 📈 Found ${recordsToProcess.length} records to process (${newRecords.length} new, ${todayRecords.length} today)`);
      
      if (todayRecords.length > 0 && newRecords.length === 0) {
        console.log(`[RealTimeProcessor] 🔍 Today's records: ${todayRecords.length} total, processing to catch up`);
      }

      if (recordsToProcess.length === 0) {
        console.log('[RealTimeProcessor] ✅ No new records to process');
        result.success = true;
        result.processingTime = Date.now() - startTime;
        return result;
      }

      // Debug the first record to understand the structure
      if (recordsToProcess.length > 0) {
        console.log(`[RealTimeProcessor] 🔍 First record structure:`, JSON.stringify(recordsToProcess[0], null, 2));
      }

      // Process each record individually for real-time handling
      let attendanceCreated = 0;
      const processedBiotimeIds = new Set<string>();
      
      for (const record of recordsToProcess) {
        try {
          // Skip if already processed in this batch
          if (processedBiotimeIds.has(record.biotimeId)) {
            console.log(`[RealTimeProcessor] 🚫 REJECTED - Duplicate biotime_id in batch: ${record.biotimeId}`);
            continue;
          }
          
          // Check if this biotime_id is already in attendance_records
          const existingRecord = await db.select()
            .from(attendanceRecords)
            .where(eq(attendanceRecords.biotimeId, record.biotimeId))
            .limit(1);
          
          if (existingRecord.length > 0) {
            console.log(`[RealTimeProcessor] 🚫 REJECTED - Already processed biotime_id: ${record.biotimeId}`);
            processedBiotimeIds.add(record.biotimeId);
            continue;
          }
          
          // Additional duplicate check: Skip if this exact employee+timestamp combination exists
          const allFields = record.allFields;
          const empCode = allFields.emp_code;
          const punchTime = allFields.punch_time;
          
          if (empCode && punchTime) {
            // Convert punchTime to proper Date object if it's a string
            const punchTimeObj = new Date(punchTime);
            
            const duplicateCheck = await db.select()
              .from(attendanceRecords)
              .where(
                and(
                  eq(attendanceRecords.employeeCode, empCode),
                  or(
                    eq(attendanceRecords.checkIn, punchTimeObj),
                    eq(attendanceRecords.checkOut, punchTimeObj)
                  )
                )
              )
              .limit(1);
            
            if (duplicateCheck.length > 0) {
              console.log(`[RealTimeProcessor] 🚫 REJECTED - Duplicate punch: ${empCode} at ${punchTime}`);
              processedBiotimeIds.add(record.biotimeId);
              continue;
            }
          }
          
          console.log(`[RealTimeProcessor] 🔄 Processing staging record: biotime_id=${record.biotimeId}`);
          
          const processResult = await this.processIndividualRecord(record);
          if (processResult.success) {
            attendanceCreated++;
            console.log(`[RealTimeProcessor] ✅ Successfully processed record: ${record.biotimeId}`);
            
            // CRITICAL: Delete processed staging record to prevent duplicates in Live Activity
            await db.delete(attendancePullExt)
              .where(eq(attendancePullExt.biotimeId, record.biotimeId));
            console.log(`[RealTimeProcessor] 🗑️ Deleted processed staging record: ${record.biotimeId}`);
          } else if (processResult.error) {
            result.errors.push(processResult.error);
            console.log(`[RealTimeProcessor] ❌ Failed to process record: ${record.biotimeId}, error: ${processResult.error}`);
          }
          
          processedBiotimeIds.add(record.biotimeId);
        } catch (error) {
          const errorMsg = `Failed to process record ${record.biotimeId}: ${error.message}`;
          result.errors.push(errorMsg);
          console.error(`[RealTimeProcessor] ${errorMsg}`);
        }
      }

      result.recordsProcessed = recordsToProcess.length;
      result.attendanceCreated = attendanceCreated;
      result.success = true;
      result.processingTime = Date.now() - startTime;

      console.log(`[RealTimeProcessor] ✅ Processing completed: ${attendanceCreated} attendance records created from ${recordsToProcess.length} records`);
      console.log(`[RealTimeProcessor] 📊 Processing time: ${result.processingTime}ms`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);
      console.error("[RealTimeProcessor] ❌ Processing failed:", errorMessage);
    }

    result.processingTime = Date.now() - startTime;
    return result;
  }

  /**
   * Process individual record for real-time handling
   */
  private async processIndividualRecord(record: any): Promise<{ success: boolean; error?: string }> {
    try {
      const allFields = record.allFields;
      const employeeCode = allFields.emp_code;
      const punchTime = allFields.punch_time;
      const punchState = allFields.punch_state;
      
      console.log(`[RealTimeProcessor] 🔍 Processing record: biotimeId=${record.biotimeId}, empCode=${employeeCode}, punchTime=${punchTime}, punchState=${punchState}`);
      
      if (!employeeCode || !punchTime) {
        console.log(`[RealTimeProcessor] ❌ Missing required fields: emp_code=${employeeCode}, punch_time=${punchTime}`);
        return { success: false, error: `Missing required fields: emp_code=${employeeCode}, punch_time=${punchTime}` };
      }

      // Simple Pakistan timezone handling - no complex conversions
      const punchTimeDate = new Date(punchTime);
      const dateString = punchTime.split(' ')[0]; // Extract date part: "2025-07-14"
      
      console.log(`[RealTimeProcessor] 🌍 Processing punch: ${punchTime} -> Date object created`);
      console.log(`[RealTimeProcessor] 🔄 Date string for DB: ${dateString}`);

      // Check if this is a punch-in (0) or punch-out (1)
      const isPunchIn = punchState === '0';

      if (isPunchIn) {
        // Handle punch-in: Create new attendance record or update existing incomplete one
        await this.handlePunchIn(employeeCode, punchTimeDate, dateString, record);
      } else {
        // Handle punch-out: Find and update existing attendance record
        await this.handlePunchOut(employeeCode, punchTimeDate, dateString, record);
      }

      console.log(`[RealTimeProcessor] ✅ Successfully processed record: ${employeeCode}`);
      return { success: true };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle punch-in record
   */
  private async handlePunchIn(employeeCode: string, punchTime: Date, dateString: string, record: any) {
    console.log(`[RealTimeProcessor] 👤 Processing punch-in: ${employeeCode} at ${formatInSystemTimezone(punchTime, 'yyyy-MM-dd HH:mm:ss')}`);

    // Check if there's already an incomplete attendance record for this employee today
    const existingRecord = await db.select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeCode, employeeCode),
          sql`DATE(${attendanceRecords.checkIn}) = ${dateString}`,
          sql`${attendanceRecords.checkOut} IS NULL`
        )
      )
      .limit(1);

    if (existingRecord.length > 0) {
      console.log(`[RealTimeProcessor] ⚠️ Found existing incomplete record for ${employeeCode} on ${dateString}, updating check-in time`);
      
      // Update the existing record with new punch-in time
      await db.update(attendanceRecords)
        .set({
          checkIn: punchTime,
          biotimeId: record.biotimeId,
          updatedAt: new Date()
        })
        .where(eq(attendanceRecords.id, existingRecord[0].id));
    } else {
      // Create new attendance record
      console.log(`[RealTimeProcessor] 💾 INSERTING: employeeCode=${employeeCode}, checkIn=${punchTime}, status=incomplete, biotimeId=${record.biotimeId}`);
      
      // Get clean employee name from BioTime employee endpoint
      const cleanName = await employeeNameLookupService.getNameForAttendance(employeeCode);
      console.log(`[RealTimeProcessor] 📛 Clean name for ${employeeCode}: "${cleanName}"`);
      
      const insertResult = await db.insert(attendanceRecords).values({
        employeeCode,
        checkIn: punchTime,
        checkOut: null,
        totalHours: 0,
        status: 'incomplete',
        biotimeId: record.biotimeId,
        date: punchTime, // Use Date object instead of string
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log(`[RealTimeProcessor] 💾 INSERT SUCCESS:`, insertResult);
      
      console.log(`[RealTimeProcessor] ✅ Created new incomplete attendance record for ${employeeCode}`);
      console.log(`[RealTimeProcessor] 💾 INSERT VALUES: employeeCode=${employeeCode}, checkIn=${punchTime}, status=incomplete, biotimeId=${record.biotimeId}`);
    }
  }

  /**
   * Handle punch-out record
   */
  private async handlePunchOut(employeeCode: string, punchTime: Date, dateString: string, record: any) {
    console.log(`[RealTimeProcessor] 👤 Processing punch-out: ${employeeCode} at ${formatInSystemTimezone(punchTime, 'yyyy-MM-dd HH:mm:ss')}`);

    // Find the corresponding punch-in record
    const punchInRecord = await db.select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeCode, employeeCode),
          sql`DATE(${attendanceRecords.checkIn}) = ${dateString}`,
          sql`${attendanceRecords.checkOut} IS NULL`
        )
      )
      .orderBy(desc(attendanceRecords.checkIn))
      .limit(1);

    if (punchInRecord.length > 0) {
      const record_to_update = punchInRecord[0];
      const checkInTime = new Date(record_to_update.checkIn);
      
      // Calculate hours worked
      const hoursWorked = (punchTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
      const cappedHours = Math.min(hoursWorked, 12); // Cap at 12 hours
      
      // Update the record with punch-out
      await db.update(attendanceRecords)
        .set({
          checkOut: punchTime,
          totalHours: cappedHours,
          status: 'complete',
          updatedAt: new Date()
        })
        .where(eq(attendanceRecords.id, record_to_update.id));

      console.log(`[RealTimeProcessor] ✅ Updated attendance record: ${employeeCode} worked ${cappedHours.toFixed(2)} hours`);
      console.log(`[RealTimeProcessor] 💾 UPDATE VALUES: checkOut=${punchTime}, totalHours=${cappedHours}, status=complete`);
    } else {
      console.log(`[RealTimeProcessor] ⚠️ No punch-in found for punch-out: ${employeeCode} on ${dateString}`);
      
      // Create orphaned punch-out record
      console.log(`[RealTimeProcessor] 💾 INSERTING ORPHAN: employeeCode=${employeeCode}, punchTime=${punchTime}, biotimeId=${record.biotimeId}`);
      
      const insertResult = await db.insert(attendanceRecords).values({
        employeeCode,
        checkIn: punchTime, // Use punch-out time as check-in
        checkOut: punchTime,
        totalHours: 0,
        status: 'orphaned_punchout',
        biotimeId: record.biotimeId,
        notes: 'Orphaned punch-out - no corresponding punch-in found',
        date: punchTime, // Use Date object instead of string
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log(`[RealTimeProcessor] 💾 INSERT ORPHAN SUCCESS:`, insertResult);
      
      console.log(`[RealTimeProcessor] ⚠️ Created orphaned punch-out record for ${employeeCode}`);
    }
  }
}

// Export singleton instance
export const realTimeProcessor = new RealTimeProcessor();