import { Router } from 'express';
import { dailyAttendanceConfirmationService } from '../../services/dailyAttendanceConfirmationService';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

// Get daily confirmation service status
router.get('/status', requireAdmin, async (req, res) => {
    try {
        const status = dailyAttendanceConfirmationService.getStatus();
        res.json({
            success: true,
            status: {
                isRunning: status.isRunning,
                nextConfirmation: status.nextConfirmation,
                scheduledTime: '11:30 PM PKT (daily)',
                emailRecipient: 'naeemhaq1@gmail.com'
            }
        });
    } catch (error) {
        console.error('[DailyConfirmation API] Error getting status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get service status'
        });
    }
});

// Trigger manual daily confirmation
router.post('/trigger', requireAdmin, async (req, res) => {
    try {
        console.log('[DailyConfirmation API] Manual trigger requested by admin');
        
        const metrics = await dailyAttendanceConfirmationService.triggerManualConfirmation();
        
        res.json({
            success: true,
            message: 'Daily confirmation completed successfully',
            metrics: {
                date: metrics.date,
                biotimeSyncRecords: metrics.biotimeSyncRecords,
                attendanceProcessedRecords: metrics.attendanceProcessedRecords,
                unprocessedRecords: metrics.unprocessedRecords,
                processingRate: metrics.processingRate,
                hoursWithoutSync: metrics.hoursWithoutSync,
                hoursWithoutProcessing: metrics.hoursWithoutProcessing,
                isHealthy: metrics.isHealthy,
                issuesCount: metrics.issues.length,
                issues: metrics.issues
            }
        });
    } catch (error) {
        console.error('[DailyConfirmation API] Error triggering confirmation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to trigger daily confirmation',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Start the service
router.post('/start', requireAdmin, async (req, res) => {
    try {
        await dailyAttendanceConfirmationService.start();
        res.json({
            success: true,
            message: 'Daily attendance confirmation service started'
        });
    } catch (error) {
        console.error('[DailyConfirmation API] Error starting service:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start service'
        });
    }
});

// Stop the service
router.post('/stop', requireAdmin, async (req, res) => {
    try {
        await dailyAttendanceConfirmationService.stop();
        res.json({
            success: true,
            message: 'Daily attendance confirmation service stopped'
        });
    } catch (error) {
        console.error('[DailyConfirmation API] Error stopping service:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to stop service'
        });
    }
});

export default router;