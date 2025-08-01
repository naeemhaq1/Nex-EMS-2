import { db } from '../db';
import { attendanceRecords, attendanceExternal } from '@shared/schema';
import { geofenceClusters, mobilePunchValidation, geofenceViolations } from '@shared/geofenceSchema';
import { eq, and, gte, lte, isNotNull, sql, desc, asc } from 'drizzle-orm';
import { GeolocationAutolearningService } from './geolocationAutolearningService';
import { getCurrentSystemDate, formatInSystemTimezone } from '../config/timezone';

export interface MobilePunchRequest {
  employeeCode: string;
  latitude: number;
  longitude: number;
  punchType: 'checkin' | 'checkout';
  timestamp: Date;
  deviceId?: string;
  accuracy?: number;
}

export interface MobilePunchValidationResult {
  isValid: boolean;
  canPunch: boolean;
  locationType: 'home' | 'office' | 'field_site' | 'unknown';
  distance: number;
  confidence: number;
  violations: string[];
  warnings: string[];
  requiredApproval: boolean;
  validationId: number;
}

class MobilePunchValidationService {
  private static readonly MAX_PUNCH_DISTANCE = 200; // meters
  private static readonly SUSPICIOUS_DISTANCE = 1000; // meters
  private static readonly MIN_CONFIDENCE = 70;
  private static readonly MAX_ACCURACY = 100; // meters GPS accuracy
  
  /**
   * Validate mobile punch request with comprehensive security checks
   */
  async validatePunch(request: MobilePunchRequest): Promise<MobilePunchValidationResult> {
    console.log(`[MobilePunchValidation] Validating ${request.punchType} for employee ${request.employeeCode} at ${request.latitude}, ${request.longitude}`);
    
    const violations: string[] = [];
    const warnings: string[] = [];
    let isValid = true;
    let canPunch = true;
    let requiredApproval = false;
    
    // 1. Basic validation
    if (!request.latitude || !request.longitude) {
      violations.push('GPS coordinates are required');
      isValid = false;
      canPunch = false;
    }
    
    if (request.accuracy && request.accuracy > this.MAX_ACCURACY) {
      warnings.push(`GPS accuracy too low: ${request.accuracy}m (maximum: ${this.MAX_ACCURACY}m)`);
      requiredApproval = true;
    }
    
    // 2. Geolocation validation against learned clusters
    const geolocationResult = await GeolocationAutolearningService.validateLocation(
      request.employeeCode,
      request.latitude,
      request.longitude,
      request.punchType
    );
    
    if (!geolocationResult.isValid) {
      violations.push('Location not recognized - punch from unknown location');
      isValid = false;
      requiredApproval = true;
    }
    
    if (geolocationResult.distance > this.MAX_PUNCH_DISTANCE) {
      violations.push(`Too far from recognized location: ${geolocationResult.distance.toFixed(0)}m`);
      isValid = false;
      canPunch = false;
    }
    
    if (geolocationResult.distance > this.SUSPICIOUS_DISTANCE) {
      violations.push(`Suspicious distance detected: ${geolocationResult.distance.toFixed(0)}m`);
      await this.createGeofenceViolation(request, 'suspicious_distance', geolocationResult.distance);
    }
    
    // 3. Time-based validation
    const timeValidation = await this.validatePunchTiming(request);
    if (!timeValidation.isValid) {
      violations.push(...timeValidation.violations);
      warnings.push(...timeValidation.warnings);
      if (timeValidation.critical) {
        isValid = false;
        canPunch = false;
      }
    }
    
    // 4. Anti-overbilling validation
    const billingValidation = await this.validateAntiBilling(request);
    if (!billingValidation.isValid) {
      violations.push(...billingValidation.violations);
      isValid = false;
      canPunch = false;
    }
    
    // 5. Duplicate punch detection
    const duplicateCheck = await this.checkDuplicatePunch(request);
    if (duplicateCheck.isDuplicate) {
      violations.push('Duplicate punch detected - already punched recently');
      isValid = false;
      canPunch = false;
    }
    
    // Create validation record
    const validationRecord = await this.createValidationRecord(
      request,
      geolocationResult,
      isValid,
      violations,
      warnings
    );
    
    return {
      isValid,
      canPunch,
      locationType: geolocationResult.locationType,
      distance: geolocationResult.distance,
      confidence: geolocationResult.confidence,
      violations,
      warnings,
      requiredApproval,
      validationId: validationRecord.id
    };
  }
  
  /**
   * Validate punch timing constraints
   */
  private async validatePunchTiming(request: MobilePunchRequest): Promise<{
    isValid: boolean;
    violations: string[];
    warnings: string[];
    critical: boolean;
  }> {
    const violations: string[] = [];
    const warnings: string[] = [];
    const now = getCurrentSystemDate();
    const punchTime = new Date(request.timestamp);
    
    // Check if punch time is in the future
    if (punchTime > now) {
      violations.push('Punch time cannot be in the future');
      return { isValid: false, violations, warnings, critical: true };
    }
    
    // Check if punch time is too far in the past (24 hours)
    const timeDiff = now.getTime() - punchTime.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
      violations.push(`Punch time too old: ${hoursDiff.toFixed(1)} hours ago`);
      return { isValid: false, violations, warnings, critical: true };
    }
    
    if (hoursDiff > 2) {
      warnings.push(`Late punch submission: ${hoursDiff.toFixed(1)} hours ago`);
    }
    
    return { isValid: true, violations, warnings, critical: false };
  }
  
  /**
   * Validate anti-overbilling constraints
   */
  private async validateAntiBilling(request: MobilePunchRequest): Promise<{
    isValid: boolean;
    violations: string[];
  }> {
    const violations: string[] = [];
    const today = getCurrentSystemDate();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Check existing punches for today
    const existingPunches = await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeCode, request.employeeCode),
          gte(attendanceRecords.date, today),
          lte(attendanceRecords.date, tomorrow)
        )
      )
      .orderBy(desc(attendanceRecords.checkIn));
    
    if (existingPunches.length > 0) {
      const lastPunch = existingPunches[0];
      
      // Check for checkout after checkin
      if (request.punchType === 'checkout' && lastPunch.checkIn && !lastPunch.checkOut) {
        const checkInTime = new Date(lastPunch.checkIn);
        const checkOutTime = new Date(request.timestamp);
        const hoursWorked = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
        
        // Maximum 12 hours per day
        if (hoursWorked > 12) {
          violations.push(`Maximum 12 hours per day exceeded: ${hoursWorked.toFixed(1)} hours`);
          return { isValid: false, violations };
        }
        
        // Maximum 3 hours overtime
        if (hoursWorked > 11) {
          violations.push(`Maximum 3 hours overtime exceeded: ${(hoursWorked - 8).toFixed(1)} hours overtime`);
          return { isValid: false, violations };
        }
      }
      
      // Check for multiple checkins
      if (request.punchType === 'checkin' && lastPunch.checkIn && !lastPunch.checkOut) {
        violations.push('Cannot punch in - already punched in without punch out');
        return { isValid: false, violations };
      }
    }
    
    return { isValid: true, violations };
  }
  
  /**
   * Check for duplicate punches
   */
  private async checkDuplicatePunch(request: MobilePunchRequest): Promise<{
    isDuplicate: boolean;
    lastPunchTime?: Date;
  }> {
    const fiveMinutesAgo = new Date(request.timestamp.getTime() - 5 * 60 * 1000);
    
    const recentPunches = await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeCode, request.employeeCode),
          gte(attendanceRecords.date, fiveMinutesAgo)
        )
      )
      .limit(1);
    
    if (recentPunches.length > 0) {
      const lastPunch = recentPunches[0];
      const lastPunchTime = request.punchType === 'checkin' ? lastPunch.checkIn : lastPunch.checkOut;
      
      if (lastPunchTime) {
        const timeDiff = request.timestamp.getTime() - new Date(lastPunchTime).getTime();
        if (timeDiff < 5 * 60 * 1000) { // 5 minutes
          return { isDuplicate: true, lastPunchTime: new Date(lastPunchTime) };
        }
      }
    }
    
    return { isDuplicate: false };
  }
  
  /**
   * Create validation record
   */
  private static async createValidationRecord(
    request: MobilePunchRequest,
    geolocationResult: any,
    isValid: boolean,
    violations: string[],
    warnings: string[]
  ): Promise<{ id: number }> {
    const [record] = await db
      .insert(mobilePunchValidation)
      .values({
        employeeCode: request.employeeCode,
        latitude: request.latitude.toString(),
        longitude: request.longitude.toString(),
        punchType: request.punchType,
        isValid,
        locationType: geolocationResult.locationType,
        distance: geolocationResult.distance?.toString(),
        clusterId: geolocationResult.clusterId,
        confidence: geolocationResult.confidence,
        validationReason: [...violations, ...warnings].join('; '),
        timestamp: request.timestamp
      })
      .returning({ id: mobilePunchValidation.id });
    
    return record;
  }
  
  /**
   * Create geofence violation record
   */
  private static async createGeofenceViolation(
    request: MobilePunchRequest,
    violationType: string,
    distance: number
  ): Promise<void> {
    await db.insert(geofenceViolations).values({
      employeeCode: request.employeeCode,
      latitude: request.latitude.toString(),
      longitude: request.longitude.toString(),
      punchType: request.punchType,
      violationType,
      distance: distance.toString(),
      severity: distance > 2000 ? 'high' : distance > 1000 ? 'medium' : 'low',
      timestamp: request.timestamp
    });
  }
  
  /**
   * Process validated mobile punch
   */
  static async processMobilePunch(
    request: MobilePunchRequest,
    validationResult: MobilePunchValidationResult
  ): Promise<{ success: boolean; attendanceRecordId?: number; message: string }> {
    if (!validationResult.canPunch) {
      return {
        success: false,
        message: `Mobile punch rejected: ${validationResult.violations.join(', ')}`
      };
    }
    
    try {
      // Update the geolocation autolearning with new punch
      await GeolocationAutolearningService.updateClustersWithNewPunch(
        request.employeeCode,
        request.latitude,
        request.longitude,
        request.timestamp,
        request.punchType
      );
      
      // Create or update attendance record
      const attendanceRecord = await this.createAttendanceRecord(request);
      
      return {
        success: true,
        attendanceRecordId: attendanceRecord.id,
        message: `Mobile ${request.punchType} successful at ${validationResult.locationType}`
      };
    } catch (error) {
      console.error('[MobilePunchValidation] Error processing mobile punch:', error);
      return {
        success: false,
        message: 'Failed to process mobile punch - please try again'
      };
    }
  }
  
  /**
   * Create attendance record for mobile punch
   */
  private static async createAttendanceRecord(request: MobilePunchRequest): Promise<{ id: number }> {
    const today = new Date(request.timestamp);
    today.setHours(0, 0, 0, 0);
    
    // Check if record exists for today
    const existingRecord = await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeCode, request.employeeCode),
          eq(attendanceRecords.date, today)
        )
      )
      .limit(1);
    
    if (existingRecord.length > 0) {
      // Update existing record
      const updateData = request.punchType === 'checkin' 
        ? { 
            checkIn: request.timestamp,
            latitude: request.latitude.toString(),
            longitude: request.longitude.toString(),
            punchSource: 'mobile' as const
          }
        : { 
            checkOut: request.timestamp,
            punchSource: 'mobile' as const
          };
      
      await db
        .update(attendanceRecords)
        .set(updateData)
        .where(eq(attendanceRecords.id, existingRecord[0].id));
      
      return { id: existingRecord[0].id };
    } else {
      // Create new record
      const [newRecord] = await db
        .insert(attendanceRecords)
        .values({
          employeeCode: request.employeeCode,
          date: today,
          checkIn: request.punchType === 'checkin' ? request.timestamp : null,
          checkOut: request.punchType === 'checkout' ? request.timestamp : null,
          latitude: request.latitude.toString(),
          longitude: request.longitude.toString(),
          punchSource: 'mobile',
          status: 'active'
        })
        .returning({ id: attendanceRecords.id });
      
      return newRecord;
    }
  }
  
  /**
   * Get validation statistics
   */
  static async getValidationStats(employeeCode?: string): Promise<{
    totalValidations: number;
    successRate: number;
    violationsByType: Record<string, number>;
    avgDistance: number;
    avgConfidence: number;
  }> {
    // Placeholder implementation
    return {
      totalValidations: 0,
      successRate: 0,
      violationsByType: {},
      avgDistance: 0,
      avgConfidence: 0
    };
  }
}

// Export singleton instance
export const mobilePunchValidationService = new MobilePunchValidationService();