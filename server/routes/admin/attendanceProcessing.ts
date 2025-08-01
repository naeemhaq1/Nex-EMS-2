import { Router } from 'express';
import { requireAdmin } from '../../middleware/auth';
import { attendanceProcessingService } from '../../services/attendanceProcessingService';

const router = Router();

// Get attendance processing service status
router.get('/processing/status', requireAdmin, async (req, res) => {
  try {
    const stats = await attendanceProcessingService.getProcessingStats();
    res.json(stats);
  } catch (error) {
    console.error('[AttendanceProcessing] Status error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Trigger manual attendance processing
router.post('/processing/trigger', requireAdmin, async (req, res) => {
  try {
    console.log('[AttendanceProcessing] Manual processing triggered by admin');
    const result = await attendanceProcessingService.triggerProcessing();
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.message,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('[AttendanceProcessing] Manual trigger error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});

// Start attendance processing service
router.post('/processing/start', requireAdmin, async (req, res) => {
  try {
    attendanceProcessingService.start();
    res.json({
      success: true,
      message: 'Attendance processing service started',
      status: attendanceProcessingService.getStatus()
    });
  } catch (error) {
    console.error('[AttendanceProcessing] Start error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Stop attendance processing service
router.post('/processing/stop', requireAdmin, async (req, res) => {
  try {
    attendanceProcessingService.stop();
    res.json({
      success: true,
      message: 'Attendance processing service stopped',
      status: attendanceProcessingService.getStatus()
    });
  } catch (error) {
    console.error('[AttendanceProcessing] Stop error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;