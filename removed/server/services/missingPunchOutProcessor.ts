import { db } from "../db";
import { attendanceRecords, employeeRecords, shifts } from "@shared/schema";
import { eq, and, gte, lte, isNull, sql, or } from "drizzle-orm";
import { startOfDay, endOfDay, subDays, differenceInHours, addHours } from "date-fns";

interface MissingPunchOutResult {
  employeeCode: string;
  date: Date;
  checkInTime: Date;
  estimatedCheckOut: Date;
  originalHours: number;
  cappedHours: number;
  adjustmentReason: string;
}

/**
 * Missing Punch-Out Processor
 * Prevents overbilling by capping hours for missing punch-outs
 */
export class MissingPunchOutProcessor {
  private readonly maxOvertimeHours = 3; // Maximum 3 hours overtime allowed
  private readonly standardShiftHours = 8; // Standard shift length when no shift data
  private readonly maxSessionDuration = 12; // Maximum 12 hours from punch-in

  constructor() {}

  /**
   * Process missing punch-outs to prevent overbilling
   */
  async processMissingPunchOuts(dateRange: { from: Date; to: Date }): Promise<{
    processedRecords: number;
    adjustmentsMade: number;
    potentialOverbilling: number; // Hours that would have been overbilled
    results: MissingPunchOutResult[];
  }> {
    console.log("[MissingPunchOutProcessor] 🔍 Scanning for missing punch-outs...");
    
    const results: MissingPunchOutResult[] = [];
    let adjustmentsMade = 0;
    let potentialOverbilling = 0;

    // Find all attendance records with check-in but no check-out
    const missingPunchOuts = await db
      .select({
        id: attendanceRecords.id,
        employeeCode: attendanceRecords.employeeCode,
        checkIn: attendanceRecords.checkIn,
        checkOut: attendanceRecords.checkOut,
        hoursWorked: attendanceRecords.hoursWorked,
        date: attendanceRecords.date,
        biotimeId: attendanceRecords.biotimeId
      })
      .from(attendanceRecords)
      .where(
        and(
          gte(attendanceRecords.date, dateRange.from),
          lte(attendanceRecords.date, dateRange.to),
          isNull(attendanceRecords.checkOut), // Missing punch-out
          sql`${attendanceRecords.checkIn} IS NOT NULL` // Has punch-in
        )
      );

    console.log(`[MissingPunchOutProcessor] Found ${missingPunchOuts.length} records with missing punch-outs`);

    for (const record of missingPunchOuts) {
      const result = await this.processIndividualMissingPunchOut(record);
      if (result) {
        results.push(result);
        
        if (result.originalHours > result.cappedHours) {
          adjustmentsMade++;
          potentialOverbilling += (result.originalHours - result.cappedHours);
          
          // Update the record to prevent overbilling
          await this.updateAttendanceRecord(record.id, result);
        }
      }
    }

    console.log(`[MissingPunchOutProcessor] ✅ Processed ${missingPunchOuts.length} records`);
    console.log(`[MissingPunchOutProcessor] 🛡️ Made ${adjustmentsMade} adjustments to prevent overbilling`);
    console.log(`[MissingPunchOutProcessor] 💰 Prevented ${potentialOverbilling.toFixed(2)} hours of overbilling`);

    return {
      processedRecords: missingPunchOuts.length,
      adjustmentsMade,
      potentialOverbilling,
      results
    };
  }

  /**
   * Process individual missing punch-out record
   */
  private async processIndividualMissingPunchOut(record: any): Promise<MissingPunchOutResult | null> {
    try {
      if (!record.checkIn) return null;

      const checkInTime = new Date(record.checkIn);
      const employeeCode = record.employeeCode;

      // Get employee shift information for context
      const employee = await db
        .select({
          shiftId: employeeRecords.shiftId,
          shiftName: shifts.shiftName,
          startTime: shifts.startTime,
          endTime: shifts.endTime,
          department: employeeRecords.department
        })
        .from(employeeRecords)
        .leftJoin(shifts, eq(employeeRecords.shiftId, shifts.id))
        .where(eq(employeeRecords.employeeCode, employeeCode))
        .limit(1);

      const shiftInfo = employee[0];
      
      // RESTRICTIVE LOGIC: Apply your specific business rules
      
      // Calculate shift end time from punch-in time
      let shiftEndTime: Date;
      let shiftDuration: number;
      
      if (shiftInfo?.startTime && shiftInfo?.endTime) {
        shiftDuration = this.calculateShiftDuration(shiftInfo.startTime, shiftInfo.endTime);
        shiftEndTime = addHours(checkInTime, shiftDuration);
      } else {
        // No shift data - use standard 8 hours from punch-in
        shiftDuration = this.standardShiftHours;
        shiftEndTime = addHours(checkInTime, this.standardShiftHours);
      }
      
      // Calculate the two time limits as per your specification:
      // 1. 6 hours after shift ends OR 12 hours from punch-in (whichever is later)
      const sixHoursAfterShiftEnd = addHours(shiftEndTime, 6);
      const twelveHoursFromPunchIn = addHours(checkInTime, this.maxSessionDuration);
      
      // Use whichever comes later (more restrictive approach)
      const maxAllowedTime = sixHoursAfterShiftEnd > twelveHoursFromPunchIn ? sixHoursAfterShiftEnd : twelveHoursFromPunchIn;
      
      // For missing punch-outs: maximum is arrival time to shift end (or 8 hours if no shift)
      let cappedHours: number;
      let estimatedCheckOut: Date;
      let adjustmentReason: string;
      
      // Check if there's a valid punch-out
      if (record.checkOut) {
        // Session terminates at punch-out time (max 3 hours after shift ends)
        const actualCheckOut = new Date(record.checkOut);
        const maxAllowedCheckOut = addHours(shiftEndTime, this.maxOvertimeHours);
        
        if (actualCheckOut <= maxAllowedCheckOut) {
          // Punch-out is within 3 hours of shift end - use actual punch-out
          cappedHours = differenceInHours(actualCheckOut, checkInTime);
          estimatedCheckOut = actualCheckOut;
          adjustmentReason = `Actual punch-out within ${this.maxOvertimeHours}h overtime limit`;
        } else {
          // Punch-out is too late - cap at shift end + 3 hours
          cappedHours = differenceInHours(maxAllowedCheckOut, checkInTime);
          estimatedCheckOut = maxAllowedCheckOut;
          adjustmentReason = `Capped at shift end + ${this.maxOvertimeHours}h overtime (${cappedHours}h total)`;
        }
      } else {
        // No punch-out: use arrival time to shift end (or 8 hours if no shift)
        cappedHours = shiftDuration;
        estimatedCheckOut = shiftEndTime;
        if (shiftInfo?.shiftName) {
          adjustmentReason = `No punch-out: arrival to shift end (${shiftInfo.shiftName}: ${cappedHours}h)`;
        } else {
          adjustmentReason = `No punch-out: standard ${this.standardShiftHours}h limit applied`;
        }
      }

      return {
        employeeCode,
        date: new Date(record.date),
        checkInTime,
        estimatedCheckOut,
        originalHours: record.hoursWorked || currentHours,
        cappedHours,
        adjustmentReason
      };

    } catch (error) {
      console.error(`[MissingPunchOutProcessor] Error processing ${record.employeeCode}:`, error);
      return null;
    }
  }

  /**
   * Calculate shift duration from start/end time strings
   */
  private calculateShiftDuration(startTime: string, endTime: string): number {
    try {
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMin;
      let endMinutes = endHour * 60 + endMin;
      
      // Handle overnight shifts
      if (endMinutes <= startMinutes) {
        endMinutes += 24 * 60; // Add 24 hours
      }
      
      const durationMinutes = endMinutes - startMinutes;
      return Math.min(durationMinutes / 60, this.maxWorkingHours);
    } catch (error) {
      console.error("[MissingPunchOutProcessor] Error calculating shift duration:", error);
      return this.standardShiftHours;
    }
  }

  /**
   * Check if employee is field staff (may work irregular hours)
   */
  private isFieldStaff(department?: string): boolean {
    if (!department) return false;
    
    const fieldDepartments = [
      'PSCA', 'LHE-Safecity', 'LHE-Safecity-Drivers', 
      'Tech', 'LHE-Datacom', 'Field Operations'
    ];
    
    return fieldDepartments.some(dept => 
      department.toLowerCase().includes(dept.toLowerCase())
    );
  }

  /**
   * Check if employee has recent overtime patterns (last 7 days)
   */
  private async checkRecentOvertimePattern(employeeCode: string): Promise<boolean> {
    try {
      const sevenDaysAgo = subDays(new Date(), 7);
      
      const recentAttendance = await db
        .select({
          totalHours: attendanceRecords.totalHours
        })
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.employeeCode, employeeCode),
            gte(attendanceRecords.date, sevenDaysAgo),
            sql`${attendanceRecords.checkIn} IS NOT NULL`,
            sql`${attendanceRecords.checkOut} IS NOT NULL`
          )
        )
        .limit(7);

      // Check if employee has worked overtime in 3+ days in last week
      const overtimeDays = recentAttendance.filter(record => 
        record.totalHours && record.totalHours > 8
      ).length;

      return overtimeDays >= 3; // Has overtime pattern if 3+ days had overtime
    } catch (error) {
      console.error("[MissingPunchOutProcessor] Error checking overtime pattern:", error);
      return false;
    }
  }

  /**
   * Check if date is during busy periods (month-end, deadlines)
   */
  private isBusyPeriod(date: Date): boolean {
    const day = date.getDate();
    const month = date.getMonth();
    
    // Month-end periods (last 3 days of month)
    const lastDayOfMonth = new Date(date.getFullYear(), month + 1, 0).getDate();
    if (day > lastDayOfMonth - 3) return true;
    
    // Beginning of month (first 3 days)
    if (day <= 3) return true;
    
    // Add specific busy periods for your company
    // e.g., quarterly reports, project deadlines
    
    return false;
  }

  /**
   * Update attendance record with anti-overbilling measures
   */
  private async updateAttendanceRecord(recordId: number, result: MissingPunchOutResult): Promise<void> {
    try {
      await db
        .update(attendanceRecords)
        .set({
          checkOut: result.estimatedCheckOut,
          hoursWorked: result.cappedHours,
          notes: sql`COALESCE(${attendanceRecords.notes}, '') || ' | ANTI-OVERBILLING: ' || ${result.adjustmentReason}`,
          updatedAt: new Date()
        })
        .where(eq(attendanceRecords.id, recordId));

      console.log(`[MissingPunchOutProcessor] 🛡️ Updated ${result.employeeCode}: ${result.originalHours}h → ${result.cappedHours}h`);
    } catch (error) {
      console.error(`[MissingPunchOutProcessor] Error updating record ${recordId}:`, error);
    }
  }

  /**
   * Generate daily missing punch-out report
   */
  async generateDailyReport(date: Date = new Date()): Promise<{
    date: string;
    totalMissingPunchOuts: number;
    potentialOverbillingPrevented: number;
    employeesSummary: Array<{
      employeeCode: string;
      department: string;
      checkInTime: string;
      cappedHours: number;
      reason: string;
    }>;
  }> {
    const startOfDate = startOfDay(date);
    const endOfDate = endOfDay(date);

    const result = await this.processMissingPunchOuts({
      from: startOfDate,
      to: endOfDate
    });

    const employeesSummary = await Promise.all(
      result.results.map(async (r) => {
        const emp = await db
          .select({ department: employeeRecords.department })
          .from(employeeRecords)
          .where(eq(employeeRecords.employeeCode, r.employeeCode))
          .limit(1);

        return {
          employeeCode: r.employeeCode,
          department: emp[0]?.department || 'Unknown',
          checkInTime: r.checkInTime.toISOString(),
          cappedHours: r.cappedHours,
          reason: r.adjustmentReason
        };
      })
    );

    return {
      date: date.toISOString().split('T')[0],
      totalMissingPunchOuts: result.processedRecords,
      potentialOverbillingPrevented: result.potentialOverbilling,
      employeesSummary
    };
  }

  /**
   * Schedule automatic daily processing to prevent overbilling
   */
  async scheduleAutomaticProcessing(): Promise<void> {
    // Process yesterday's data every morning at 6 AM
    const scheduleDaily = () => {
      const yesterday = subDays(new Date(), 1);
      this.processMissingPunchOuts({
        from: startOfDay(yesterday),
        to: endOfDay(yesterday)
      }).then((result) => {
        console.log(`[MissingPunchOutProcessor] 🔄 Daily processing completed: ${result.adjustmentsMade} adjustments made`);
      });
    };

    // Schedule for 6 AM daily
    setInterval(scheduleDaily, 24 * 60 * 60 * 1000); // 24 hours
    console.log("[MissingPunchOutProcessor] ⏰ Automatic daily processing scheduled");
  }
}

export const missingPunchOutProcessor = new MissingPunchOutProcessor();