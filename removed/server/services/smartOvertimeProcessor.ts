import { db } from "../db";
import { attendanceRecords, employeeRecords, shifts } from "@shared/schema";
import { eq, and, gte, lte, isNull, sql, or } from "drizzle-orm";
import { startOfDay, endOfDay, subDays, differenceInHours, addHours } from "date-fns";

interface SmartOvertimeResult {
  employeeCode: string;
  date: Date;
  checkInTime: Date;
  suggestedCheckOut: Date;
  originalHours: number;
  adjustedHours: number;
  overtimeJustification: string;
  approvalRequired: boolean;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Smart Overtime Processor
 * Balances anti-overbilling with genuine overtime recognition
 */
export class SmartOvertimeProcessor {
  private readonly maxWorkingHours = 16; // Absolute maximum
  private readonly standardHours = 8;
  private readonly overtimeThreshold = 8;
  private readonly maxAutoApproveOvertime = 4; // Auto-approve up to 4 hours overtime

  constructor() {}

  /**
   * Process missing punch-outs with smart overtime detection
   */
  async processSmartOvertime(dateRange: { from: Date; to: Date }): Promise<{
    processedRecords: number;
    autoApproved: number;
    requiresApproval: number;
    overbillingPrevented: number;
    results: SmartOvertimeResult[];
  }> {
    console.log("[SmartOvertimeProcessor] 🧠 Processing smart overtime detection...");
    
    const results: SmartOvertimeResult[] = [];
    let autoApproved = 0;
    let requiresApproval = 0;
    let overbillingPrevented = 0;

    // Find missing punch-outs
    const missingPunchOuts = await db
      .select({
        id: attendanceRecords.id,
        employeeCode: attendanceRecords.employeeCode,
        checkIn: attendanceRecords.checkIn,
        checkOut: attendanceRecords.checkOut,
        totalHours: attendanceRecords.totalHours,
        date: attendanceRecords.date,
        biotimeId: attendanceRecords.biotimeId
      })
      .from(attendanceRecords)
      .where(
        and(
          gte(attendanceRecords.date, dateRange.from),
          lte(attendanceRecords.date, dateRange.to),
          isNull(attendanceRecords.checkOut),
          sql`${attendanceRecords.checkIn} IS NOT NULL`
        )
      );

    console.log(`[SmartOvertimeProcessor] Found ${missingPunchOuts.length} missing punch-outs`);

    for (const record of missingPunchOuts) {
      const result = await this.analyzeSmartOvertime(record);
      results.push(result);

      if (result.approvalRequired) {
        requiresApproval++;
      } else {
        autoApproved++;
        await this.updateAttendanceRecord(record.id, result);
      }

      const hoursSaved = Math.max(0, result.originalHours - result.adjustedHours);
      overbillingPrevented += hoursSaved;
    }

    console.log(`[SmartOvertimeProcessor] ✅ Smart processing completed:`);
    console.log(`  - Auto-approved: ${autoApproved}`);
    console.log(`  - Requires approval: ${requiresApproval}`);
    console.log(`  - Overbilling prevented: ${overbillingPrevented.toFixed(2)} hours`);

    return {
      processedRecords: missingPunchOuts.length,
      autoApproved,
      requiresApproval,
      overbillingPrevented,
      results
    };
  }

  /**
   * Analyze smart overtime for individual record
   */
  private async analyzeSmartOvertime(record: any): Promise<SmartOvertimeResult> {
    const checkInTime = new Date(record.checkIn);
    const employeeCode = record.employeeCode;
    const recordDate = new Date(record.date);

    // Get employee and shift information
    const employeeInfo = await this.getEmployeeInfo(employeeCode);
    
    // Calculate base hours
    const currentHours = differenceInHours(new Date(), checkInTime);
    const originalHours = record.totalHours || currentHours;

    // Smart overtime analysis
    const overtimeAnalysis = await this.performOvertimeAnalysis(
      employeeCode,
      checkInTime,
      recordDate,
      employeeInfo
    );

    const suggestedCheckOut = addHours(checkInTime, overtimeAnalysis.suggestedHours);

    return {
      employeeCode,
      date: recordDate,
      checkInTime,
      suggestedCheckOut,
      originalHours,
      adjustedHours: overtimeAnalysis.suggestedHours,
      overtimeJustification: overtimeAnalysis.justification,
      approvalRequired: overtimeAnalysis.approvalRequired,
      confidence: overtimeAnalysis.confidence
    };
  }

  /**
   * Perform comprehensive overtime analysis
   */
  private async performOvertimeAnalysis(
    employeeCode: string,
    checkInTime: Date,
    recordDate: Date,
    employeeInfo: any
  ): Promise<{
    suggestedHours: number;
    justification: string;
    approvalRequired: boolean;
    confidence: 'high' | 'medium' | 'low';
  }> {
    let suggestedHours = this.standardHours;
    let justifications: string[] = [];
    let confidence: 'high' | 'medium' | 'low' = 'medium';
    let approvalRequired = false;

    // 1. Shift-based analysis
    if (employeeInfo.shift) {
      const shiftHours = this.calculateShiftHours(employeeInfo.shift);
      suggestedHours = Math.max(suggestedHours, shiftHours);
      justifications.push(`Shift: ${employeeInfo.shift.shiftName} (${shiftHours}h)`);
      confidence = 'high';
    }

    // 2. Department-based analysis
    if (this.isFieldStaff(employeeInfo.department)) {
      suggestedHours = Math.max(suggestedHours, 10);
      justifications.push("Field staff allowance (10h)");
      confidence = 'high';
    }

    // 3. Historical pattern analysis
    const historicalPattern = await this.analyzeHistoricalPattern(employeeCode);
    if (historicalPattern.hasOvertimePattern) {
      const patternHours = Math.min(historicalPattern.averageHours, 12);
      suggestedHours = Math.max(suggestedHours, patternHours);
      justifications.push(`Historical pattern (${patternHours}h avg)`);
      confidence = 'high';
    }

    // 4. Busy period analysis
    if (this.isBusyPeriod(recordDate)) {
      suggestedHours = Math.min(suggestedHours + 2, 12);
      justifications.push("Busy period (+2h)");
    }

    // 5. Time-based reasonableness check
    const timeFromCheckIn = differenceInHours(new Date(), checkInTime);
    if (timeFromCheckIn > 16) {
      // Likely forgotten punch-out
      suggestedHours = Math.min(suggestedHours, 12);
      justifications.push("Likely forgotten punch-out (capped at 12h)");
      confidence = 'low';
    }

    // 6. Approval requirements
    const overtimeHours = Math.max(0, suggestedHours - this.overtimeThreshold);
    if (overtimeHours > this.maxAutoApproveOvertime) {
      approvalRequired = true;
      justifications.push(`Requires approval (${overtimeHours}h overtime)`);
    }

    // 7. Weekend/holiday analysis
    if (this.isWeekendOrHoliday(recordDate)) {
      suggestedHours = Math.min(suggestedHours, 8);
      justifications.push("Weekend/holiday standard hours");
      approvalRequired = true;
    }

    return {
      suggestedHours: Math.min(suggestedHours, this.maxWorkingHours),
      justification: justifications.join("; "),
      approvalRequired,
      confidence
    };
  }

  /**
   * Get employee information including shift and department
   */
  private async getEmployeeInfo(employeeCode: string): Promise<any> {
    try {
      const employee = await db
        .select({
          department: employeeRecords.department,
          shiftId: employeeRecords.shiftId,
          shiftName: shifts.shiftName,
          startTime: shifts.startTime,
          endTime: shifts.endTime
        })
        .from(employeeRecords)
        .leftJoin(shifts, eq(employeeRecords.shiftId, shifts.id))
        .where(eq(employeeRecords.employeeCode, employeeCode))
        .limit(1);

      return employee[0] || { department: null, shift: null };
    } catch (error) {
      console.error("[SmartOvertimeProcessor] Error getting employee info:", error);
      return { department: null, shift: null };
    }
  }

  /**
   * Analyze historical overtime patterns
   */
  private async analyzeHistoricalPattern(employeeCode: string): Promise<{
    hasOvertimePattern: boolean;
    averageHours: number;
    overtimeDays: number;
  }> {
    try {
      const thirtyDaysAgo = subDays(new Date(), 30);
      
      const historicalData = await db
        .select({
          totalHours: attendanceRecords.totalHours,
          date: attendanceRecords.date
        })
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.employeeCode, employeeCode),
            gte(attendanceRecords.date, thirtyDaysAgo),
            sql`${attendanceRecords.checkIn} IS NOT NULL`,
            sql`${attendanceRecords.checkOut} IS NOT NULL`
          )
        )
        .limit(30);

      const overtimeRecords = historicalData.filter(record => 
        record.totalHours && record.totalHours > 8
      );

      const averageHours = overtimeRecords.length > 0 
        ? overtimeRecords.reduce((sum, record) => sum + (record.totalHours || 0), 0) / overtimeRecords.length
        : 8;

      return {
        hasOvertimePattern: overtimeRecords.length >= 5, // 5+ overtime days in last 30 days
        averageHours: Math.round(averageHours),
        overtimeDays: overtimeRecords.length
      };
    } catch (error) {
      console.error("[SmartOvertimeProcessor] Error analyzing historical pattern:", error);
      return { hasOvertimePattern: false, averageHours: 8, overtimeDays: 0 };
    }
  }

  /**
   * Calculate shift hours
   */
  private calculateShiftHours(shift: any): number {
    if (!shift?.startTime || !shift?.endTime) return 8;
    
    try {
      const [startHour, startMin] = shift.startTime.split(':').map(Number);
      const [endHour, endMin] = shift.endTime.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMin;
      let endMinutes = endHour * 60 + endMin;
      
      if (endMinutes <= startMinutes) {
        endMinutes += 24 * 60; // Overnight shift
      }
      
      return Math.min((endMinutes - startMinutes) / 60, 12);
    } catch (error) {
      return 8;
    }
  }

  /**
   * Check if employee is field staff
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
   * Check if date is busy period
   */
  private isBusyPeriod(date: Date): boolean {
    const day = date.getDate();
    const month = date.getMonth();
    
    // Month-end periods
    const lastDayOfMonth = new Date(date.getFullYear(), month + 1, 0).getDate();
    if (day > lastDayOfMonth - 3) return true;
    
    // Beginning of month
    if (day <= 3) return true;
    
    return false;
  }

  /**
   * Check if weekend or holiday
   */
  private isWeekendOrHoliday(date: Date): boolean {
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
  }

  /**
   * Update attendance record
   */
  private async updateAttendanceRecord(recordId: number, result: SmartOvertimeResult): Promise<void> {
    try {
      await db
        .update(attendanceRecords)
        .set({
          checkOut: result.suggestedCheckOut,
          totalHours: result.adjustedHours,
          notes: sql`COALESCE(${attendanceRecords.notes}, '') || ' | SMART-OVERTIME: ' || ${result.overtimeJustification}`,
          updatedAt: new Date()
        })
        .where(eq(attendanceRecords.id, recordId));

      console.log(`[SmartOvertimeProcessor] 🧠 Updated ${result.employeeCode}: ${result.originalHours}h → ${result.adjustedHours}h (${result.confidence})`);
    } catch (error) {
      console.error(`[SmartOvertimeProcessor] Error updating record ${recordId}:`, error);
    }
  }
}

export const smartOvertimeProcessor = new SmartOvertimeProcessor();