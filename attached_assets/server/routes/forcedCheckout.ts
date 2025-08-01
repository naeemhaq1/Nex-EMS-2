import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { forcedCheckoutService } from "../services/forcedCheckoutService";
import { storage } from "../storage";

const router = Router();

// Schema for manual forced checkout request
const manualForcedCheckoutSchema = z.object({
  employeeCode: z.string(),
  reason: z.string().optional(),
  notes: z.string().optional(),
  calculatedHours: z.number().min(0).max(24).optional(),
});

// Schema for mobile checkout request with comprehensive location tracking
const mobileCheckoutRequestSchema = z.object({
  employeeCode: z.string(),
  latitude: z.number().min(-90).max(90), // Valid latitude range
  longitude: z.number().min(-180).max(180), // Valid longitude range
  gpsAccuracy: z.number().min(0).optional(), // GPS accuracy in meters
  altitude: z.number().optional(), // Altitude in meters
  speed: z.number().min(0).optional(), // Speed in m/s
  heading: z.number().min(0).max(360).optional(), // Heading in degrees
  locationName: z.string().optional(), // Reverse geocoded location name
  jobSiteId: z.string().optional(),
  jobSiteName: z.string().optional(),
  requestReason: z.string().min(1, "Reason is required"),
  notes: z.string().optional(),
  deviceInfo: z.object({
    deviceId: z.string().optional(),
    deviceModel: z.string().optional(),
    osVersion: z.string().optional(),
    appVersion: z.string().optional(),
    batteryLevel: z.number().min(0).max(100).optional(),
    networkType: z.string().optional(), // 'wifi', '4g', '5g', etc.
  }).optional(),
  photoUrl: z.string().url().optional(), // Selfie/photo verification
});

// Schema for mobile checkout approval
const mobileCheckoutApprovalSchema = z.object({
  punchoutId: z.number(),
  approved: z.boolean(),
  notes: z.string().optional(),
});

// POST /api/forced-checkout/manual - Admin manually forces checkout
router.post("/manual", requireAuth, async (req, res) => {
  try {
    const data = manualForcedCheckoutSchema.parse(req.body);
    
    // Get employee details
    const employee = await storage.getEmployeeByCode(data.employeeCode);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Find current attendance record (checked in but not out)
    const currentAttendance = await storage.getAttendanceRecords({
      employeeId: employee.id,
      limit: 1
    });

    if (!currentAttendance.records.length) {
      return res.status(400).json({ error: "No active attendance record found" });
    }

    const attendanceRecord = currentAttendance.records[0];
    
    if (attendanceRecord.checkOut) {
      return res.status(400).json({ error: "Employee already checked out" });
    }

    // Process forced checkout
    const result = await forcedCheckoutService.processForcedCheckout({
      employeeCode: data.employeeCode,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      department: employee.department,
      originalCheckIn: attendanceRecord.checkIn!,
      reason: data.reason,
      triggeredBy: 'admin',
      adminUserId: req.user!.id,
      adminUserName: req.user!.username,
      attendanceRecordId: attendanceRecord.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      notes: data.notes,
      punchSource: 'admin_dashboard',
      calculatedHours: data.calculatedHours
    });

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        forcedPunchoutId: result.forcedPunchoutId,
        calculatedHours: result.calculatedHours
      });
    } else {
      res.status(500).json({ error: result.message });
    }

  } catch (error) {
    console.error("Manual forced checkout error:", error);
    res.status(500).json({ error: "Failed to process manual forced checkout" });
  }
});

// POST /api/forced-checkout/mobile-request - Employee requests mobile checkout
router.post("/mobile-request", requireAuth, async (req, res) => {
  try {
    const data = mobileCheckoutRequestSchema.parse(req.body);
    
    // Get employee details
    const employee = await storage.getEmployeeByCode(data.employeeCode);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Verify employee is requesting for themselves (unless admin)
    if (req.user!.role !== 'admin' && req.user!.employeeId !== data.employeeCode) {
      return res.status(403).json({ error: "Can only request checkout for yourself" });
    }

    // Find current attendance record
    const currentAttendance = await storage.getAttendanceRecords({
      employeeId: employee.id,
      limit: 1
    });

    if (!currentAttendance.records.length) {
      return res.status(400).json({ error: "No active attendance record found" });
    }

    const attendanceRecord = currentAttendance.records[0];
    
    if (attendanceRecord.checkOut) {
      return res.status(400).json({ error: "Already checked out" });
    }

    // Process mobile checkout request with comprehensive location data
    const result = await forcedCheckoutService.processForcedCheckout({
      employeeCode: data.employeeCode,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      department: employee.department,
      originalCheckIn: attendanceRecord.checkIn!,
      reason: data.requestReason,
      triggeredBy: 'mobile',
      attendanceRecordId: attendanceRecord.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      notes: data.notes,
      punchSource: 'mobile_app',
      mobileLatitude: data.latitude,
      mobileLongitude: data.longitude,
      mobileGpsAccuracy: data.gpsAccuracy,
      jobSiteId: data.jobSiteId,
      requestReason: data.requestReason,
      approvalStatus: 'pending', // Mobile requests need approval
      // Enhanced location tracking
      locationName: data.locationName,
      jobSiteName: data.jobSiteName,
      deviceInfo: data.deviceInfo,
      photoUrl: data.photoUrl,
      // Additional GPS data for verification
      altitude: data.altitude,
      speed: data.speed,
      heading: data.heading
    });

    if (result.success) {
      res.json({
        success: true,
        message: "Mobile checkout request submitted for approval",
        forcedPunchoutId: result.forcedPunchoutId,
        status: 'pending'
      });
    } else {
      res.status(500).json({ error: result.message });
    }

  } catch (error) {
    console.error("Mobile checkout request error:", error);
    res.status(500).json({ error: "Failed to process mobile checkout request" });
  }
});

// GET /api/forced-checkout/pending-mobile - Get pending mobile checkout requests
router.get("/pending-mobile", requireAuth, async (req, res) => {
  try {
    // Only admins can view pending requests
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const pendingRequests = await forcedCheckoutService.getPendingMobileCheckouts();
    res.json(pendingRequests);

  } catch (error) {
    console.error("Get pending mobile checkouts error:", error);
    res.status(500).json({ error: "Failed to get pending mobile checkout requests" });
  }
});

// POST /api/forced-checkout/approve-mobile - Approve or reject mobile checkout
router.post("/approve-mobile", requireAuth, async (req, res) => {
  try {
    const data = mobileCheckoutApprovalSchema.parse(req.body);
    
    // Only admins can approve/reject
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const result = await forcedCheckoutService.processMobileCheckoutApproval(
      data.punchoutId,
      data.approved,
      req.user!.id,
      req.user!.username,
      data.notes
    );

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        approved: data.approved
      });
    } else {
      res.status(500).json({ error: result.message });
    }

  } catch (error) {
    console.error("Mobile checkout approval error:", error);
    res.status(500).json({ error: "Failed to process mobile checkout approval" });
  }
});

// GET /api/forced-checkout/stats - Get forced checkout statistics
router.get("/stats", requireAuth, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    const stats = await forcedCheckoutService.getForcedCheckoutStats(
      dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo ? new Date(dateTo as string) : undefined
    );

    res.json(stats);

  } catch (error) {
    console.error("Get forced checkout stats error:", error);
    res.status(500).json({ error: "Failed to get forced checkout statistics" });
  }
});

// GET /api/forced-checkout/history - Get forced checkout history
router.get("/history", requireAuth, async (req, res) => {
  try {
    const { employeeId, adminId, dateFrom, dateTo } = req.query;
    
    const history = await storage.getForcedPunchouts({
      employeeId: employeeId ? parseInt(employeeId as string) : undefined,
      adminId: adminId ? parseInt(adminId as string) : undefined,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined
    });

    res.json(history);

  } catch (error) {
    console.error("Get forced checkout history error:", error);
    res.status(500).json({ error: "Failed to get forced checkout history" });
  }
});

export default router;