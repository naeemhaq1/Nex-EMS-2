import express from 'express';
import { systemAlertsService } from '../services/systemAlertsService.js';
import { requireAuth } from '../middleware/auth.js';
import { z } from 'zod';

const router = express.Router();

// Create alert schema
const createAlertSchema = z.object({
  alertType: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
  title: z.string().min(1),
  message: z.string().min(1),
  source: z.string().min(1),
  metadata: z.any().optional(),
  affectedServices: z.array(z.string()).optional(),
  estimatedImpact: z.enum(['none', 'low', 'medium', 'high', 'critical']).optional(),
  troubleshootingSteps: z.array(z.string()).optional(),
});

// Filter schema
const filterSchema = z.object({
  alertTypes: z.array(z.string()).optional(),
  severityLevels: z.array(z.string()).optional(),
  statuses: z.array(z.string()).optional(),
  sources: z.array(z.string()).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  searchTerm: z.string().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});

// Get all alerts with filtering
router.get('/', requireAuth, async (req, res) => {
  try {
    const validation = filterSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid filter parameters' });
    }

    const filters = validation.data;
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    // Convert date strings to Date objects
    const alertFilter = {
      ...filters,
      dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
      dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
    };

    const alerts = await systemAlertsService.getAlerts(alertFilter, limit, offset);
    res.json(alerts);
  } catch (error) {
    console.error('[SystemAlerts API] Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Get alert statistics
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    const stats = await systemAlertsService.getAlertStats(
      dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo ? new Date(dateTo as string) : undefined
    );
    
    res.json(stats);
  } catch (error) {
    console.error('[SystemAlerts API] Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch alert statistics' });
  }
});

// Get active alerts count
router.get('/count/active', requireAuth, async (req, res) => {
  try {
    const count = await systemAlertsService.getActiveAlertsCount();
    res.json({ count });
  } catch (error) {
    console.error('[SystemAlerts API] Error fetching active alerts count:', error);
    res.status(500).json({ error: 'Failed to fetch active alerts count' });
  }
});

// Get critical alerts
router.get('/critical', requireAuth, async (req, res) => {
  try {
    const alerts = await systemAlertsService.getCriticalAlerts();
    res.json(alerts);
  } catch (error) {
    console.error('[SystemAlerts API] Error fetching critical alerts:', error);
    res.status(500).json({ error: 'Failed to fetch critical alerts' });
  }
});

// Create new alert
router.post('/', requireAuth, async (req, res) => {
  try {
    const validation = createAlertSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid alert data', details: validation.error.issues });
    }

    const alertData = validation.data;
    const userId = req.user?.id;
    
    const alertId = await systemAlertsService.createAlert(alertData, userId);
    res.status(201).json({ success: true, alertId });
  } catch (error) {
    console.error('[SystemAlerts API] Error creating alert:', error);
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

// Acknowledge alert
router.post('/:id/acknowledge', requireAuth, async (req, res) => {
  try {
    const alertId = parseInt(req.params.id);
    const userId = req.user?.id;
    const { notes } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    await systemAlertsService.acknowledgeAlert(alertId, userId, notes);
    res.json({ success: true });
  } catch (error) {
    console.error('[SystemAlerts API] Error acknowledging alert:', error);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

// Resolve alert
router.post('/:id/resolve', requireAuth, async (req, res) => {
  try {
    const alertId = parseInt(req.params.id);
    const userId = req.user?.id;
    const { notes } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!notes) {
      return res.status(400).json({ error: 'Resolution notes are required' });
    }

    await systemAlertsService.resolveAlert(alertId, userId, notes);
    res.json({ success: true });
  } catch (error) {
    console.error('[SystemAlerts API] Error resolving alert:', error);
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

// Get service status
router.get('/service/status', requireAuth, async (req, res) => {
  try {
    const status = systemAlertsService.getStatus();
    res.json(status);
  } catch (error) {
    console.error('[SystemAlerts API] Error fetching service status:', error);
    res.status(500).json({ error: 'Failed to fetch service status' });
  }
});

// Manual trigger for testing
router.post('/test/create', requireAuth, async (req, res) => {
  try {
    const testAlert = {
      alertType: 'system_test',
      severity: 'info' as const,
      title: 'Test Alert',
      message: 'This is a test alert created manually',
      source: 'manual_test',
      metadata: { testId: Date.now() }
    };

    const alertId = await systemAlertsService.createAlert(testAlert, req.user?.id);
    res.json({ success: true, alertId, message: 'Test alert created successfully' });
  } catch (error) {
    console.error('[SystemAlerts API] Error creating test alert:', error);
    res.status(500).json({ error: 'Failed to create test alert' });
  }
});

export default router;