import { Router } from 'express';
import { requireAdmin } from '../../middleware/auth';
import { configService } from '../../services/configService';

const router = Router();

// Get all system settings
router.get('/settings', requireAdmin, async (req, res) => {
  try {
    const settings = await configService.getAllSettings();
    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('[Settings] Error getting settings:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get location-specific settings
router.get('/settings/location', requireAdmin, async (req, res) => {
  try {
    const locationSettings = configService.getLocationSettings();
    res.json({
      success: true,
      settings: locationSettings
    });
  } catch (error) {
    console.error('[Settings] Error getting location settings:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Update mobile location polling interval
router.post('/settings/location/polling-interval', requireAdmin, async (req, res) => {
  try {
    const { intervalMs } = req.body;
    
    if (!intervalMs || typeof intervalMs !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Invalid polling interval. Must be a number in milliseconds.'
      });
    }

    await configService.setMobileLocationPollingInterval(intervalMs);
    
    res.json({
      success: true,
      message: 'Mobile location polling interval updated successfully',
      newInterval: {
        milliseconds: intervalMs,
        seconds: Math.round(intervalMs / 1000),
        minutes: Math.round(intervalMs / 60000)
      }
    });
  } catch (error) {
    console.error('[Settings] Error updating polling interval:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Update any system setting
router.post('/settings/:key', requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description, category } = req.body;
    
    if (value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Value is required'
      });
    }

    await configService.setSetting(key, value, description, category);
    
    res.json({
      success: true,
      message: `Setting '${key}' updated successfully`,
      setting: { key, value, description, category }
    });
  } catch (error) {
    console.error(`[Settings] Error updating ${req.params.key}:`, error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get mobile app configuration endpoint (for mobile apps to fetch current settings)
router.get('/settings/mobile/config', async (req, res) => {
  try {
    const mobileConfig = {
      locationPollingInterval: configService.getMobileLocationPollingInterval(),
      locationPollingIntervalSeconds: configService.getMobileLocationPollingIntervalSeconds(),
      locationAccuracyThreshold: configService.getSetting('locationAccuracyThreshold', 50),
      batteryOptimizationEnabled: configService.getSetting('batteryOptimizationEnabled', true),
      maxLocationUpdatesPerHour: configService.getSetting('maxLocationUpdatesPerHour', 60)
    };

    res.json({
      success: true,
      config: mobileConfig,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Settings] Error getting mobile config:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Reload configuration from database
router.post('/settings/reload', requireAdmin, async (req, res) => {
  try {
    await configService.reloadConfig();
    res.json({
      success: true,
      message: 'Configuration reloaded successfully'
    });
  } catch (error) {
    console.error('[Settings] Error reloading config:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;