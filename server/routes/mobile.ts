// Future mobile app API endpoints for remote punch-outs at job sites
import { Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";

// Schema for mobile punch-out request
const mobilePunchSchema = z.object({
  employeeCode: z.string(),
  punchType: z.enum(['in', 'out']),
  latitude: z.number(),
  longitude: z.number(),
  gpsAccuracy: z.number().optional(),
  jobSiteId: z.string().optional(),
  notes: z.string().optional(),
});

// Future endpoint: POST /api/mobile/punch
export async function mobilePunchOut(req: Request, res: Response) {
  try {
    const data = mobilePunchSchema.parse(req.body);
    
    // Verify employee exists
    const employee = await storage.getEmployeeByCode(data.employeeCode);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Verify GPS coordinates are within valid job site (future geofencing logic)
    const isAtJobSite = await verifyJobSiteLocation(data.latitude, data.longitude, data.jobSiteId);
    if (!isAtJobSite) {
      return res.status(400).json({ error: "Not at authorized job site location" });
    }

    // Create attendance record with GPS data
    const attendance = await storage.createAttendanceRecord({
      employeeId: employee.id,
      employeeCode: data.employeeCode,
      punchTime: new Date(),
      punchType: data.punchType,
      location: 'field', // Mobile punches are field work
      date: new Date(),
      latitude: data.latitude.toString(),
      longitude: data.longitude.toString(),
      gpsAccuracy: data.gpsAccuracy?.toString(),
      punchSource: 'mobile_app',
      jobSiteId: data.jobSiteId,
      notes: data.notes || `Mobile ${data.punchType} at job site`,
    });

    res.json({
      success: true,
      attendance,
      message: `${data.punchType === 'in' ? 'Check in' : 'Check out'} recorded successfully`
    });

  } catch (error) {
    console.error('Mobile punch error:', error);
    res.status(500).json({ error: "Failed to record punch" });
  }
}

// Future function: Verify employee is within job site radius
async function verifyJobSiteLocation(
  latitude: number, 
  longitude: number, 
  jobSiteId?: string
): Promise<boolean> {
  // Future implementation:
  // 1. Get job site coordinates from database
  // 2. Calculate distance using Haversine formula
  // 3. Check if within allowed radius (e.g., 100 meters)
  // 4. Return true if within geofence, false otherwise
  
  // For now, return true (will implement geofencing later)
  return true;
}

// Future endpoint: GET /api/mobile/job-sites
export async function getJobSites(req: Request, res: Response) {
  try {
    // Future implementation: Get active job sites for mobile app
    const jobSites = [
      {
        id: "site-001",
        name: "PSCA SafeCity Project",
        address: "Lahore, Punjab",
        latitude: 31.5497,
        longitude: 74.3436,
        radiusMeters: 100
      }
    ];

    res.json({ jobSites });
  } catch (error) {
    console.error('Get job sites error:', error);
    res.status(500).json({ error: "Failed to get job sites" });
  }
}