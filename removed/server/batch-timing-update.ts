import { db } from "./db";
import { attendanceRecords, employeeRecords, shifts } from "@shared/schema";
import { eq, and, sql, gte, limit, offset } from "drizzle-orm";
import { subDays } from "date-fns";

/**
 * Batch update timing analysis in smaller chunks
 */
export async function batchTimingUpdate() {
  console.log('[BatchTiming] Starting batch timing update...');
  
  const cutoffDate = subDays(new Date(), 90); // Last 90 days
  const batchSize = 100; // Process 100 records at a time
  let currentOffset = 0;
  let totalProcessed = 0;
  let totalUpdated = 0;
  
  try {
    while (true) {
      // Get a batch of unprocessed records
      const records = await db
        .select({
          id: attendanceRecords.id,
          employeeCode: attendanceRecords.employeeCode,
          checkIn: attendanceRecords.checkIn,
          checkOut: attendanceRecords.checkOut,
          date: attendanceRecords.date,
          shiftId: employeeRecords.shiftId,
          shiftStartHour: shifts.startHour,
          shiftStartMinute: shifts.startMinute,
          shiftEndHour: shifts.endHour,
          shiftEndMinute: shifts.endMinute,
          gracePeriodMinutes: shifts.gracePeriodMinutes
        })
        .from(attendanceRecords)
        .leftJoin(employeeRecords, eq(attendanceRecords.employeeCode, employeeRecords.employeeCode))
        .leftJoin(shifts, eq(employeeRecords.shiftId, shifts.id))
        .where(
          and(
            gte(attendanceRecords.date, cutoffDate),
            sql`${attendanceRecords.checkIn} IS NOT NULL`,
            eq(attendanceRecords.timingProcessed, false)
          )
        )
        .limit(batchSize)
        .offset(currentOffset);

      if (records.length === 0) {
        console.log('[BatchTiming] No more records to process');
        break;
      }

      console.log(`[BatchTiming] Processing batch: ${records.length} records (offset: ${currentOffset})`);

      // Process each record in the batch
      for (const record of records) {
        try {
          if (!record.checkIn) continue;

          const checkInTime = new Date(record.checkIn);
          const checkOutTime = record.checkOut ? new Date(record.checkOut) : null;
          
          // Calculate expected times
          const attendanceDate = new Date(record.date);
          const expectedArrival = new Date(attendanceDate);
          const expectedDeparture = new Date(attendanceDate);
          
          const startHour = record.shiftStartHour || 9;
          const startMinute = record.shiftStartMinute || 0;
          const endHour = record.shiftEndHour || 17;
          const endMinute = record.shiftEndMinute || 0;
          const graceMinutes = record.gracePeriodMinutes || 30;
          
          expectedArrival.setHours(startHour, startMinute, 0, 0);
          expectedDeparture.setHours(endHour, endMinute, 0, 0);
          
          // Calculate arrival timing
          const arrivalDiff = Math.floor((checkInTime.getTime() - expectedArrival.getTime()) / (1000 * 60));
          
          let arrivalStatus = 'on_time';
          let earlyMinutes = 0;
          let lateMinutes = 0;
          let graceMinutesUsed = 0;
          
          if (arrivalDiff < 0) {
            arrivalStatus = 'early';
            earlyMinutes = Math.abs(arrivalDiff);
          } else if (arrivalDiff <= graceMinutes) {
            arrivalStatus = arrivalDiff === 0 ? 'on_time' : 'grace';
            graceMinutesUsed = arrivalDiff;
          } else {
            arrivalStatus = 'late';
            lateMinutes = arrivalDiff;
          }
          
          // Calculate departure timing
          let departureStatus = 'incomplete';
          let earlyDepartureMinutes = 0;
          let lateDepartureMinutes = 0;
          
          if (checkOutTime) {
            const departureDiff = Math.floor((checkOutTime.getTime() - expectedDeparture.getTime()) / (1000 * 60));
            
            if (departureDiff < 0) {
              departureStatus = 'early';
              earlyDepartureMinutes = Math.abs(departureDiff);
            } else if (departureDiff <= 30) {
              departureStatus = 'on_time';
            } else {
              departureStatus = 'late';
              lateDepartureMinutes = departureDiff;
            }
          }
          
          // Update record
          await db
            .update(attendanceRecords)
            .set({
              arrivalStatus,
              departureStatus,
              earlyMinutes,
              lateMinutes,
              graceMinutes: graceMinutesUsed,
              earlyDepartureMinutes,
              lateDepartureMinutes,
              expectedArrival,
              actualArrival: checkInTime,
              expectedDeparture,
              actualDeparture: checkOutTime,
              timingProcessed: true,
              timingProcessedAt: new Date()
            })
            .where(eq(attendanceRecords.id, record.id));
          
          totalUpdated++;
          
        } catch (error) {
          console.error(`[BatchTiming] Error processing record ${record.id}:`, error);
        }
      }

      totalProcessed += records.length;
      currentOffset += batchSize;
      
      console.log(`[BatchTiming] Progress: ${totalProcessed} processed, ${totalUpdated} updated`);
      
      // If we got fewer records than batch size, we're done
      if (records.length < batchSize) {
        break;
      }
    }

    console.log(`[BatchTiming] ✅ Completed: ${totalProcessed} processed, ${totalUpdated} updated`);
    return { processed: totalProcessed, updated: totalUpdated };
    
  } catch (error) {
    console.error('[BatchTiming] Error:', error);
    throw error;
  }
}

// Also update the existing late_minutes field in the main attendance_records table
export async function updateLateMinutesField() {
  console.log('[BatchTiming] Updating late_minutes field...');
  
  try {
    await db.execute(sql`
      UPDATE attendance_records 
      SET late_minutes = CASE 
        WHEN arrival_status = 'late' THEN late_minutes
        ELSE 0
      END
      WHERE timing_processed = true;
    `);
    
    console.log('[BatchTiming] ✅ Updated late_minutes field');
  } catch (error) {
    console.error('[BatchTiming] Error updating late_minutes:', error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  Promise.all([
    batchTimingUpdate(),
    updateLateMinutesField()
  ])
    .then(([result]) => {
      console.log('✅ Batch timing update completed:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Batch timing update failed:', error);
      process.exit(1);
    });
}