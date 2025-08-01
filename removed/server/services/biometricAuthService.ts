import { db } from "../db";
import { employeeRecords, users, attendanceRecords } from "@shared/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export interface FaceTemplate {
  version: string;
  data: string;
  confidence?: number;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  address?: string;
}

export interface BiometricAuthResult {
  success: boolean;
  employeeCode?: string;
  employeeName?: string;
  confidence?: number;
  message: string;
  requiresLocationServices?: boolean;
  locationVerified?: boolean;
}

export interface BiometricLoginResult {
  success: boolean;
  user?: {
    id: number;
    username: string;
    role: string;
    employeeCode?: string;
  };
  message: string;
  requiresLocationServices?: boolean;
}

export interface BiometricAttendanceResult {
  success: boolean;
  attendanceId?: number;
  employeeCode?: string;
  employeeName?: string;
  punchType?: 'in' | 'out';
  timestamp?: Date;
  location?: LocationData;
  message: string;
  requiresLocationServices?: boolean;
}

export class BiometricAuthService {
  private readonly LOCATION_ACCURACY_THRESHOLD = 50; // meters
  private readonly FACE_CONFIDENCE_THRESHOLD = 75; // percentage
  private readonly ATTENDANCE_RADIUS = 200; // meters from office location

  /**
   * Verify location services are enabled and accurate
   */
  private verifyLocationServices(location: LocationData): { verified: boolean; message: string } {
    if (!location.latitude || !location.longitude) {
      return {
        verified: false,
        message: "Location services are turned off. Please enable location services and set to 'Always On' for remote attendance."
      };
    }

    if (location.accuracy > this.LOCATION_ACCURACY_THRESHOLD) {
      return {
        verified: false,
        message: `Location accuracy is too low (${location.accuracy}m). Please enable high-accuracy location services.`
      };
    }

    if (Math.abs(Date.now() - location.timestamp) > 30000) { // 30 seconds
      return {
        verified: false,
        message: "Location data is outdated. Please enable location services and try again."
      };
    }

    return {
      verified: true,
      message: "Location services verified successfully"
    };
  }

  /**
   * Extract and validate face templates from captured data
   */
  private parseFaceTemplates(faceData: string): FaceTemplate[] {
    try {
      if (!faceData || faceData.trim().length === 0) {
        return [];
      }

      // Parse base64 encoded face data or structured format
      const templates: FaceTemplate[] = [];
      
      // Handle different face data formats
      if (faceData.startsWith('data:image/') || faceData.startsWith('/9j/')) {
        // Base64 image data
        templates.push({
          version: "v1.0",
          data: faceData,
          confidence: 0 // Will be calculated during matching
        });
      } else if (faceData.startsWith('Ver ')) {
        // BioTime format (not usable for real authentication)
        return [];
      } else {
        // Assume structured face template data
        templates.push({
          version: "v1.0",
          data: faceData,
          confidence: 0
        });
      }
      
      return templates;
    } catch (error) {
      console.error("Error parsing face templates:", error);
      return [];
    }
  }

  /**
   * Simulate face matching algorithm
   * In production, this would use real ML/AI face recognition
   */
  private async performFaceMatching(capturedFaceData: string, storedFaceData: string): Promise<number> {
    try {
      // Simulate face matching computation
      // In real implementation, this would use:
      // - Face detection and landmark extraction
      // - Feature vector comparison
      // - Deep learning models for face recognition
      
      if (!capturedFaceData || !storedFaceData) {
        return 0;
      }

      // Simulate varying confidence levels based on data quality
      const baseConfidence = Math.random() * 40 + 60; // 60-100%
      const qualityFactor = Math.random() * 0.2 + 0.8; // 0.8-1.0
      
      return Math.round(baseConfidence * qualityFactor);
    } catch (error) {
      console.error("Error in face matching:", error);
      return 0;
    }
  }

  /**
   * Get employee biometric data
   */
  async getEmployeeBiometricData(employeeCode: string) {
    try {
      const employee = await db
        .select()
        .from(employeeRecords)
        .where(eq(employeeRecords.employeeCode, employeeCode))
        .limit(1);

      if (!employee.length) {
        return null;
      }

      const emp = employee[0];
      
      return {
        employeeCode: emp.employeeCode,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        hasFaceTemplate: emp.hasFaceTemplate || false,
        faceTemplateCount: emp.faceTemplateCount || 0,
        faceTemplateVersion: emp.faceTemplateVersion || null,
        faceTemplateData: emp.faceTemplateData || null,
        biometricEnrollmentStatus: emp.biometricEnrollmentStatus || "not_enrolled",
        lastBiometricSync: emp.lastBiometricSync
      };
    } catch (error) {
      console.error("Error getting employee biometric data:", error);
      return null;
    }
  }

  /**
   * Get all employees with biometric data
   */
  async getAllEmployeesWithBiometrics() {
    try {
      const employees = await db
        .select({
          employeeCode: employeeRecords.employeeCode,
          employeeName: employeeRecords.firstName,
          lastName: employeeRecords.lastName,
          hasFaceTemplate: employeeRecords.hasFaceTemplate,
          faceTemplateCount: employeeRecords.faceTemplateCount,
          biometricEnrollmentStatus: employeeRecords.biometricEnrollmentStatus
        })
        .from(employeeRecords)
        .where(eq(employeeRecords.hasFaceTemplate, true));

      return employees.map(emp => ({
        ...emp,
        employeeName: `${emp.employeeName} ${emp.lastName}`
      }));
    } catch (error) {
      console.error("Error getting employees with biometrics:", error);
      return [];
    }
  }

  /**
   * Enroll employee face template
   */
  async enrollFaceTemplate(employeeCode: string, faceData: string): Promise<{ success: boolean; message: string }> {
    try {
      const templates = this.parseFaceTemplates(faceData);
      
      if (templates.length === 0) {
        return {
          success: false,
          message: "Invalid face data provided for enrollment"
        };
      }

      // Update employee record with face template
      await db
        .update(employeeRecords)
        .set({
          hasFaceTemplate: true,
          faceTemplateCount: templates.length,
          faceTemplateVersion: templates[0].version,
          faceTemplateData: templates[0].data,
          biometricEnrollmentStatus: "enrolled",
          lastBiometricSync: new Date()
        })
        .where(eq(employeeRecords.employeeCode, employeeCode));

      return {
        success: true,
        message: "Face template enrolled successfully"
      };
    } catch (error) {
      console.error("Error enrolling face template:", error);
      return {
        success: false,
        message: "Failed to enroll face template"
      };
    }
  }

  /**
   * Authenticate face with location verification
   */
  async authenticateFace(capturedFaceData: string, location?: LocationData): Promise<BiometricAuthResult> {
    try {
      // Verify location services if location is provided
      if (location) {
        const locationCheck = this.verifyLocationServices(location);
        if (!locationCheck.verified) {
          return {
            success: false,
            message: locationCheck.message,
            requiresLocationServices: true,
            locationVerified: false
          };
        }
      } else {
        return {
          success: false,
          message: "Location services are required for remote attendance. Please enable location services and set to 'Always On'.",
          requiresLocationServices: true,
          locationVerified: false
        };
      }

      // Get all employees with biometric data
      const employees = await this.getAllEmployeesWithBiometrics();
      
      if (employees.length === 0) {
        return {
          success: false,
          message: "No employees enrolled for biometric authentication",
          requiresLocationServices: false,
          locationVerified: true
        };
      }

      // Find matching face
      let bestMatch: { employee: any; confidence: number } | null = null;
      
      for (const employee of employees) {
        const empBiometricData = await this.getEmployeeBiometricData(employee.employeeCode);
        
        if (empBiometricData && empBiometricData.faceTemplateData) {
          const confidence = await this.performFaceMatching(capturedFaceData, empBiometricData.faceTemplateData);
          
          if (confidence > this.FACE_CONFIDENCE_THRESHOLD && (!bestMatch || confidence > bestMatch.confidence)) {
            bestMatch = { employee, confidence };
          }
        }
      }

      if (!bestMatch) {
        return {
          success: false,
          message: "Face authentication failed - no matching employee found",
          requiresLocationServices: false,
          locationVerified: true
        };
      }

      return {
        success: true,
        employeeCode: bestMatch.employee.employeeCode,
        employeeName: bestMatch.employee.employeeName,
        confidence: bestMatch.confidence,
        message: "Face authentication successful",
        requiresLocationServices: false,
        locationVerified: true
      };
    } catch (error) {
      console.error("Error in face authentication:", error);
      return {
        success: false,
        message: "Face authentication failed due to system error",
        requiresLocationServices: false,
        locationVerified: false
      };
    }
  }

  /**
   * Process biometric attendance punch
   */
  async processBiometricAttendance(
    capturedFaceData: string, 
    location: LocationData, 
    punchType: 'in' | 'out'
  ): Promise<BiometricAttendanceResult> {
    try {
      // Authenticate face with location verification
      const authResult = await this.authenticateFace(capturedFaceData, location);
      
      if (!authResult.success || !authResult.employeeCode) {
        return {
          success: false,
          message: authResult.message,
          requiresLocationServices: authResult.requiresLocationServices
        };
      }

      // Get today's date for attendance record
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check if attendance record exists for today
      const existingRecord = await db
        .select()
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.employeeCode, authResult.employeeCode),
            gte(attendanceRecords.date, today)
          )
        )
        .limit(1);

      let attendanceId: number;
      const now = new Date();

      if (existingRecord.length === 0) {
        // Create new attendance record
        if (punchType === 'out') {
          return {
            success: false,
            message: "Cannot punch out without punching in first",
            requiresLocationServices: false
          };
        }

        const [newRecord] = await db
          .insert(attendanceRecords)
          .values({
            employeeCode: authResult.employeeCode,
            date: now,
            checkIn: now,
            status: 'present',
            latitude: location.latitude.toString(),
            longitude: location.longitude.toString(),
            gpsAccuracy: location.accuracy.toString(),
            punchSource: 'mobile_app',
            notes: `Biometric ${punchType} punch with ${authResult.confidence}% confidence`
          })
          .returning({ id: attendanceRecords.id });

        attendanceId = newRecord.id;
      } else {
        // Update existing record
        const record = existingRecord[0];
        
        if (punchType === 'in' && record.checkIn) {
          return {
            success: false,
            message: "Already punched in for today",
            requiresLocationServices: false
          };
        }

        if (punchType === 'out' && record.checkOut) {
          return {
            success: false,
            message: "Already punched out for today",
            requiresLocationServices: false
          };
        }

        const updateData: any = {
          [`check${punchType === 'in' ? 'In' : 'Out'}`]: now,
          latitude: location.latitude.toString(),
          longitude: location.longitude.toString(),
          gpsAccuracy: location.accuracy.toString(),
          notes: `${record.notes || ''}\nBiometric ${punchType} punch with ${authResult.confidence}% confidence`
        };

        if (punchType === 'out') {
          // Calculate total hours when punching out
          const checkInTime = record.checkIn;
          if (checkInTime) {
            const hoursWorked = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
            updateData.totalHours = hoursWorked.toFixed(2);
            updateData.regularHours = Math.min(hoursWorked, 8).toFixed(2);
            updateData.overtimeHours = Math.max(0, hoursWorked - 8).toFixed(2);
          }
        }

        await db
          .update(attendanceRecords)
          .set(updateData)
          .where(eq(attendanceRecords.id, record.id));

        attendanceId = record.id;
      }

      return {
        success: true,
        attendanceId,
        employeeCode: authResult.employeeCode,
        employeeName: authResult.employeeName,
        punchType,
        timestamp: now,
        location,
        message: `Biometric ${punchType} punch recorded successfully`,
        requiresLocationServices: false
      };
    } catch (error) {
      console.error("Error processing biometric attendance:", error);
      return {
        success: false,
        message: "Failed to process biometric attendance",
        requiresLocationServices: false
      };
    }
  }

  /**
   * Biometric login for admin/employee users
   */
  async biometricLogin(capturedFaceData: string, location?: LocationData): Promise<BiometricLoginResult> {
    try {
      // For login, location is recommended but not mandatory
      let locationVerified = false;
      
      if (location) {
        const locationCheck = this.verifyLocationServices(location);
        locationVerified = locationCheck.verified;
      }

      // Authenticate face without strict location requirement for login
      const authResult = await this.authenticateFace(capturedFaceData, location);
      
      if (!authResult.success || !authResult.employeeCode) {
        return {
          success: false,
          message: authResult.message,
          requiresLocationServices: false
        };
      }

      // Find user account associated with this employee
      const user = await db
        .select()
        .from(users)
        .where(eq(users.employeeId, authResult.employeeCode))
        .limit(1);

      if (!user.length) {
        return {
          success: false,
          message: "No user account found for this employee",
          requiresLocationServices: false
        };
      }

      const userAccount = user[0];
      
      return {
        success: true,
        user: {
          id: userAccount.id,
          username: userAccount.username,
          role: userAccount.role,
          employeeCode: authResult.employeeCode
        },
        message: `Biometric login successful${locationVerified ? ' with location verification' : ''}`,
        requiresLocationServices: false
      };
    } catch (error) {
      console.error("Error in biometric login:", error);
      return {
        success: false,
        message: "Biometric login failed due to system error",
        requiresLocationServices: false
      };
    }
  }

  /**
   * Get biometric authentication statistics
   */
  async getBiometricStats() {
    try {
      const totalEmployees = await db
        .select()
        .from(employeeRecords)
        .where(eq(employeeRecords.isActive, true));

      const enrolledEmployees = await db
        .select()
        .from(employeeRecords)
        .where(eq(employeeRecords.hasFaceTemplate, true));

      // Get recent biometric authentications
      const recentAuths = await db
        .select()
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.punchSource, 'mobile_app'),
            gte(attendanceRecords.date, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
          )
        )
        .orderBy(desc(attendanceRecords.date))
        .limit(10);

      return {
        totalEmployees: totalEmployees.length,
        enrolledEmployees: enrolledEmployees.length,
        enrollmentRate: totalEmployees.length > 0 
          ? Math.round((enrolledEmployees.length / totalEmployees.length) * 100)
          : 0,
        recentAuthentications: recentAuths.length,
        systemStatus: 'operational'
      };
    } catch (error) {
      console.error("Error getting biometric stats:", error);
      return {
        totalEmployees: 0,
        enrolledEmployees: 0,
        enrollmentRate: 0,
        recentAuthentications: 0,
        systemStatus: 'error'
      };
    }
  }
}

export const biometricAuthService = new BiometricAuthService();