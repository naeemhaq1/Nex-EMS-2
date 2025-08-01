import { db } from "./db";
import { attendanceRecords, employeeRecords, shifts } from "@shared/schema";
import { eq, and, sql, desc, gte, isNull } from "drizzle-orm";
import { subDays } from "date-fns";

/**
 * Quick timing recalculation for recent records
 */
export async function quickTimingRecalculation() {
  console.log('[QuickTiming] Starting quick timing recalculation...');
  
  const cutoffDate = subDays(new Date(), 30); // Last 30 days only
  
  try {
    // Get unprocessed records from last 30 days
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
      .limit(1000);

    console.log(`[QuickTiming] Found ${records.length} records to process`);

    let processed = 0;
    let updated = 0;

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
        
        // Calculate timing differences
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
        
        // Calculate departure status
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
        
        updated++;
        processed++;
        
        if (processed % 100 === 0) {
          console.log(`[QuickTiming] Progress: ${processed}/${records.length} processed`);
        }
        
      } catch (error) {
        console.error(`[QuickTiming] Error processing record ${record.id}:`, error);
        processed++;
      }
    }

    console.log(`[QuickTiming] ✅ Completed: ${processed} processed, ${updated} updated`);
    return { processed, updated };
    
  } catch (error) {
    console.error('[QuickTiming] Error:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  quickTimingRecalculation()
    .then((result) => {
      console.log('✅ Quick timing recalculation completed:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Quick timing recalculation failed:', error);
      process.exit(1);
    });
}