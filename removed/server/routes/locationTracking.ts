import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { locationTrackingService, LocationData } from "../services/locationTrackingService";
import { db } from "../db";
import { empLoc, employeeRecords } from "@shared/schema";
import { eq, and, gt, desc } from "drizzle-orm";
import { getCurrentSystemDate } from "../config/timezone";

const router = Router();

// Schema for location data submission
const locationDataSchema = z.object({
  employeeCode: z.string().min(1, "Employee code is required"),
  latitude: z.number().min(-90).max(90, "Invalid latitude"),
  longitude: z.number().min(-180).max(180, "Invalid longitude"),
  accuracy: z.number().min(0).optional(),
  altitude: z.number().optional(),
  speed: z.number().min(0).optional(),
  heading: z.number().min(0).max(360).optional(),
  batteryLevel: z.number().min(0).max(100).optional(),
  networkType: z.string().optional(),
  locationName: z.string().optional(),
  isWorkLocation: z.boolean().optional(),
  jobSiteId: z.string().optional(),
  deviceInfo: z.object({
    deviceId: z.string().optional(),
    deviceModel: z.string().optional(),
    osVersion: z.string().optional(),
    appVersion: z.string().optional(),
  }).optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
});

// Schema for bulk location data submission
const bulkLocationDataSchema = z.object({
  locations: z.array(locationDataSchema).min(1, "At least one location is required"),
});

// POST /api/location-tracking/submit - Submit location data
router.post("/submit", requireAuth, async (req, res) => {
  try {
    const data = locationDataSchema.parse(req.body);
    
    // Get employee details
    const employee = await db
      .select()
      .from(employeeRecords)
      .where(eq(employeeRecords.employeeCode, data.employeeCode))
      .limit(1);

    if (employee.length === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Verify employee is submitting for themselves (unless admin)
    if (req.user!.role !== 'admin' && req.user!.employeeId !== data.employeeCode) {
      return res.status(403).json({ error: "Can only submit location data for yourself" });
    }

    // Process location data
    const locationData: LocationData = {
      employeeId: employee[0].id,
      employeeCode: data.employeeCode,
      latitude: data.latitude,
      longitude: data.longitude,
      accuracy: data.accuracy,
      altitude: data.altitude,
      speed: data.speed,
      heading: data.heading,
      batteryLevel: data.batteryLevel,
      networkType: data.networkType,
      locationName: data.locationName,
      isWorkLocation: data.isWorkLocation,
      jobSiteId: data.jobSiteId,
      deviceInfo: data.deviceInfo,
      source: data.source || 'mobile_app',
      notes: data.notes,
    };

    await locationTrackingService.processLocationData(locationData);

    res.json({
      success: true,
      message: "Location data submitted successfully",
      timestamp: getCurrentSystemDate(),
      location: {
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy,
      }
    });

  } catch (error) {
    console.error("Location submission error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Invalid location data", 
        details: error.errors 
      });
    }
    res.status(500).json({ error: "Failed to submit location data" });
  }
});

// POST /api/location-tracking/submit-bulk - Submit multiple location data points
router.post("/submit-bulk", requireAuth, async (req, res) => {
  try {
    const data = bulkLocationDataSchema.parse(req.body);
    const results = [];
    const errors = [];

    for (const locationData of data.locations) {
      try {
        // Get employee details
        const employee = await db
          .select()
          .from(employeeRecords)
          .where(eq(employeeRecords.employeeCode, locationData.employeeCode))
          .limit(1);

        if (employee.length === 0) {
          errors.push({
            employeeCode: locationData.employeeCode,
            error: "Employee not found"
          });
          continue;
        }

        // Verify access
        if (req.user!.role !== 'admin' && req.user!.employeeId !== locationData.employeeCode) {
          errors.push({
            employeeCode: locationData.employeeCode,
            error: "Access denied"
          });
          continue;
        }

        // Process location data
        const processedData: LocationData = {
          employeeId: employee[0].id,
          employeeCode: locationData.employeeCode,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy,
          altitude: locationData.altitude,
          speed: locationData.speed,
          heading: locationData.heading,
          batteryLevel: locationData.batteryLevel,
          networkType: locationData.networkType,
          locationName: locationData.locationName,
          isWorkLocation: locationData.isWorkLocation,
          jobSiteId: locationData.jobSiteId,
          deviceInfo: locationData.deviceInfo,
          source: locationData.source || 'mobile_app',
          notes: locationData.notes,
        };

        await locationTrackingService.processLocationData(processedData);
        results.push({
          employeeCode: locationData.employeeCode,
          status: "success"
        });

      } catch (locationError) {
        errors.push({
          employeeCode: locationData.employeeCode,
          error: locationError instanceof Error ? locationError.message : "Processing failed"
        });
      }
    }

    res.json({
      success: results.length > 0,
      message: `Processed ${results.length} location data points`,
      results,
      errors,
      timestamp: getCurrentSystemDate()
    });

  } catch (error) {
    console.error("Bulk location submission error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Invalid bulk location data", 
        details: error.errors 
      });
    }
    res.status(500).json({ error: "Failed to submit bulk location data" });
  }
});

// GET /api/location-tracking/stats - Get location tracking service statistics
router.get("/stats", requireAuth, async (req, res) => {
  try {
    const stats = locationTrackingService.getStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error("Get location stats error:", error);
    res.status(500).json({ error: "Failed to get location tracking statistics" });
  }
});

// GET /api/location-tracking/employee/:employeeCode - Get location history for employee
router.get("/employee/:employeeCode", requireAuth, async (req, res) => {
  try {
    const employeeCode = req.params.employeeCode;
    const limit = parseInt(req.query.limit as string) || 100;
    const hours = parseInt(req.query.hours as string) || 24;

    // Verify access
    if (req.user!.role !== 'admin' && req.user!.employeeId !== employeeCode) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get location history
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);

    const locations = await db
      .select()
      .from(empLoc)
      .where(
        and(
          eq(empLoc.employeeCode, employeeCode),
          gt(empLoc.timestamp, cutoffTime)
        )
      )
      .orderBy(desc(empLoc.timestamp))
      .limit(limit);

    res.json({
      success: true,
      employeeCode,
      locations: locations.map(loc => ({
        id: loc.id,
        timestamp: loc.timestamp,
        location: {
          latitude: parseFloat(loc.latitude),
          longitude: parseFloat(loc.longitude),
          accuracy: loc.accuracy ? parseFloat(loc.accuracy) : null,
          altitude: loc.altitude ? parseFloat(loc.altitude) : null,
          speed: loc.speed ? parseFloat(loc.speed) : null,
          heading: loc.heading ? parseFloat(loc.heading) : null,
        },
        locationName: loc.locationName,
        isWorkLocation: loc.isWorkLocation,
        jobSiteId: loc.jobSiteId,
        batteryLevel: loc.batteryLevel,
        networkType: loc.networkType,
        source: loc.source,
        status: loc.status,
        deviceInfo: loc.deviceInfo,
        notes: loc.notes,
      }))
    });

  } catch (error) {
    console.error("Get employee location history error:", error);
    res.status(500).json({ error: "Failed to get employee location history" });
  }
});

// GET /api/location-tracking/current - Get current locations of all employees
router.get("/current", requireAuth, async (req, res) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const currentLocations = await locationTrackingService.getCurrentLocations();
    
    res.json({
      success: true,
      locations: currentLocations.map(loc => ({
        employeeCode: loc.employeeCode,
        timestamp: loc.timestamp,
        location: {
          latitude: parseFloat(loc.latitude),
          longitude: parseFloat(loc.longitude),
          accuracy: loc.accuracy ? parseFloat(loc.accuracy) : null,
        },
        locationName: loc.locationName,
        isWorkLocation: loc.isWorkLocation,
        batteryLevel: loc.batteryLevel,
        networkType: loc.networkType,
        status: loc.status,
      }))
    });

  } catch (error) {
    console.error("Get current locations error:", error);
    res.status(500).json({ error: "Failed to get current locations" });
  }
});

// POST /api/location-tracking/service/start - Start location tracking service
router.post("/service/start", requireAuth, async (req, res) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }

    await locationTrackingService.start();
    res.json({
      success: true,
      message: "Location tracking service started"
    });

  } catch (error) {
    console.error("Start location service error:", error);
    res.status(500).json({ error: "Failed to start location tracking service" });
  }
});

// POST /api/location-tracking/service/stop - Stop location tracking service
router.post("/service/stop", requireAuth, async (req, res) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }

    await locationTrackingService.stop();
    res.json({
      success: true,
      message: "Location tracking service stopped"
    });

  } catch (error) {
    console.error("Stop location service error:", error);
    res.status(500).json({ error: "Failed to stop location tracking service" });
  }
});

// POST /api/location-tracking/service/restart - Restart location tracking service
router.post("/service/restart", requireAuth, async (req, res) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }

    await locationTrackingService.restart();
    res.json({
      success: true,
      message: "Location tracking service restarted"
    });

  } catch (error) {
    console.error("Restart location service error:", error);
    res.status(500).json({ error: "Failed to restart location tracking service" });
  }
});

export default router;