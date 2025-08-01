import { db } from "../db";
import { attendanceRecords, employeeRecords, shifts } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { formatInSystemTimezone } from "../config/timezone";

export class ScoreCalculationService {
  private readonly SCORE_DEDUCTION_PER_HOUR = 2; // 2 points per hour
  private readonly MOBILE_ACTIVITY_RATE = 0.33; // 0.33 points per hour
  private readonly MAX_MOBILE_ACTIVITY_SCORE = 240; // Maximum 240 points

  /**
   * Calculate score deduction for any non-conventional punch-out
   * Applies to: system auto, mobile self, or admin manual punch-outs
   */
  async calculateScoreDeduction(attendanceId: number, punchOutType: 'system_auto' | 'mobile_self' | 'admin_manual'): Promise<{
    scoreDeduction: number;
    mobileActivityScore: number;
    hoursOvertime: number;
    shiftEndTime: Date;
    calculationDetails: string;
  }> {
    
    // Get attendance record with employee and shift info
    const attendanceData = await db
      .select({
        attendance: attendanceRecords,
        employee: employeeRecords,
        shift: shifts
      })
      .from(attendanceRecords)
      .leftJoin(employeeRecords, eq(attendanceRecords.employeeCode, employeeRecords.empCode))
      .leftJoin(shifts, eq(employeeRecords.shiftId, shifts.id))
      .where(eq(attendanceRecords.id, attendanceId))
      .limit(1);

    if (attendanceData.length === 0) {
      throw new Error(`Attendance record not found: ${attendanceId}`);
    }

    const { attendance, employee, shift } = attendanceData[0];

    if (!attendance.checkIn || !attendance.checkOut) {
      throw new Error('Both check-in and check-out times are required for score calculation');
    }

    // Calculate shift end time
    const shiftEndTime = this.calculateShiftEndTime(
      attendance.checkIn,
      shift?.startTime || '09:00',
      shift ? this.calculateShiftDuration(shift.startTime, shift.endTime) : 8
    );

    // Calculate hours overtime (from shift end to actual punch-out)
    const hoursOvertime = Math.max(0, (attendance.checkOut.getTime() - shiftEndTime.getTime()) / (1000 * 60 * 60));

    // Calculate score deduction: 2 points per hour past shift end
    const scoreDeduction = Math.round(hoursOvertime * this.SCORE_DEDUCTION_PER_HOUR);

    // Calculate mobile activity score (capped at 240 points)
    const actualWorkHours = (attendance.checkOut.getTime() - attendance.checkIn.getTime()) / (1000 * 60 * 60);
    const mobileActivityHours = Math.min(actualWorkHours, this.MAX_MOBILE_ACTIVITY_SCORE / this.MOBILE_ACTIVITY_RATE);
    const mobileActivityScore = Math.round(mobileActivityHours * this.MOBILE_ACTIVITY_RATE);

    // Create calculation details
    const calculationDetails = this.createCalculationDetails({
      employeeCode: attendance.employeeCode,
      shiftName: shift?.name || 'No Shift',
      checkIn: attendance.checkIn,
      checkOut: attendance.checkOut,
      shiftEndTime,
      hoursOvertime,
      scoreDeduction,
      mobileActivityScore,
      punchOutType,
      actualWorkHours
    });

    return {
      scoreDeduction,
      mobileActivityScore,
      hoursOvertime,
      shiftEndTime,
      calculationDetails
    };
  }

  /**
   * Apply score deduction for non-conventional punch-out
   */
  async applyScoreDeduction(
    employeeCode: string, 
    attendanceId: number, 
    punchOutType: 'system_auto' | 'mobile_self' | 'admin_manual'
  ): Promise<void> {
    
    const calculation = await this.calculateScoreDeduction(attendanceId, punchOutType);
    
    if (calculation.scoreDeduction > 0) {
      // TODO: Integrate with existing scoring system
      // For now, log the score deduction
      console.log(`[ScoreCalculation] Employee ${employeeCode}: Score deduction ${calculation.scoreDeduction} points for ${punchOutType} punch-out`);
      console.log(`[ScoreCalculation] Details: ${calculation.calculationDetails}`);
      
      // Update attendance record with score information
      await db
        .update(attendanceRecords)
        .set({
          notes: sql`COALESCE(${attendanceRecords.notes}, '') || ${'\n' + calculation.calculationDetails}`,
          updatedAt: new Date()
        })
        .where(eq(attendanceRecords.id, attendanceId));
    }
  }

  /**
   * Batch process score deductions for multiple attendance records
   */
  async batchProcessScoreDeductions(attendanceIds: number[], punchOutType: 'system_auto' | 'mobile_self' | 'admin_manual'): Promise<void> {
    for (const attendanceId of attendanceIds) {
      try {
        const attendanceData = await db
          .select({ employeeCode: attendanceRecords.employeeCode })
          .from(attendanceRecords)
          .where(eq(attendanceRecords.id, attendanceId))
          .limit(1);

        if (attendanceData.length > 0) {
          await this.applyScoreDeduction(attendanceData[0].employeeCode, attendanceId, punchOutType);
        }
      } catch (error) {
        console.error(`[ScoreCalculation] Failed to process score deduction for attendance ${attendanceId}:`, error);
      }
    }
  }

  private calculateShiftDuration(startTime: string, endTime: string): number {
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    
    // Handle overnight shifts
    if (end <= start) {
      end.setDate(end.getDate() + 1);
    }
    
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }

  private calculateShiftEndTime(checkIn: Date, shiftStartTime: string, shiftDurationHours: number): Date {
    const shiftEnd = new Date(checkIn);
    const [hours, minutes] = shiftStartTime.split(':').map(Number);
    shiftEnd.setHours(hours + shiftDurationHours, minutes, 0, 0);
    return shiftEnd;
  }

  private createCalculationDetails(params: {
    employeeCode: string;
    shiftName: string;
    checkIn: Date;
    checkOut: Date;
    shiftEndTime: Date;
    hoursOvertime: number;
    scoreDeduction: number;
    mobileActivityScore: number;
    punchOutType: string;
    actualWorkHours: number;
  }): string {
    const {
      employeeCode,
      shiftName,
      checkIn,
      checkOut,
      shiftEndTime,
      hoursOvertime,
      scoreDeduction,
      mobileActivityScore,
      punchOutType,
      actualWorkHours
    } = params;

    let details = `Score Calculation for Non-Conventional Punch-out:\n`;
    details += `• Employee: ${employeeCode}\n`;
    details += `• Shift: ${shiftName}\n`;
    details += `• Check-in: ${formatInSystemTimezone(checkIn, 'yyyy-MM-dd HH:mm:ss')}\n`;
    details += `• Check-out: ${formatInSystemTimezone(checkOut, 'yyyy-MM-dd HH:mm:ss')}\n`;
    details += `• Shift End: ${formatInSystemTimezone(shiftEndTime, 'yyyy-MM-dd HH:mm:ss')}\n`;
    details += `• Punch-out Type: ${punchOutType.replace('_', ' ')}\n`;
    details += `• Hours Overtime: ${hoursOvertime.toFixed(2)}h\n`;
    details += `• Score Deduction: ${scoreDeduction} points (${this.SCORE_DEDUCTION_PER_HOUR} points per hour)\n`;
    details += `• Mobile Activity Score: ${mobileActivityScore} points (max ${this.MAX_MOBILE_ACTIVITY_SCORE})\n`;
    details += `• Actual Work Hours: ${actualWorkHours.toFixed(2)}h\n`;
    details += `• Policy: Score deduction applies to all non-conventional punch-outs (system auto, mobile self, admin manual)`;

    return details;
  }

  /**
   * Get score calculation summary for reporting
   */
  async getScoreCalculationSummary(dateFrom: string, dateTo: string): Promise<{
    totalDeductions: number;
    totalMobileActivityScore: number;
    systemAutoDeductions: number;
    mobileSelfDeductions: number;
    adminManualDeductions: number;
    affectedEmployees: number;
  }> {
    // TODO: Implement summary calculation from score tracking table
    // For now, return placeholder values
    return {
      totalDeductions: 0,
      totalMobileActivityScore: 0,
      systemAutoDeductions: 0,
      mobileSelfDeductions: 0,
      adminManualDeductions: 0,
      affectedEmployees: 0
    };
  }
}

// Create singleton instance
export const scoreCalculationService = new ScoreCalculationService();