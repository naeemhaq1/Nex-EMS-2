import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";

const router = Router();

// In-memory storage for employee presence data (could be moved to Redis in production)
const employeePresence = new Map<string, {
  employeeId: string;
  employeeCode: string;
  name: string;
  deviceId: string;
  timestamp: number;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  };
}>();

// Cleanup interval to remove old presence data
setInterval(() => {
  const cutoffTime = Date.now() - 5 * 60 * 1000; // 5 minutes
  for (const [key, data] of employeePresence.entries()) {
    if (data.timestamp < cutoffTime) {
      employeePresence.delete(key);
    }
  }
}, 60000); // Clean every minute

/**
 * Broadcast employee presence for proximity detection
 */
router.post('/broadcast', requireAuth, async (req, res) => {
  try {
    const broadcastSchema = z.object({
      employeeId: z.string(),
      employeeCode: z.string(),
      name: z.string(),
      deviceId: z.string(),
      timestamp: z.number(),
      location: z.object({
        latitude: z.number(),
        longitude: z.number(),
        accuracy: z.number(),
        timestamp: z.number()
      }).optional()
    });

    const data = broadcastSchema.parse(req.body);
    
    // Store presence data
    employeePresence.set(data.employeeId, data);
    
    console.log(`🔵 Broadcasting presence for employee: ${data.employeeCode}`);
    
    res.json({ 
      success: true, 
      message: 'Presence broadcasted',
      nearbyCount: employeePresence.size - 1 // Exclude self
    });
    
  } catch (error) {
    console.error('Error broadcasting presence:', error);
    res.status(400).json({ error: 'Invalid broadcast data' });
  }
});

/**
 * Get nearby employees for proximity detection
 */
router.get('/nearby', requireAuth, async (req, res) => {
  try {
    const currentTime = Date.now();
    const recentThreshold = currentTime - 2 * 60 * 1000; // 2 minutes
    
    // Get all recent presence data except current user
    const nearbyEmployees = Array.from(employeePresence.values())
      .filter(emp => 
        emp.timestamp > recentThreshold && 
        emp.employeeId !== req.session.userId
      )
      .map(emp => ({
        employeeId: emp.employeeId,
        employeeCode: emp.employeeCode,
        name: emp.name,
        deviceId: emp.deviceId,
        timestamp: emp.timestamp,
        location: emp.location,
        // Simulate proximity data based on timing
        rssi: -60 - Math.random() * 20, // Simulated signal strength
        distance: Math.random() * 30 + 5 // 5-35 meters
      }));
    
    console.log(`🔍 Found ${nearbyEmployees.length} nearby employees for ${req.session.username}`);
    
    res.json(nearbyEmployees);
    
  } catch (error) {
    console.error('Error getting nearby employees:', error);
    res.status(500).json({ error: 'Failed to get nearby employees' });
  }
});

/**
 * Get proximity statistics
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const currentTime = Date.now();
    const recentThreshold = currentTime - 5 * 60 * 1000; // 5 minutes
    
    const stats = {
      totalActiveEmployees: employeePresence.size,
      recentlyActive: Array.from(employeePresence.values())
        .filter(emp => emp.timestamp > recentThreshold).length,
      withLocation: Array.from(employeePresence.values())
        .filter(emp => emp.location).length,
      lastUpdate: Math.max(...Array.from(employeePresence.values()).map(emp => emp.timestamp))
    };
    
    res.json(stats);
    
  } catch (error) {
    console.error('Error getting proximity stats:', error);
    res.status(500).json({ error: 'Failed to get proximity stats' });
  }
});

export default router;