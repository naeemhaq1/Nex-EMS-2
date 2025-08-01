import { Request, Response } from "express";
import { storage } from "../storage";
import { insertAttendancePolicySettingsSchema } from "@shared/schema";
import { z } from "zod";

export async function getAttendancePolicySettings(req: Request, res: Response) {
  try {
    const settings = await storage.getAttendancePolicySettings();
    
    if (!settings) {
      // Return default settings if none exist
      return res.json({
        lateDeductionPerMinute: "10",
        absentDeductionPerDay: "1000",
        halfDayDeduction: "500",
        overtimeRatePerHour: "200",
        overtimeThresholdHours: "8",
        earlyCheckInMinutes: "30",
        lateCheckInGracePeriod: "15",
        minimumHoursForHalfDay: "4",
        minimumHoursForFullDay: "8",
        shiftStartTime: "09:00:00",
        shiftEndTime: "18:00:00",
        weekendDays: ["Saturday", "Sunday"],
        holidays: [],
        absentPenaltyPercentage: "2",
        halfDayPenaltyPercentage: "1",
        isActive: true,
      });
    }
    
    res.json(settings);
  } catch (error) {
    console.error("[API] Error getting attendance policy settings:", error);
    res.status(500).json({ message: "Failed to get attendance policy settings" });
  }
}

export async function createAttendancePolicySettings(req: Request, res: Response) {
  try {
    const validatedData = insertAttendancePolicySettingsSchema.parse(req.body);
    const settings = await storage.createAttendancePolicySettings(validatedData);
    res.json(settings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid settings data", errors: error.errors });
    }
    console.error("[API] Error creating attendance policy settings:", error);
    res.status(500).json({ message: "Failed to create attendance policy settings" });
  }
}

export async function updateAttendancePolicySettings(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid settings ID" });
    }
    
    const validatedData = insertAttendancePolicySettingsSchema.partial().parse(req.body);
    const settings = await storage.updateAttendancePolicySettings(id, validatedData);
    res.json(settings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid settings data", errors: error.errors });
    }
    console.error("[API] Error updating attendance policy settings:", error);
    res.status(500).json({ message: "Failed to update attendance policy settings" });
  }
}