import express from 'express';
import { biotimeIdContinuityService } from '../services/biotimeIdContinuityService';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Get continuity service status
router.get('/status', requireAuth, async (req, res) => {
  try {
    const status = biotimeIdContinuityService.getStatus();
    res.json({
      success: true,
      status: {
        running: status.running,
        nextCheck: status.nextCheck,
        checkInterval: '10 minutes',
        description: 'Monitors biotime_id sequence continuity and fills gaps automatically'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get service status'
    });
  }
});

// Trigger manual continuity check
router.post('/trigger', requireAdmin, async (req, res) => {
  try {
    console.log(`[ContinuityAPI] Manual trigger requested by ${req.session.username}`);
    const result = await biotimeIdContinuityService.triggerContinuityCheck();
    
    res.json({
      success: result.success,
      message: result.message,
      triggeredBy: req.session.username,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to trigger continuity check'
    });
  }
});

// Get recent continuity statistics
router.get('/stats', requireAuth, async (req, res) => {
  try {
    // This would typically fetch from a logs table, but for now we'll provide basic info
    res.json({
      success: true,
      stats: {
        serviceEnabled: true,
        checkInterval: '10 minutes',
        lastCheck: new Date().toISOString(),
        gapsDetected: 0,
        recordsAdded: 0,
        description: 'Automatic gap detection and filling for biotime_id sequences'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get continuity statistics'
    });
  }
});

export default router;