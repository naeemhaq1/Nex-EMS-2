import { db } from '../db';
import { attendanceRecords, forcedPunchouts, employeeRecords, users } from '../../shared/schema';
import { and, eq, isNull, lt, sql } from 'drizzle-orm';
import { getCurrentSystemDate, formatInSystemTimezone } from '../config/timezone';

export interface ForcedCheckoutRequest {
  employeeCode: string;
  employeeName: string;
  department?: string;
  originalCheckIn: Date;
  reason?: string;
  triggeredBy: 'admin' | 'system' | 'auto' | 'mobile';
  adminUserId?: number;
  adminUserName?: string;
  attendanceRecordId?: number;
  ipAddress?: string;
  userAgent?: string;
  notes?: string;
  // Mobile-specific fields
  punchSource?: 'terminal' | 'mobile_app' | 'admin_dashboard';
  mobileLatitude?: number;
  mobileLongitude?: number;
  mobileGpsAccuracy?: number;
  jobSiteId?: string;
  requestReason?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvedBy?: number;
  calculatedHours?: number;
  // Enhanced location tracking for mobile checkouts
  locationName?: string;
  jobSiteName?: string;
  deviceInfo?: {
    deviceId?: string;
    deviceModel?: string;
    osVersion?: string;
    appVersion?: string;
    batteryLevel?: number;
    networkType?: string;
  };
  photoUrl?: string;
  altitude?: number;
  speed?: number;
  heading?: number;
}

export interface ForcedCheckoutResult {
  success: boolean;
  message: string;
  forcedPunchoutId?: number;
  attendanceRecordId?: number;
  calculatedHours?: number;
  forcedCheckoutTime?: Date;
  error?: string;
}

class ForcedCheckoutService {
  /**
   * Process a forced checkout request - handles automatic, manual, and mobile checkouts
   */
  async processForcedCheckout(request: ForcedCheckoutRequest): Promise<ForcedCheckoutResult> {
    const forcedCheckoutTime = getCurrentSystemDate();
    
    try {
      // Calculate actual hours present
      const actualHoursPresent = this.calculateActualHours(request.originalCheckIn, forcedCheckoutTime);
      
      // Determine payroll hours based on type
      const payrollHours = request.calculatedHours || this.calculatePayrollHours(
        request.triggeredBy, 
        actualHoursPresent
      );

      // Create forced punchout record
      const [forcedPunchout] = await db
        .insert(forcedPunchouts)
        .values({
          employeeCode: request.employeeCode,
          employeeName: request.employeeName,
          department: request.department,
          originalCheckIn: request.originalCheckIn,
          forcedCheckOut: forcedCheckoutTime,
          calculatedHours: payrollHours.toString(),
          actualHoursPresent: actualHoursPresent.toString(),
          reason: request.reason || this.getDefaultReason(request.triggeredBy),
          triggeredBy: request.triggeredBy,
          adminUserId: request.adminUserId,
          adminUserName: request.adminUserName,
          attendanceRecordId: request.attendanceRecordId,
          ipAddress: request.ipAddress,
          userAgent: request.userAgent,
          notes: request.notes,
          status: 'completed',
          // Mobile-specific fields
          punchSource: request.punchSource || 'terminal',
          mobileLatitude: request.mobileLatitude?.toString(),
          mobileLongitude: request.mobileLongitude?.toString(),
          mobileGpsAccuracy: request.mobileGpsAccuracy?.toString(),
          jobSiteId: request.jobSiteId,
          requestReason: request.requestReason,
          approvalStatus: request.approvalStatus || 'approved',
          approvedBy: request.approvedBy,
          approvedAt: request.approvalStatus === 'approved' ? forcedCheckoutTime : null,
        })
        .returning({ id: forcedPunchouts.id });

      // Update attendance record if provided
      if (request.attendanceRecordId) {
        await this.updateAttendanceRecord(
          request.attendanceRecordId,
          forcedCheckoutTime,
          payrollHours,
          request.triggeredBy,
          request.adminUserId
        );
      }

      const message = this.getSuccessMessage(request.triggeredBy, request.employeeName, payrollHours);
      
      console.log(`[ForcedCheckout] ${message}`);

      return {
        success: true,
        message,
        forcedPunchoutId: forcedPunchout.id,
        attendanceRecordId: request.attendanceRecordId,
        calculatedHours: payrollHours,
        forcedCheckoutTime
      };

    } catch (error) {
      console.error(`[ForcedCheckout] Error processing checkout for ${request.employeeCode}:`, error);
      
      return {
        success: false,
        message: `Failed to process forced checkout for ${request.employeeName}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process multiple forced checkouts (batch processing)
   */
  async processBatchForcedCheckouts(requests: ForcedCheckoutRequest[]): Promise<ForcedCheckoutResult[]> {
    const results: ForcedCheckoutResult[] = [];
    
    for (const request of requests) {
      const result = await this.processForcedCheckout(request);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Get pending mobile checkout requests
   */
  async getPendingMobileCheckouts(): Promise<any[]> {
    return await db
      .select()
      .from(forcedPunchouts)
      .where(
        and(
          eq(forcedPunchouts.triggeredBy, 'mobile'),
          eq(forcedPunchouts.approvalStatus, 'pending')
        )
      )
      .orderBy(forcedPunchouts.createdAt);
  }

  /**
   * Approve or reject mobile checkout request
   */
  async processMobileCheckoutApproval(
    punchoutId: number,
    approved: boolean,
    approvedBy: number,
    approverName: string,
    notes?: string
  ): Promise<ForcedCheckoutResult> {
    try {
      const [updatedPunchout] = await db
        .update(forcedPunchouts)
        .set({
          approvalStatus: approved ? 'approved' : 'rejected',
          approvedBy,
          approvedAt: getCurrentPakistanTime(),
          notes: notes || (approved ? 'Mobile checkout approved' : 'Mobile checkout rejected')
        })
        .where(eq(forcedPunchouts.id, punchoutId))
        .returning();

      if (!updatedPunchout) {
        return {
          success: false,
          message: 'Mobile checkout request not found'
        };
      }

      // If approved, update the attendance record
      if (approved && updatedPunchout.attendanceRecordId) {
        await this.updateAttendanceRecord(
          updatedPunchout.attendanceRecordId,
          updatedPunchout.forcedCheckOut,
          parseFloat(updatedPunchout.calculatedHours),
          'mobile',
          approvedBy
        );
      }

      return {
        success: true,
        message: approved 
          ? `Mobile checkout approved for ${updatedPunchout.employeeName}`
          : `Mobile checkout rejected for ${updatedPunchout.employeeName}`,
        forcedPunchoutId: punchoutId
      };

    } catch (error) {
      console.error(`[ForcedCheckout] Error processing mobile approval for ${punchoutId}:`, error);
      
      return {
        success: false,
        message: 'Failed to process mobile checkout approval',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Calculate actual hours worked
   */
  private calculateActualHours(checkIn: Date, checkOut: Date): number {
    const diffMs = checkOut.getTime() - checkIn.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return Math.round(diffHours * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate payroll hours based on checkout type with proper overtime handling
   */
  private calculatePayrollHours(triggeredBy: string, actualHours: number): number {
    const standardHours = 8; // Standard work day
    const maxRegularHours = 12; // Maximum regular hours before overtime penalty
    
    switch (triggeredBy) {
      case 'auto':
      case 'system':
        // For automatic checkouts, use standard 8 hours to avoid overtime penalty
        // This prevents employees from gaming the system by forgetting to punch out
        return standardHours;
        
      case 'admin':
        // Admin checkouts use actual hours worked for accurate payroll
        // If overtime (>8 hours), pay the actual hours worked
        return Math.round(actualHours * 100) / 100;
        
      case 'mobile':
        // Mobile checkouts use actual hours worked (field work may legitimately require overtime)
        // Cap at reasonable maximum to prevent abuse
        return Math.min(actualHours, maxRegularHours);
        
      default:
        // Real terminal punchouts use actual hours worked
        return Math.round(actualHours * 100) / 100;
    }
  }

  /**
   * Get default reason based on checkout type
   */
  private getDefaultReason(triggeredBy: string): string {
    switch (triggeredBy) {
      case 'auto':
      case 'system':
        return 'Automatic system checkout - forgot to punch out';
      case 'admin':
        return 'Administrative override';
      case 'mobile':
        return 'Mobile checkout request';
      default:
        return 'Forced checkout';
    }
  }

  /**
   * Get success message based on checkout type
   */
  private getSuccessMessage(triggeredBy: string, employeeName: string, payrollHours: number): string {
    const hoursText = `${payrollHours}h for payroll`;
    
    switch (triggeredBy) {
      case 'auto':
      case 'system':
        return `Employee ${employeeName}: Auto punch-out at ${formatInSystemTimezone(getCurrentSystemDate(), 'HH:mm:ss')} PKT (${hoursText})`;
      case 'admin':
        return `Employee ${employeeName}: Admin forced checkout (${hoursText})`;
      case 'mobile':
        return `Employee ${employeeName}: Mobile checkout processed (${hoursText})`;
      default:
        return `Employee ${employeeName}: Forced checkout completed (${hoursText})`;
    }
  }

  /**
   * Update attendance record with forced checkout data
   */
  private async updateAttendanceRecord(
    attendanceRecordId: number,
    forcedCheckoutTime: Date,
    payrollHours: number,
    triggeredBy: string,
    adminUserId?: number
  ): Promise<void> {
    const status = triggeredBy === 'auto' || triggeredBy === 'system' 
      ? 'auto_punchout' 
      : 'admin_terminated';

    await db
      .update(attendanceRecords)
      .set({
        checkOut: forcedCheckoutTime,
        totalHours: payrollHours.toString(),
        status,
        payrollHours: payrollHours.toString(),
        forcedCheckoutBy: adminUserId,
        forcedCheckoutAt: forcedCheckoutTime,
        originalCheckoutTime: forcedCheckoutTime,
        notes: `Terminated by ${triggeredBy === 'auto' || triggeredBy === 'system' ? 'System' : 'Admin'} - ${payrollHours}h payroll`,
        updatedAt: getCurrentSystemDate()
      })
      .where(eq(attendanceRecords.id, attendanceRecordId));
  }

  /**
   * Get forced checkout statistics
   */
  async getForcedCheckoutStats(dateFrom?: Date, dateTo?: Date): Promise<any> {
    const conditions = [];
    
    if (dateFrom) {
      conditions.push(sql`${forcedPunchouts.createdAt} >= ${dateFrom}`);
    }
    if (dateTo) {
      conditions.push(sql`${forcedPunchouts.createdAt} <= ${dateTo}`);
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const stats = await db
      .select({
        triggeredBy: forcedPunchouts.triggeredBy,
        count: sql<number>`COUNT(*)`,
        totalHours: sql<number>`SUM(CAST(${forcedPunchouts.calculatedHours} AS NUMERIC))`,
        avgHours: sql<number>`AVG(CAST(${forcedPunchouts.calculatedHours} AS NUMERIC))`
      })
      .from(forcedPunchouts)
      .where(where)
      .groupBy(forcedPunchouts.triggeredBy);

    return stats;
  }
}

export const forcedCheckoutService = new ForcedCheckoutService();