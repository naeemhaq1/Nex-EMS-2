import { Router } from 'express';
import { portConfig } from '../config/portConfig';

const router = Router();

// Get current port configuration
router.get('/config', (req, res) => {
  res.json({
    success: true,
    config: portConfig
  });
});

// Get port status
router.get('/status', (req, res) => {
  res.json({
    success: true,
    status: {
      mainPort: portConfig.mainPort,
      mode: portConfig.mode,
      host: portConfig.host,
      timestamp: new Date().toISOString()
    }
  });
});

export default router;