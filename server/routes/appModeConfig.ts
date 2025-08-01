import { Router } from 'express';
import { storage } from '../storage';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// Validation schema for app mode config
const appModeConfigSchema = z.object({
  currentMode: z.enum(['demo', 'live']),
  isLocked: z.boolean().optional(),
  demoDataEnabled: z.boolean().optional(),
  locationReportingEnabled: z.boolean().optional(),
  networkResumeEnabled: z.boolean().optional(),
  lastUpdatedBy: z.number().optional()
});

// Get current app mode configuration
router.get('/', requireAuth, async (req, res) => {
  try {
    const config = await storage.getAppModeConfig();
    res.json(config || {
      currentMode: 'demo',
      isLocked: false,
      demoDataEnabled: true,
      locationReportingEnabled: true,
      networkResumeEnabled: false,
      lastUpdatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error fetching app mode configuration:', error);
    res.status(500).json({ error: 'Failed to fetch app mode configuration' });
  }
});

// Update app mode configuration (admin only)
router.put('/', requireAdmin, async (req, res) => {
  try {
    const validatedData = appModeConfigSchema.parse(req.body);
    
    // Add current user as lastUpdatedBy
    const updateData = {
      ...validatedData,
      lastUpdatedBy: req.user?.id || null
    };

    const config = await storage.updateAppModeConfig(updateData);
    
    // Log the app mode change
    await storage.createAppModeHistory({
      previousMode: config.currentMode === 'demo' ? 'live' : 'demo',
      newMode: config.currentMode,
      changedBy: req.user?.id || null,
      reason: `App mode changed to ${config.currentMode}`
    });

    res.json(config);
  } catch (error) {
    console.error('Error updating app mode configuration:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update app mode configuration' });
  }
});

// Get app mode history
router.get('/history', requireAdmin, async (req, res) => {
  try {
    const history = await storage.getAppModeHistory();
    res.json(history);
  } catch (error) {
    console.error('Error fetching app mode history:', error);
    res.status(500).json({ error: 'Failed to fetch app mode history' });
  }
});

// Get app mode metrics
router.get('/metrics', requireAdmin, async (req, res) => {
  try {
    const metrics = await storage.getAppModeMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching app mode metrics:', error);
    res.status(500).json({ error: 'Failed to fetch app mode metrics' });
  }
});

// Initialize app mode configuration
router.post('/initialize', requireAdmin, async (req, res) => {
  try {
    const config = await storage.initializeAppModeConfig();
    res.json(config);
  } catch (error) {
    console.error('Error initializing app mode configuration:', error);
    res.status(500).json({ error: 'Failed to initialize app mode configuration' });
  }
});

export default router;