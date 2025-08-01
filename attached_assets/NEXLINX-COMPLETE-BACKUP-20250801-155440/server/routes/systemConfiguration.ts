import { Router } from 'express';
import { storage } from '../storage';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// Get system configuration
router.get('/', async (req, res) => {
  try {
    const config = await storage.getSystemConfiguration();
    res.json(config || {
      configKey: 'gamification_mode',
      configValue: 'development',
      isActive: true
    });
  } catch (error) {
    console.error('Error fetching system configuration:', error);
    res.status(500).json({ error: 'Failed to fetch system configuration' });
  }
});

// Update system configuration (admin only)
router.put('/', requireAdmin, async (req, res) => {
  try {
    const { configKey, configValue, isActive } = req.body;
    
    if (!configKey || !configValue) {
      return res.status(400).json({ error: 'Config key and value are required' });
    }

    const config = await storage.updateSystemConfiguration({
      configKey,
      configValue,
      isActive: isActive ?? true
    });

    res.json(config);
  } catch (error) {
    console.error('Error updating system configuration:', error);
    res.status(500).json({ error: 'Failed to update system configuration' });
  }
});

// Initialize system configuration
router.post('/initialize', requireAdmin, async (req, res) => {
  try {
    const config = await storage.initializeSystemConfiguration();
    res.json(config);
  } catch (error) {
    console.error('Error initializing system configuration:', error);
    res.status(500).json({ error: 'Failed to initialize system configuration' });
  }
});

export default router;