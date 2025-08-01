import { Router } from "express";
import { getCurrentTimezone, setSystemTimezone, TimezoneConfig } from "../config/timezone";

const router = Router();

// Available timezone configurations
const AVAILABLE_TIMEZONES: TimezoneConfig[] = [
  {
    timezone: 'Asia/Karachi',
    offset: 5,
    displayName: 'Pakistan Time (PKT)'
  },
  {
    timezone: 'UTC',
    offset: 0,
    displayName: 'Coordinated Universal Time (UTC)'
  },
  {
    timezone: 'Asia/Dubai',
    offset: 4,
    displayName: 'UAE Time (GST)'
  },
  {
    timezone: 'Asia/Kolkata',
    offset: 5.5,
    displayName: 'India Time (IST)'
  },
  {
    timezone: 'America/New_York',
    offset: -5,
    displayName: 'Eastern Time (EST)'
  },
  {
    timezone: 'Europe/London',
    offset: 0,
    displayName: 'Greenwich Mean Time (GMT)'
  }
];

// Get current system timezone
router.get("/", (req, res) => {
  try {
    const currentTimezone = getCurrentTimezone();
    res.json({
      current: currentTimezone,
      available: AVAILABLE_TIMEZONES
    });
  } catch (error) {
    console.error("Error getting timezone:", error);
    res.status(500).json({ error: "Failed to get timezone settings" });
  }
});

// Set system timezone
router.post("/", (req, res) => {
  try {
    const { timezone, offset, displayName } = req.body;
    
    if (!timezone || typeof offset !== 'number' || !displayName) {
      return res.status(400).json({ error: "Invalid timezone configuration" });
    }
    
    const newTimezone: TimezoneConfig = {
      timezone,
      offset,
      displayName
    };
    
    setSystemTimezone(newTimezone);
    
    res.json({ 
      message: "System timezone updated successfully",
      timezone: newTimezone
    });
  } catch (error) {
    console.error("Error setting timezone:", error);
    res.status(500).json({ error: "Failed to set timezone" });
  }
});

export default router;