import { db } from "./db";
import { attendanceRecords, employeeRecords, shifts } from "@shared/schema";
import { eq, and, sql, gte, desc, asc } from "drizzle-orm";
import { subDays, startOfDay } from "date-fns";

/**
 * Comprehensive punch type classification based on business rules
 */
export interface PunchTypeClassification {
  recordId: number;
  employeeCode: string;
  date: string;
  checkIn: Date | null;
  checkOut: Date | null;
  punchType: string;
  reason: string;
}

/**
 * Classify punch types based on business rules:
 * 
 * CHECK-IN TYPES:
 * - standard_checkin: Within ±30 minutes of shift start
 * - interim_checkin: If standard check-in already exists for the day
 * - early_checkin: More than 30 minutes before shift start
 * 
 * CHECK-OUT TYPES:
 * - standard_checkout: After shift end but within 1 hour OR any other case
 * - interim_checkout: If standard checkout already exists for the day
 * - early_checkout: More than 30 minutes before shift end
 * - late_checkout: More than 1 hour after shift end
 */
export async function classifyPunchTypes(startDate: Date, endDate: Date): Promise<PunchTypeClassification[]> {
  console.log('[PunchTypeClassifier] Starting punch type classification...');
  
  // Get all attendance records for the date range with employee and shift info
  const records = await db
    .select({
      id: attendanceRecords.id,
      employeeCode: attendanceRecords.employeeCode,
      date: attendanceRecords.date,
      checkIn: attendanceRecords.checkIn,
      checkOut: attendanceRecords.checkOut,
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
        gte(attendanceRecords.date, startDate),
        sql`${attendanceRecords.date} <= ${endDate}`
      )
    )
    .orderBy(asc(attendanceRecords.date), asc(attendanceRecords.employeeCode), asc(attendanceRecords.checkIn));

  console.log(`[PunchTypeClassifier] Processing ${records.length} records`);

  const classifications: PunchTypeClassification[] = [];
  
  // Group records by employee and date to detect duplicates
  const dailyRecords = new Map<string, typeof records>();
  
  for (const record of records) {
    const key = `${record.employeeCode}-${record.date}`;
    if (!dailyRecords.has(key)) {
      dailyRecords.set(key, []);
    }
    dailyRecords.get(key)!.push(record);
  }

  // Process each day's records for each employee
  for (const [dayKey, dayRecords] of dailyRecords) {
    const [employeeCode, dateStr] = dayKey.split('-');
    
    // Sort records by check-in time for this day
    const sortedRecords = dayRecords.sort((a, b) => {
      const aTime = a.checkIn ? new Date(a.checkIn).getTime() : 0;
      const bTime = b.checkIn ? new Date(b.checkIn).getTime() : 0;
      return aTime - bTime;
    });

    // Get shift timing (default to 9:00-17:00 if no shift)
    const shiftStartHour = sortedRecords[0]?.shiftStartHour || 9;
    const shiftStartMinute = sortedRecords[0]?.shiftStartMinute || 0;
    const shiftEndHour = sortedRecords[0]?.shiftEndHour || 17;
    const shiftEndMinute = sortedRecords[0]?.shiftEndMinute || 0;

    // Calculate expected shift times
    const attendanceDate = new Date(dateStr);
    const shiftStart = new Date(attendanceDate);
    shiftStart.setHours(shiftStartHour, shiftStartMinute, 0, 0);
    
    const shiftEnd = new Date(attendanceDate);
    shiftEnd.setHours(shiftEndHour, shiftEndMinute, 0, 0);

    // Track which types have been used
    let hasStandardCheckin = false;
    let hasStandardCheckout = false;

    // Classify each record
    for (const record of sortedRecords) {
      let punchType = 'standard_checkout'; // Default case
      let reason = 'Default standard checkout';

      // Process check-in if exists
      if (record.checkIn) {
        const checkInTime = new Date(record.checkIn);
        const diffFromStart = (checkInTime.getTime() - shiftStart.getTime()) / (1000 * 60); // Minutes

        if (!hasStandardCheckin) {
          // First check-in of the day
          if (diffFromStart <= 30 && diffFromStart >= -30) {
            punchType = 'standard_checkin';
            reason = `Check-in within ±30 minutes of shift start (${Math.round(diffFromStart)} min)`;
            hasStandardCheckin = true;
          } else if (diffFromStart < -30) {
            punchType = 'early_checkin';
            reason = `Check-in more than 30 minutes before shift start (${Math.round(Math.abs(diffFromStart))} min early)`;
          } else {
            punchType = 'standard_checkin';
            reason = `Late check-in but treated as standard (${Math.round(diffFromStart)} min late)`;
            hasStandardCheckin = true;
          }
        } else {
          // Additional check-in after standard exists
          punchType = 'interim_checkin';
          reason = 'Additional check-in after standard check-in already exists';
        }
      }

      // Process check-out if exists (and if this wasn't classified as check-in)
      if (record.checkOut && punchType.includes('checkout')) {
        const checkOutTime = new Date(record.checkOut);
        const diffFromEnd = (checkOutTime.getTime() - shiftEnd.getTime()) / (1000 * 60); // Minutes

        if (!hasStandardCheckout) {
          // First check-out of the day
          if (diffFromEnd < -30) {
            punchType = 'early_checkout';
            reason = `Check-out more than 30 minutes before shift end (${Math.round(Math.abs(diffFromEnd))} min early)`;
          } else if (diffFromEnd > 60) {
            punchType = 'late_checkout';
            reason = `Check-out more than 1 hour after shift end (${Math.round(diffFromEnd)} min late)`;
          } else {
            punchType = 'standard_checkout';
            reason = `Standard check-out (${Math.round(diffFromEnd)} min from shift end)`;
            hasStandardCheckout = true;
          }
        } else {
          // Additional check-out after standard exists
          punchType = 'interim_checkout';
          reason = 'Additional check-out after standard check-out already exists';
        }
      }

      classifications.push({
        recordId: record.id,
        employeeCode: record.employeeCode,
        date: dateStr,
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        punchType,
        reason
      });
    }
  }

  console.log(`[PunchTypeClassifier] Classified ${classifications.length} records`);
  return classifications;
}

/**
 * Update punch types in the database for the last 90 days
 */
export async function updatePunchTypesLast90Days() {
  console.log('[PunchTypeClassifier] Updating punch types for last 90 days...');
  
  const endDate = new Date();
  const startDate = subDays(endDate, 90);
  
  try {
    // Get classifications
    const classifications = await classifyPunchTypes(startDate, endDate);
    
    // Update records in batches
    const batchSize = 100;
    let updated = 0;
    
    for (let i = 0; i < classifications.length; i += batchSize) {
      const batch = classifications.slice(i, i + batchSize);
      
      // Update each record in the batch
      for (const classification of batch) {
        await db
          .update(attendanceRecords)
          .set({ punchType: classification.punchType })
          .where(eq(attendanceRecords.id, classification.recordId));
        
        updated++;
      }
      
      console.log(`[PunchTypeClassifier] Progress: ${Math.min(i + batchSize, classifications.length)}/${classifications.length} updated`);
    }
    
    // Generate statistics
    const stats = classifications.reduce((acc, curr) => {
      acc[curr.punchType] = (acc[curr.punchType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('[PunchTypeClassifier] ✅ Completed punch type classification');
    console.log('[PunchTypeClassifier] Statistics:', stats);
    
    return { updated, classifications: classifications.length, stats };
    
  } catch (error) {
    console.error('[PunchTypeClassifier] Error:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  updatePunchTypesLast90Days()
    .then((result) => {
      console.log('✅ Punch type classification completed:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Punch type classification failed:', error);
      process.exit(1);
    });
}