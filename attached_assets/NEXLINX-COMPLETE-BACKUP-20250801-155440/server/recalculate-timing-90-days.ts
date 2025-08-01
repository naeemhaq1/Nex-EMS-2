import { db } from "./db";
import { 
  attendanceRecords, 
  employeeRecords, 
  shifts, 
  shiftAssignments 
} from "@shared/schema";
import { eq, and, isNull, sql, desc, gte } from "drizzle-orm";
import { formatInSystemTimezone, getCurrentTimezone } from "./config/timezone";
import { subDays, format as formatDate } from "date-fns";

const BATCH_SIZE = 500;

interface TimingAnalysis {
  arrivalStatus: string;
  departureStatus: string;
  earlyMinutes: number;
  lateMinutes: number;
  graceMinutes: number;
  earlyDepartureMinutes: number;
  lateDepartureMinutes: number;
  expectedArrival: string;
  actualArrival: string;
  expectedDeparture: string;
  actualDeparture: string | null;
  timingProcessed: boolean;
  timingProcessedAt: string;
}

/**
 * Recalculate timing analysis for the last 90 days
 */
export async function recalculateTimingAnalysis90Days() {
  console.log('[TimingRecalculation] Starting 90-day timing analysis recalculation...');
  
  const startTime = Date.now();
  const timezone = getCurrentTimezone();
  const cutoffDate = subDays(new Date(), 90);
  
  console.log(`[TimingRecalculation] Processing attendance records from ${formatDate(cutoffDate, 'yyyy-MM-dd')} onwards`);
  console.log(`[TimingRecalculation] Using timezone: ${timezone || 'Asia/Karachi'}`);
  
  try {
    // Get all attendance records from the last 90 days that need processing
    const recordsToProcess = await db
      .select({
        attendanceId: attendanceRecords.id,
        employeeCode: attendanceRecords.employeeCode,
        date: attendanceRecords.date,
        checkIn: attendanceRecords.checkIn,
        checkOut: attendanceRecords.checkOut,
        employeeId: employeeRecords.id,
        shiftId: employeeRecords.shiftId,
        // Shift details
        shiftStartHour: shifts.startHour,
        shiftStartMinute: shifts.startMinute,
        shiftEndHour: shifts.endHour,
        shiftEndMinute: shifts.endMinute,
        daysOfWeek: shifts.daysOfWeek,
        gracePeriodMinutes: shifts.gracePeriodMinutes
      })
      .from(attendanceRecords)
      .leftJoin(employeeRecords, eq(attendanceRecords.employeeCode, employeeRecords.employeeCode))
      .leftJoin(shifts, eq(employeeRecords.shiftId, shifts.id))
      .where(
        and(
          gte(attendanceRecords.date, cutoffDate),
          sql`${attendanceRecords.checkIn} IS NOT NULL` // Has check-in data
        )
      )
      .orderBy(desc(attendanceRecords.date))
      .limit(10000); // Process up to 10,000 records

    console.log(`[TimingRecalculation] Found ${recordsToProcess.length} records to process`);

    let processedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    // Process records in batches
    for (let i = 0; i < recordsToProcess.length; i += BATCH_SIZE) {
      const batch = recordsToProcess.slice(i, i + BATCH_SIZE);
      console.log(`[TimingRecalculation] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(recordsToProcess.length / BATCH_SIZE)}: ${batch.length} records`);

      for (const record of batch) {
        try {
          // Calculate timing analysis
          const analysis = analyzeAttendanceTiming(record);
          
          if (analysis) {
            // Update the attendance record with timing analysis
            await db
              .update(attendanceRecords)
              .set({
                arrivalStatus: analysis.arrivalStatus,
                departureStatus: analysis.departureStatus,
                earlyMinutes: analysis.earlyMinutes,
                lateMinutes: analysis.lateMinutes,
                graceMinutes: analysis.graceMinutes,
                earlyDepartureMinutes: analysis.earlyDepartureMinutes,
                lateDepartureMinutes: analysis.lateDepartureMinutes,
                expectedArrival: new Date(analysis.expectedArrival),
                actualArrival: new Date(analysis.actualArrival),
                expectedDeparture: new Date(analysis.expectedDeparture),
                actualDeparture: analysis.actualDeparture ? new Date(analysis.actualDeparture) : null,
                timingProcessed: true,
                timingProcessedAt: new Date(analysis.timingProcessedAt)
              })
              .where(eq(attendanceRecords.id, record.attendanceId));
            
            updatedCount++;
          }
          
          processedCount++;
          
          if (processedCount % 100 === 0) {
            console.log(`[TimingRecalculation] Progress: ${processedCount}/${recordsToProcess.length} processed, ${updatedCount} updated, ${errorCount} errors`);
          }
          
        } catch (error) {
          errorCount++;
          console.error(`[TimingRecalculation] Error processing record ${record.attendanceId}:`, error);
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[TimingRecalculation] ✅ Completed 90-day timing recalculation in ${duration}ms`);
    console.log(`[TimingRecalculation] Summary: ${processedCount} processed, ${updatedCount} updated, ${errorCount} errors`);
    
    return {
      success: true,
      processed: processedCount,
      updated: updatedCount,
      errors: errorCount,
      duration
    };
    
  } catch (error) {
    console.error('[TimingRecalculation] Fatal error during timing recalculation:', error);
    throw error;
  }
}

/**
 * Analyze attendance timing for a single record
 */
function analyzeAttendanceTiming(record: any): TimingAnalysis | null {
  if (!record.checkIn) {
    return null;
  }

  const checkInTime = new Date(record.checkIn);
  const checkOutTime = record.checkOut ? new Date(record.checkOut) : null;
  
  // Calculate expected arrival and departure times
  const attendanceDate = new Date(record.date);
  const expectedArrival = new Date(attendanceDate);
  const expectedDeparture = new Date(attendanceDate);
  
  // Use shift times if available, otherwise default to 9:00 AM - 5:00 PM
  const startHour = record.shiftStartHour || 9;
  const startMinute = record.shiftStartMinute || 0;
  const endHour = record.shiftEndHour || 17;
  const endMinute = record.shiftEndMinute || 0;
  const graceMinutes = record.gracePeriodMinutes || 30;
  
  expectedArrival.setHours(startHour, startMinute, 0, 0);
  expectedDeparture.setHours(endHour, endMinute, 0, 0);
  
  // Analyze arrival timing
  const arrivalAnalysis = analyzeArrivalTiming(checkInTime, expectedArrival, graceMinutes);
  
  // Analyze departure timing
  const departureAnalysis = analyzeDepartureTiming(checkOutTime, expectedDeparture);
  
  return {
    ...arrivalAnalysis,
    ...departureAnalysis,
    expectedArrival: expectedArrival.toISOString(),
    actualArrival: checkInTime.toISOString(),
    expectedDeparture: expectedDeparture.toISOString(),
    actualDeparture: checkOutTime ? checkOutTime.toISOString() : null,
    timingProcessed: true,
    timingProcessedAt: new Date().toISOString()
  };
}

/**
 * Analyze arrival timing
 */
function analyzeArrivalTiming(actualArrival: Date, expectedArrival: Date, graceMinutes: number) {
  const diffMinutes = Math.floor((actualArrival.getTime() - expectedArrival.getTime()) / (1000 * 60));

  if (diffMinutes < 0) {
    // Early arrival
    return {
      arrivalStatus: 'early',
      earlyMinutes: Math.abs(diffMinutes),
      lateMinutes: 0,
      graceMinutes: 0
    };
  } else if (diffMinutes <= graceMinutes) {
    // Within grace period
    return {
      arrivalStatus: diffMinutes === 0 ? 'on_time' : 'grace',
      earlyMinutes: 0,
      lateMinutes: 0,
      graceMinutes: diffMinutes
    };
  } else {
    // Late arrival
    return {
      arrivalStatus: 'late',
      earlyMinutes: 0,
      lateMinutes: diffMinutes,
      graceMinutes: 0
    };
  }
}

/**
 * Analyze departure timing
 */
function analyzeDepartureTiming(actualDeparture: Date | null, expectedDeparture: Date) {
  if (!actualDeparture) {
    return {
      departureStatus: 'incomplete',
      earlyDepartureMinutes: 0,
      lateDepartureMinutes: 0
    };
  }

  const diffMinutes = Math.floor((actualDeparture.getTime() - expectedDeparture.getTime()) / (1000 * 60));

  if (diffMinutes < 0) {
    // Early departure
    return {
      departureStatus: 'early',
      earlyDepartureMinutes: Math.abs(diffMinutes),
      lateDepartureMinutes: 0
    };
  } else if (diffMinutes <= 30) {
    // On time departure (within 30 minutes)
    return {
      departureStatus: 'on_time',
      earlyDepartureMinutes: 0,
      lateDepartureMinutes: 0
    };
  } else {
    // Late departure (overtime)
    return {
      departureStatus: 'late',
      earlyDepartureMinutes: 0,
      lateDepartureMinutes: diffMinutes
    };
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  recalculateTimingAnalysis90Days()
    .then((result) => {
      console.log('✅ Timing analysis recalculation completed successfully:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Timing analysis recalculation failed:', error);
      process.exit(1);
    });
}