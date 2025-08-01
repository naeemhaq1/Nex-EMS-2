import { db } from "../db";
import { 
  attendanceRecords, 
  employeeRecords, 
  shifts, 
  disputedAttendanceRecords, 
  shiftBasedCalculations,
  mobileLocationData 
} from "@shared/schema";
import { and, eq, isNull, sql, desc, asc } from "drizzle-orm";
import { formatInSystemTimezone } from "../config/timezone";
import { EventEmitter } from 'events';
import { scoreCalculationService } from './scoreCalculationService';

export class IntelligentAutoPunchoutService extends EventEmitter {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
  private readonly HOURS_THRESHOLD = 12; // 12 hours threshold
  private readonly MISSED_PUNCH_PENALTY = 1; // 1 hour penalty for missing punch
  private readonly HOME_PUNCH_PENALTY = 1; // 1 hour penalty for punching from home

  constructor() {
    super();
  }

  start() {
    console.log("[IntelligentAutoPunchout] 🚀 Starting intelligent auto punch-out service...");
    console.log("[IntelligentAutoPunchout] Configuration: Check every 5min, 12h threshold");
    console.log("[IntelligentAutoPunchout] Logic: Shift-based calculations with mobile location correlation");
    console.log("[IntelligentAutoPunchout] Logic: 1h penalty for missing punch or home punch");
    
    this.intervalId = setInterval(() => {
      this.processIntelligentAutoPunchouts();
    }, this.CHECK_INTERVAL);
    
    // Run initial check
    this.processIntelligentAutoPunchouts();
    
    this.emit('activity', { type: 'service_started', timestamp: new Date() });
    console.log("[IntelligentAutoPunchout] Service started successfully");
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("[IntelligentAutoPunchout] Service stopped");
    }
  }

  async processIntelligentAutoPunchouts() {
    try {
      this.emit('activity', { type: 'processing_start', timestamp: new Date() });
      
      const now = new Date();
      const twelveHoursAgo = new Date(now.getTime() - (this.HOURS_THRESHOLD * 60 * 60 * 1000));

      console.log(`[IntelligentAutoPunchout] Checking for employees with punch-in before ${formatInSystemTimezone(twelveHoursAgo, 'yyyy-MM-dd HH:mm:ss')}`);

      // Find attendance records requiring intelligent processing
      const recordsToProcess = await db
        .select({
          attendance: attendanceRecords,
          employee: employeeRecords,
          shift: shifts
        })
        .from(attendanceRecords)
        .leftJoin(employeeRecords, eq(attendanceRecords.employeeCode, employeeRecords.empCode))
        .leftJoin(shifts, eq(employeeRecords.shiftId, shifts.id))
        .where(
          and(
            isNull(attendanceRecords.checkOut),
            sql`${attendanceRecords.checkIn} <= ${twelveHoursAgo}`,
            sql`${attendanceRecords.status} != 'auto_punchout'`
          )
        )
        .orderBy(attendanceRecords.checkIn);

      if (recordsToProcess.length === 0) {
        console.log("[IntelligentAutoPunchout] No records requiring intelligent auto punch-out");
        this.emit('activity', { type: 'processing_complete', timestamp: new Date(), processedCount: 0 });
        return;
      }

      console.log(`[IntelligentAutoPunchout] Processing ${recordsToProcess.length} records with intelligent calculations`);

      let processedCount = 0;

      for (const record of recordsToProcess) {
        try {
          const calculation = await this.calculateIntelligentHours(record);
          
          // Update attendance record
          await db
            .update(attendanceRecords)
            .set({
              checkOut: calculation.autoCheckOutTime,
              totalHours: calculation.finalPayrollHours,
              status: 'auto_punchout',
              notes: calculation.calculationNotes,
              updatedAt: now
            })
            .where(eq(attendanceRecords.id, record.attendance.id));

          // Apply score deduction for system auto punch-out
          await scoreCalculationService.applyScoreDeduction(
            record.attendance.employeeCode,
            record.attendance.id,
            'system_auto'
          );

          // Create shift-based calculation record
          await db.insert(shiftBasedCalculations).values({
            employeeCode: record.attendance.employeeCode,
            attendanceId: record.attendance.id,
            shiftId: record.shift?.id || null,
            shiftName: record.shift?.name || 'No Shift',
            shiftStartTime: record.shift?.startTime || '09:00',
            shiftEndTime: record.shift?.endTime || '17:00',
            shiftDurationHours: calculation.shiftDurationHours,
            actualCheckIn: record.attendance.checkIn,
            actualCheckOut: calculation.autoCheckOutTime,
            lateArrivalMinutes: calculation.lateArrivalMinutes,
            earlyDepartureMinutes: 0, // Auto punch-out doesn't have early departure
            availableWorkHours: calculation.availableWorkHours,
            actualWorkHours: calculation.actualWorkHours,
            maximumPossibleHours: calculation.maximumPossibleHours,
            missedPunchPenalty: calculation.missedPunchPenalty,
            homePunchPenalty: calculation.homePunchPenalty,
            locationPenalty: calculation.locationPenalty,
            finalPayrollHours: calculation.finalPayrollHours,
            calculationNotes: calculation.calculationNotes,
            calculationDate: sql`CURRENT_DATE`
          });

          // If requires review, create disputed record
          if (calculation.requiresReview) {
            await db.insert(disputedAttendanceRecords).values({
              originalAttendanceId: record.attendance.id,
              employeeCode: record.attendance.employeeCode,
              employeeName: record.employee ? `${record.employee.firstName} ${record.employee.lastName}` : 'Unknown',
              department: record.employee?.department || 'Unknown',
              shiftName: record.shift?.name || 'No Shift',
              originalCheckIn: record.attendance.checkIn,
              originalCheckOut: calculation.autoCheckOutTime,
              originalTotalHours: calculation.finalPayrollHours,
              originalStatus: 'auto_punchout',
              disputeReason: calculation.disputeReason,
              calculatedHours: calculation.actualWorkHours,
              penaltyHours: calculation.totalPenalties,
              hasLocationData: calculation.hasLocationData,
              lastKnownLocation: calculation.lastKnownLocation,
              locationBasedExitTime: calculation.locationBasedExitTime,
              locationConfidence: calculation.locationConfidence,
              managerReview: 'pending',
              disputeDate: sql`CURRENT_DATE`,
              autoCalculated: true,
              requiresReview: true,
              priority: calculation.priority
            });
          }

          processedCount++;
          
          console.log(`[IntelligentAutoPunchout] Employee ${record.attendance.employeeCode}: ${calculation.calculationSummary}`);
          
        } catch (error) {
          console.error(`[IntelligentAutoPunchout] Failed to process record ${record.attendance.id}:`, error);
        }
      }

      console.log(`[IntelligentAutoPunchout] Successfully processed ${processedCount}/${recordsToProcess.length} records`);
      this.emit('activity', { type: 'processing_complete', timestamp: new Date(), processedCount });

    } catch (error) {
      console.error("[IntelligentAutoPunchout] Error during intelligent auto punch-out process:", error);
      this.emit('error', error);
    }
  }

  private async calculateIntelligentHours(record: any) {
    const { attendance, employee, shift } = record;
    
    // Get shift information
    const shiftDurationHours = shift ? this.calculateShiftDuration(shift.startTime, shift.endTime) : 8;
    const shiftStartTime = shift ? shift.startTime : '09:00';
    
    // Calculate late arrival
    const lateArrivalMinutes = this.calculateLateArrival(attendance.checkIn, shiftStartTime);
    
    // Calculate available work hours (shift duration - late arrival)
    const availableWorkHours = Math.max(0, shiftDurationHours - (lateArrivalMinutes / 60));
    
    // Get mobile location data for correlation
    const locationData = await this.getMobileLocationData(attendance.employeeCode, attendance.checkIn);
    
    // Calculate actual work hours and location-based exit time
    const actualWorkHours = this.HOURS_THRESHOLD; // 12 hours worked
    const locationBasedExitTime = locationData.locationBasedExitTime;
    const locationConfidence = locationData.confidence;
    
    // Apply penalties
    let missedPunchPenalty = this.MISSED_PUNCH_PENALTY; // Always 1 hour for missing punch
    let homePunchPenalty = 0;
    let locationPenalty = 0;
    
    // Check for home punch penalty
    if (locationData.isPunchedFromHome) {
      homePunchPenalty = this.HOME_PUNCH_PENALTY;
    }
    
    // Additional location-based penalties
    if (locationData.confidence < 50) {
      locationPenalty = 0.5; // 30 minutes for low confidence location
    }
    
    const totalPenalties = missedPunchPenalty + homePunchPenalty + locationPenalty;
    
    // SCORE DEDUCTION CALCULATION: 2 points per hour from shift end to non-conventional punch-out
    // This applies to ALL non-conventional punch-outs: system auto, mobile self, or admin manual
    const shiftEndTime = this.calculateShiftEndTime(attendance.checkIn, shiftStartTime, shiftDurationHours);
    const hoursOvertime = Math.max(0, (autoCheckOutTime.getTime() - shiftEndTime.getTime()) / (1000 * 60 * 60));
    const scoreDeduction = Math.round(hoursOvertime * 2); // 2 points per hour past shift end
    
    // MOBILE ACTIVITY SCORE CAP: Maximum 240 points (0.33 per hour)
    const maxMobileActivityScore = 240;
    const mobileActivityHours = Math.min(actualWorkHours, maxMobileActivityScore / 0.33);
    const mobileActivityScore = Math.round(mobileActivityHours * 0.33);
    
    // Calculate final payroll hours
    const maximumPossibleHours = Math.min(availableWorkHours, actualWorkHours);
    const finalPayrollHours = Math.max(0, maximumPossibleHours - totalPenalties);
    
    // Auto punch-out time (12 hours after check-in)
    const autoCheckOutTime = new Date(attendance.checkIn.getTime() + (this.HOURS_THRESHOLD * 60 * 60 * 1000));
    
    // Determine if requires manager review
    const requiresReview = totalPenalties > 0 || locationConfidence < 70;
    
    // Create calculation notes
    const calculationNotes = this.createCalculationNotes({
      shiftDurationHours,
      lateArrivalMinutes,
      availableWorkHours,
      actualWorkHours,
      missedPunchPenalty,
      homePunchPenalty,
      locationPenalty,
      finalPayrollHours,
      hasLocationData: locationData.hasLocationData,
      locationConfidence,
      scoreDeduction,
      mobileActivityScore
    });
    
    // Create calculation summary
    const calculationSummary = `Auto punch-out at ${formatInSystemTimezone(autoCheckOutTime, 'HH:mm:ss')} | Late: ${lateArrivalMinutes}m | Available: ${availableWorkHours.toFixed(1)}h | Penalties: ${totalPenalties.toFixed(1)}h | Score: -${scoreDeduction}pts | Final: ${finalPayrollHours.toFixed(1)}h | Review: ${requiresReview ? 'YES' : 'NO'}`;
    
    return {
      shiftDurationHours,
      lateArrivalMinutes,
      availableWorkHours,
      actualWorkHours,
      maximumPossibleHours,
      missedPunchPenalty,
      homePunchPenalty,
      locationPenalty,
      totalPenalties,
      finalPayrollHours,
      autoCheckOutTime,
      requiresReview,
      disputeReason: this.getDisputeReason(totalPenalties, locationData),
      hasLocationData: locationData.hasLocationData,
      lastKnownLocation: locationData.lastKnownLocation,
      locationBasedExitTime,
      locationConfidence,
      priority: this.getPriority(totalPenalties, locationConfidence),
      scoreDeduction,
      mobileActivityScore,
      calculationNotes,
      calculationSummary
    };
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

  private calculateLateArrival(checkIn: Date, shiftStartTime: string): number {
    const shiftStart = new Date(checkIn);
    const [hours, minutes] = shiftStartTime.split(':').map(Number);
    shiftStart.setHours(hours, minutes, 0, 0);
    
    if (checkIn <= shiftStart) {
      return 0; // On time or early
    }
    
    return Math.floor((checkIn.getTime() - shiftStart.getTime()) / (1000 * 60));
  }

  private async getMobileLocationData(employeeCode: string, checkInTime: Date) {
    // Get mobile location data for the employee around check-in time
    const locationRecords = await db
      .select()
      .from(mobileLocationData)
      .where(
        and(
          eq(mobileLocationData.employeeCode, employeeCode),
          sql`${mobileLocationData.timestamp} >= ${checkInTime}`,
          sql`${mobileLocationData.timestamp} <= ${new Date(checkInTime.getTime() + (this.HOURS_THRESHOLD * 60 * 60 * 1000))}`
        )
      )
      .orderBy(desc(mobileLocationData.timestamp));

    if (locationRecords.length === 0) {
      return {
        hasLocationData: false,
        isPunchedFromHome: false,
        lastKnownLocation: null,
        locationBasedExitTime: null,
        confidence: 0
      };
    }

    // Analyze location data
    const lastLocation = locationRecords[0];
    const isPunchedFromHome = this.isLocationHome(lastLocation);
    const locationBasedExitTime = this.estimateExitTime(locationRecords);
    
    return {
      hasLocationData: true,
      isPunchedFromHome,
      lastKnownLocation: lastLocation.locationName || `${lastLocation.latitude}, ${lastLocation.longitude}`,
      locationBasedExitTime,
      confidence: this.calculateLocationConfidence(locationRecords)
    };
  }

  private isLocationHome(location: any): boolean {
    // Simple heuristic: if location is tagged as home or has low work activity
    return location.activityType === 'home' || 
           location.locationName?.toLowerCase().includes('home') ||
           false; // TODO: Implement geofencing logic
  }

  private estimateExitTime(locationRecords: any[]): Date | null {
    // Find the last office/work location timestamp
    const workLocations = locationRecords.filter(loc => 
      loc.activityType === 'punch_out' || 
      loc.activityType === 'work' ||
      !this.isLocationHome(loc)
    );
    
    return workLocations.length > 0 ? workLocations[0].timestamp : null;
  }

  private calculateLocationConfidence(locationRecords: any[]): number {
    if (locationRecords.length === 0) return 0;
    
    // Calculate confidence based on:
    // - Number of location points
    // - GPS accuracy
    // - Activity type consistency
    
    const avgAccuracy = locationRecords.reduce((sum, loc) => sum + (loc.accuracy || 1000), 0) / locationRecords.length;
    const accuracyScore = Math.max(0, 100 - (avgAccuracy / 10)); // Better accuracy = higher score
    
    const countScore = Math.min(100, locationRecords.length * 10); // More points = higher score
    
    return Math.round((accuracyScore + countScore) / 2);
  }

  private getDisputeReason(totalPenalties: number, locationData: any): string {
    if (totalPenalties === 0) return 'none';
    
    if (locationData.isPunchedFromHome) return 'home_punch';
    if (!locationData.hasLocationData) return 'missing_punchout';
    if (locationData.confidence < 50) return 'location_uncertainty';
    
    return 'missing_punchout';
  }

  private getPriority(totalPenalties: number, locationConfidence: number): string {
    if (totalPenalties >= 2) return 'high';
    if (totalPenalties >= 1 && locationConfidence < 30) return 'high';
    if (totalPenalties >= 1) return 'normal';
    if (locationConfidence < 50) return 'normal';
    
    return 'low';
  }

  private calculateShiftEndTime(checkIn: Date, shiftStartTime: string, shiftDurationHours: number): Date {
    const shiftEnd = new Date(checkIn);
    const [hours, minutes] = shiftStartTime.split(':').map(Number);
    shiftEnd.setHours(hours + shiftDurationHours, minutes, 0, 0);
    return shiftEnd;
  }

  private createCalculationNotes(params: any): string {
    const {
      shiftDurationHours,
      lateArrivalMinutes,
      availableWorkHours,
      actualWorkHours,
      missedPunchPenalty,
      homePunchPenalty,
      locationPenalty,
      finalPayrollHours,
      hasLocationData,
      locationConfidence,
      scoreDeduction,
      mobileActivityScore
    } = params;

    let notes = `Intelligent Auto Punch-out Calculation:\n`;
    notes += `• Shift Duration: ${shiftDurationHours}h\n`;
    notes += `• Late Arrival: ${lateArrivalMinutes} minutes\n`;
    notes += `• Available Work Hours: ${availableWorkHours.toFixed(1)}h (${shiftDurationHours}h - ${(lateArrivalMinutes/60).toFixed(1)}h late)\n`;
    notes += `• Actual Work Hours: ${actualWorkHours}h (12h threshold)\n`;
    notes += `• Penalties Applied:\n`;
    notes += `  - Missing Punch: ${missedPunchPenalty}h\n`;
    notes += `  - Home Punch: ${homePunchPenalty}h\n`;
    notes += `  - Location Uncertainty: ${locationPenalty}h\n`;
    notes += `• Final Payroll Hours: ${finalPayrollHours.toFixed(1)}h\n`;
    notes += `• Mobile Location Data: ${hasLocationData ? `Available (${locationConfidence}% confidence)` : 'Not Available'}\n`;
    notes += `• Score Deduction: ${scoreDeduction} points (2 points per hour from shift end to punch-out)\n`;
    notes += `• Mobile Activity Score: ${mobileActivityScore} points (max 240, 0.33 per hour)\n`;
    notes += `• Non-Conventional Punch-out: Applies to system auto, mobile self, or admin manual punch-outs\n`;
    notes += `• Calculation: min(${availableWorkHours.toFixed(1)}h available, ${actualWorkHours}h actual) - ${(missedPunchPenalty + homePunchPenalty + locationPenalty).toFixed(1)}h penalties = ${finalPayrollHours.toFixed(1)}h`;

    return notes;
  }

  async triggerManualProcess() {
    console.log("[IntelligentAutoPunchout] Manual trigger requested");
    await this.processIntelligentAutoPunchouts();
  }

  getStatus() {
    return {
      isRunning: this.intervalId !== null,
      checkInterval: this.CHECK_INTERVAL,
      hoursThreshold: this.HOURS_THRESHOLD,
      missedPunchPenalty: this.MISSED_PUNCH_PENALTY,
      homePunchPenalty: this.HOME_PUNCH_PENALTY,
      nextCheck: this.intervalId ? new Date(Date.now() + this.CHECK_INTERVAL) : null
    };
  }
}

// Create singleton instance
export const intelligentAutoPunchoutService = new IntelligentAutoPunchoutService();