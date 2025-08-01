import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { storage } from "../storage";
import { db } from "../db";
import { attendanceRecords, attendanceExternal, users } from "@shared/schema";
import { getCurrentSystemDate } from "../config/timezone";
import { eq, and, isNull, desc, gte, lt } from "drizzle-orm";
import { employeeRecords } from "@shared/schema";

// Extended Request interface to include user property
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
    employeeId: string;
  };
}

const router = Router();

// Schema for mobile punch-in/out with location tracking
const mobilePunchSchema = z.object({
  employeeCode: z.string().min(1, "Employee code is required"),
  punchType: z.enum(['in', 'out'], { required_error: "Punch type must be 'in' or 'out'" }),
  latitude: z.number().min(-90).max(90, "Invalid latitude"),
  longitude: z.number().min(-180).max(180, "Invalid longitude"),
  gpsAccuracy: z.number().min(0).optional(),
  altitude: z.number().optional(),
  speed: z.number().min(0).optional(),
  heading: z.number().min(0).max(360).optional(),
  locationName: z.string().optional(),
  jobSiteId: z.string().optional(),
  jobSiteName: z.string().optional(),
  deviceInfo: z.object({
    deviceId: z.string().optional(),
    deviceModel: z.string().optional(),
    osVersion: z.string().optional(),
    appVersion: z.string().optional(),
    batteryLevel: z.number().min(0).max(100).optional(),
    networkType: z.string().optional(),
  }).optional(),
  photoUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

// POST /api/mobile-attendance/punch - Mobile punch-in/out with GPS tracking
router.post("/punch", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = mobilePunchSchema.parse(req.body);
    const currentTime = getCurrentSystemDate();
    
    // Get employee details
    const employee = await storage.getEmployeeByCode(data.employeeCode);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Verify employee is punching for themselves (unless admin)
    if (req.user?.role !== 'admin' && req.user?.employeeId !== data.employeeCode) {
      return res.status(403).json({ error: "Can only punch in/out for yourself" });
    }

    if (data.punchType === 'in') {
      // Handle punch-in
      // Check if already punched in today
      const existingPunchIn = await db
        .select()
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.employeeCode, data.employeeCode),
            isNull(attendanceRecords.checkOut)
          )
        )
        .orderBy(desc(attendanceRecords.checkIn))
        .limit(1);

      if (existingPunchIn.length > 0) {
        return res.status(400).json({ 
          error: "Already punched in", 
          existingPunchIn: existingPunchIn[0].checkIn 
        });
      }

      // Create new attendance record
      const [newRecord] = await db
        .insert(attendanceRecords)
        .values({
          employeeCode: data.employeeCode,
          date: currentTime,
          checkIn: currentTime,
          latitude: data.latitude.toString(),
          longitude: data.longitude.toString(),
          gpsAccuracy: data.gpsAccuracy?.toString(),
          punchSource: 'mobile_app',
          status: 'present',
          notes: data.notes || `Mobile punch-in at ${data.locationName || 'Unknown location'}`
        })
        .returning();

      // Also create external attendance record for tracking
      await db
        .insert(attendanceExternal)
        .values({
          employeeCode: data.employeeCode,
          checkType: 'in',
          timestamp: currentTime,
          latitude: data.latitude,
          longitude: data.longitude,
          accuracy: data.gpsAccuracy ? Math.round(data.gpsAccuracy) : null,
          locationName: data.locationName,
          deviceInfo: data.deviceInfo,
          jobSiteId: data.jobSiteId ? parseInt(data.jobSiteId) : null,
          jobSiteName: data.jobSiteName,
          photoUrl: data.photoUrl,
          status: 'approved', // Mobile punches are auto-approved for now
          syncedToAttendance: true,
          syncedAt: currentTime
        });

      res.json({
        success: true,
        message: "Punch-in successful",
        attendanceRecord: newRecord,
        location: {
          latitude: data.latitude,
          longitude: data.longitude,
          accuracy: data.gpsAccuracy,
          locationName: data.locationName
        }
      });

    } else {
      // Handle punch-out
      // Find active punch-in record
      const activePunchIn = await db
        .select()
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.employeeCode, data.employeeCode),
            isNull(attendanceRecords.checkOut)
          )
        )
        .orderBy(desc(attendanceRecords.checkIn))
        .limit(1);

      if (activePunchIn.length === 0) {
        return res.status(400).json({ error: "No active punch-in found" });
      }

      const punchInRecord = activePunchIn[0];
      
      // Calculate hours worked
      const hoursWorked = (currentTime.getTime() - punchInRecord.checkIn!.getTime()) / (1000 * 60 * 60);
      
      // Update attendance record with punch-out
      const [updatedRecord] = await db
        .update(attendanceRecords)
        .set({
          checkOut: currentTime,
          totalHours: hoursWorked.toFixed(2),
          payrollHours: Math.min(hoursWorked, 12).toFixed(2), // Cap at 12 hours
          status: "present",
          notes: punchInRecord.notes + ` | Mobile punch-out at ${data.locationName || 'Unknown location'}`,
          updatedAt: currentTime
        })
        .where(eq(attendanceRecords.id, punchInRecord.id))
        .returning();

      // Create external attendance record for punch-out
      await db
        .insert(attendanceExternal)
        .values({
          employeeCode: data.employeeCode,
          checkType: 'out',
          timestamp: currentTime,
          latitude: data.latitude,
          longitude: data.longitude,
          accuracy: data.gpsAccuracy ? Math.round(data.gpsAccuracy) : null,
          locationName: data.locationName,
          deviceInfo: data.deviceInfo,
          jobSiteId: data.jobSiteId ? parseInt(data.jobSiteId) : null,
          jobSiteName: data.jobSiteName,
          photoUrl: data.photoUrl,
          status: 'approved',
          syncedToAttendance: true,
          syncedAt: currentTime
        });

      res.json({
        success: true,
        message: "Punch-out successful",
        attendanceRecord: updatedRecord,
        hoursWorked: hoursWorked.toFixed(2),
        location: {
          latitude: data.latitude,
          longitude: data.longitude,
          accuracy: data.gpsAccuracy,
          locationName: data.locationName
        }
      });
    }

  } catch (error) {
    console.error("Mobile punch error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Invalid request data", 
        details: error.errors 
      });
    }
    res.status(500).json({ error: "Failed to process mobile punch" });
  }
});

// GET /api/mobile-attendance/status - Get current punch status
router.get("/status/:employeeCode", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const employeeCode = req.params.employeeCode;
    
    // Verify employee access
    if (req.user?.role !== 'admin' && req.user?.employeeId !== employeeCode) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get current punch status
    const activePunchIn = await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeCode, employeeCode),
          isNull(attendanceRecords.checkOut)
        )
      )
      .orderBy(desc(attendanceRecords.checkIn))
      .limit(1);

    if (activePunchIn.length === 0) {
      return res.json({
        isPunchedIn: false,
        message: "Ready to punch in"
      });
    }

    const punchInRecord = activePunchIn[0];
    const currentTime = getCurrentSystemDate();
    const hoursWorked = (currentTime.getTime() - punchInRecord.checkIn!.getTime()) / (1000 * 60 * 60);

    res.json({
      isPunchedIn: true,
      punchInTime: punchInRecord.checkIn,
      hoursWorked: hoursWorked.toFixed(2),
      location: {
        latitude: punchInRecord.latitude,
        longitude: punchInRecord.longitude,
        accuracy: punchInRecord.gpsAccuracy
      },
      message: `Punched in for ${hoursWorked.toFixed(1)} hours`
    });

  } catch (error) {
    console.error("Get punch status error:", error);
    res.status(500).json({ error: "Failed to get punch status" });
  }
});

// GET /api/mobile-attendance/history - Get mobile attendance history
router.get("/history/:employeeCode", requireAuth, async (req, res) => {
  try {
    const employeeCode = req.params.employeeCode;
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Verify employee access
    if (req.user!.role !== 'admin' && req.user!.employeeId !== employeeCode) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get mobile attendance history
    const history = await db
      .select()
      .from(attendanceExternal)
      .where(eq(attendanceExternal.employeeCode, employeeCode))
      .orderBy(desc(attendanceExternal.timestamp))
      .limit(limit);

    res.json({
      history: history.map(record => ({
        id: record.id,
        checkType: record.checkType,
        timestamp: record.timestamp,
        location: {
          latitude: record.latitude,
          longitude: record.longitude,
          accuracy: record.accuracy,
          locationName: record.locationName
        },
        jobSite: {
          id: record.jobSiteId,
          name: record.jobSiteName
        },
        deviceInfo: record.deviceInfo,
        status: record.status,
        photoUrl: record.photoUrl
      }))
    });

  } catch (error) {
    console.error("Get mobile attendance history error:", error);
    res.status(500).json({ error: "Failed to get attendance history" });
  }
});

// Get current punch status for employee
router.get('/punch-status', requireAuth, async (req: any, res) => {
  try {
    // Get user data from session
    const userId = req.session.usernum || req.session.userId;
    const userRole = req.session.role || 'staff';
    
    // Get user record from database
    let user;
    try {
      [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(userId)))
        .limit(1);
    } catch (dbError) {
      console.error('Database query error:', dbError);
      return res.status(500).json({ error: "Database query failed" });
    }

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let employeeCode = user.employeeId || req.session?.username || 'ADMIN001';
    
    // Admin can check status for any employee
    if (req.query.employeeCode && userRole === 'admin') {
      employeeCode = req.query.employeeCode as string;
    }

    // Find employee record
    let employee;
    try {
      [employee] = await db
        .select()
        .from(employeeRecords)
        .where(eq(employeeRecords.employeeCode, employeeCode))
        .limit(1);
    } catch (empError) {
      console.error('Employee query error:', empError);
      return res.status(500).json({ error: "Employee query failed" });
    }

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Check for active punch-in (no checkout)
    const activePunchIn = await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeCode, employeeCode),
          isNull(attendanceRecords.checkOut)
        )
      )
      .orderBy(desc(attendanceRecords.checkIn))
      .limit(1);

    const isPunchedIn = activePunchIn.length > 0;
    const punchInTime = isPunchedIn ? activePunchIn[0].checkIn : null;

    // Calculate hours worked today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAttendance = await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeCode, employeeCode),
          gte(attendanceRecords.checkIn, today),
          lt(attendanceRecords.checkIn, tomorrow)
        )
      );

    let hoursWorkedToday = 0;
    if (todayAttendance.length > 0) {
      const record = todayAttendance[0];
      if (record.checkIn && record.checkOut) {
        hoursWorkedToday = (new Date(record.checkOut).getTime() - new Date(record.checkIn).getTime()) / (1000 * 60 * 60);
      } else if (record.checkIn && isPunchedIn) {
        hoursWorkedToday = (new Date().getTime() - new Date(record.checkIn).getTime()) / (1000 * 60 * 60);
      }
    }

    res.json({
      isPunchedIn,
      punchInTime,
      hoursWorkedToday: Math.round(hoursWorkedToday * 100) / 100,
      employee: {
        code: employee.employeeCode,
        name: `${employee.firstName} ${employee.lastName}`.trim(),
        department: employee.department
      }
    });

  } catch (error) {
    console.error("Error getting punch status:", error);
    res.status(500).json({ error: "Failed to get punch status" });
  }
});

// Simple punch-in endpoint for desktop
router.post('/punch-in', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const { location, source = 'desktop' } = req.body;
    
    // Use username as employee code for admin user, fallback to ADMIN001 
    const employeeCode = user.username || 'ADMIN001';
    
    const data = {
      employeeCode,
      punchType: 'in' as const,
      latitude: location?.lat || 0,
      longitude: location?.lng || 0,
      gpsAccuracy: location?.accuracy || 0,
      locationName: location?.address || 'Desktop location',
      deviceInfo: {
        deviceModel: 'Desktop',
        appVersion: '1.0.0',
        networkType: 'desktop'
      }
    };

    const currentTime = getCurrentSystemDate();
    
    // Check if already punched in today
    const existingPunchIn = await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeCode, employeeCode),
          isNull(attendanceRecords.checkOut)
        )
      )
      .orderBy(desc(attendanceRecords.checkIn))
      .limit(1);

    if (existingPunchIn.length > 0) {
      return res.status(400).json({ 
        error: "Already punched in", 
        existingPunchIn: existingPunchIn[0].checkIn 
      });
    }

    // Create new attendance record
    const [newRecord] = await db
      .insert(attendanceRecords)
      .values({
        employeeCode: employeeCode,
        date: currentTime,
        checkIn: currentTime,
        latitude: data.latitude.toString(),
        longitude: data.longitude.toString(),
        gpsAccuracy: data.gpsAccuracy?.toString(),
        punchSource: source,
        status: 'present',
        notes: `${source} punch-in at ${data.locationName}`
      })
      .returning();

    res.json({
      success: true,
      message: "Punch-in successful",
      attendanceRecord: newRecord,
      location: {
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.gpsAccuracy,
        locationName: data.locationName
      }
    });

  } catch (error) {
    console.error("Desktop punch-in error:", error);
    res.status(500).json({ error: "Failed to punch in" });
  }
});

// Simple punch-out endpoint for desktop
router.post('/punch-out', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const { location, source = 'desktop' } = req.body;
    
    // Use username as employee code for admin user, fallback to ADMIN001 
    const employeeCode = user.username || 'ADMIN001';
    
    const data = {
      employeeCode,
      punchType: 'out' as const,
      latitude: location?.lat || 0,
      longitude: location?.lng || 0,
      gpsAccuracy: location?.accuracy || 0,
      locationName: location?.address || 'Desktop location',
      deviceInfo: {
        deviceModel: 'Desktop',
        appVersion: '1.0.0',
        networkType: 'desktop'
      }
    };

    const currentTime = getCurrentSystemDate();
    
    // Find active punch-in record
    const [activePunchIn] = await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeCode, employeeCode),
          isNull(attendanceRecords.checkOut)
        )
      )
      .orderBy(desc(attendanceRecords.checkIn))
      .limit(1);

    if (!activePunchIn) {
      return res.status(400).json({ 
        error: "No active punch-in found. Please punch in first." 
      });
    }

    // Calculate hours worked
    const hoursWorked = (currentTime.getTime() - activePunchIn.checkIn!.getTime()) / (1000 * 60 * 60);

    // Update attendance record with punch-out
    const [updatedRecord] = await db
      .update(attendanceRecords)
      .set({
        checkOut: currentTime,
        totalHours: hoursWorked,
        notes: `${activePunchIn.notes || ''} | ${source} punch-out at ${data.locationName}`
      })
      .where(eq(attendanceRecords.id, activePunchIn.id))
      .returning();

    res.json({
      success: true,
      message: "Punch-out successful",
      attendanceRecord: updatedRecord,
      hoursWorked: hoursWorked.toFixed(2),
      location: {
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.gpsAccuracy,
        locationName: data.locationName
      }
    });

  } catch (error) {
    console.error("Desktop punch-out error:", error);
    res.status(500).json({ error: "Failed to punch out" });
  }
});

export default router;