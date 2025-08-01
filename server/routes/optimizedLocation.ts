import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { optimizedLocationService } from '../services/optimizedLocationService';
import { db } from '../db';

const router = Router();

/**
 * Store raw location data from mobile apps
 * NO Google API calls - just store coordinates
 */
router.post('/location/store', requireAuth, async (req, res) => {
  try {
    const { latitude, longitude, accuracy, timestamp } = req.body;
    const employeeId = req.session?.realName || req.session?.username || 'unknown';

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    await optimizedLocationService.storeRawLocation({
      employeeId,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      accuracy: accuracy || 10,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });

    res.json({
      success: true,
      message: 'Location stored successfully',
      cost: 0 // No API calls = $0 cost
    });

  } catch (error) {
    console.error('[OptimizedLocation API] Error storing location:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Get processed locations for map display
 * Uses cached data instead of making new API calls
 */
router.get('/location/map-data', requireAdmin, async (req, res) => {
  try {
    const { employeeIds, date } = req.query;
    
    if (!employeeIds || !date) {
      return res.status(400).json({
        success: false,
        error: 'employeeIds and date are required'
      });
    }

    const employeeIdArray = Array.isArray(employeeIds) ? employeeIds : [employeeIds];
    const locations = await optimizedLocationService.getLocationsForMap(
      employeeIdArray as string[],
      date as string
    );

    res.json({
      success: true,
      locations,
      count: locations.length,
      apiCost: 0 // Using cached data = $0 cost
    });

  } catch (error) {
    console.error('[OptimizedLocation API] Error getting map data:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Get location statistics
 */
router.get('/location/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await db.execute(`
      SELECT 
        COUNT(*) as total_raw_locations,
        COUNT(DISTINCT employee_id) as unique_employees,
        DATE(MIN(timestamp)) as earliest_date,
        DATE(MAX(timestamp)) as latest_date
      FROM locations_raw
    `);

    const processed = await db.execute(`
      SELECT 
        COUNT(*) as processed_locations,
        COUNT(DISTINCT location_name) as unique_locations
      FROM locations_processed
    `);

    const rawStats = (stats as any).rows[0] || {};
    const processedStats = (processed as any).rows[0] || {};

    res.json({
      success: true,
      stats: {
        raw: rawStats,
        processed: processedStats,
        costSavings: {
          estimatedApiCallsAvoided: parseInt(rawStats.total_raw_locations) || 0,
          estimatedMonthlySavings: Math.round(((parseInt(rawStats.total_raw_locations) || 0) * 5) / 1000)
        }
      }
    });

  } catch (error) {
    console.error('[OptimizedLocation API] Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Manage geofence zones
 */
router.post('/location/geofence', requireAdmin, async (req, res) => {
  try {
    const { name, centerLat, centerLng, radiusMeters, locationType } = req.body;

    if (!name || !centerLat || !centerLng || !radiusMeters) {
      return res.status(400).json({
        success: false,
        error: 'name, centerLat, centerLng, and radiusMeters are required'
      });
    }

    await db.execute(`
      INSERT INTO geofences (name, center_lat, center_lng, radius_meters, location_type, active)
      VALUES (?, ?, ?, ?, ?, true)
    `, [name, centerLat, centerLng, radiusMeters, locationType || 'office']);

    res.json({
      success: true,
      message: 'Geofence zone created successfully'
    });

  } catch (error) {
    console.error('[OptimizedLocation API] Error creating geofence:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Get all geofence zones
 */
router.get('/location/geofences', requireAdmin, async (req, res) => {
  try {
    const zones = await db.execute(`
      SELECT id, name, center_lat, center_lng, radius_meters, location_type, active
      FROM geofences
      ORDER BY name
    `);

    res.json({
      success: true,
      geofences: (zones as any).rows || []
    });

  } catch (error) {
    console.error('[OptimizedLocation API] Error getting geofences:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Force batch processing (admin only)
 */
router.post('/location/process-batch', requireAdmin, async (req, res) => {
  try {
    // Trigger batch processing manually
    optimizedLocationService.emit('processBatch');

    res.json({
      success: true,
      message: 'Batch processing triggered'
    });

  } catch (error) {
    console.error('[OptimizedLocation API] Error triggering batch:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;