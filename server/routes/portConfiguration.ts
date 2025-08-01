
import express from 'express';
import { portConfig } from '../config/portConfig';
import { portManager } from '../services/portManager';

const router = express.Router();

// Get current port configuration
router.get('/config', (req, res) => {
  try {
    const config = portConfig.getConfig();
    const managerConfig = portManager.getCurrentConfig();
    
    res.json({
      success: true,
      config: {
        ...config,
        displayInfo: portConfig.getDisplayInfo(),
        isActive: true
      },
      managerConfig,
      environmentVars: portConfig.getEnvironmentVars()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to get port configuration',
      error: error.message
    });
  }
});

// Switch to single-port mode
router.post('/single-port', async (req, res) => {
  try {
    const { port = 5000 } = req.body;
    
    // Update central configuration
    portConfig.setSinglePortMode(parseInt(port));
    
    // Sync port manager
    portManager.syncWithCentralConfig();
    
    res.json({
      success: true,
      message: `Switched to single-port mode on port ${port}`,
      config: portConfig.getConfig(),
      displayInfo: portConfig.getDisplayInfo()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to switch to single-port mode',
      error: error.message
    });
  }
});

// Switch to three-tier mode
router.post('/three-tier', async (req, res) => {
  try {
    const { basePort = 5000 } = req.body;
    
    // Update central configuration
    portConfig.setThreeTierMode(parseInt(basePort));
    
    // Sync port manager
    portManager.syncWithCentralConfig();
    
    // Reinitialize port manager for three-tier mode
    await portManager.restart();
    
    res.json({
      success: true,
      message: `Switched to three-tier mode starting at port ${basePort}`,
      config: portConfig.getConfig(),
      displayInfo: portConfig.getDisplayInfo()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to switch to three-tier mode',
      error: error.message
    });
  }
});

// Update specific port configuration
router.post('/update', async (req, res) => {
  try {
    const { frontend, services, whatsapp, mode } = req.body;
    
    const updateConfig: any = {};
    
    if (frontend) updateConfig.frontend = parseInt(frontend);
    if (services) updateConfig.services = parseInt(services);
    if (whatsapp) updateConfig.whatsapp = parseInt(whatsapp);
    if (mode) updateConfig.mode = mode;
    
    // Update central configuration
    portConfig.updateConfig(updateConfig);
    
    // Sync port manager
    portManager.syncWithCentralConfig();
    
    res.json({
      success: true,
      message: 'Port configuration updated successfully',
      config: portConfig.getConfig(),
      displayInfo: portConfig.getDisplayInfo()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update port configuration',
      error: error.message
    });
  }
});

// Get environment variables for external tools
router.get('/environment', (req, res) => {
  try {
    const envVars = portConfig.getEnvironmentVars();
    
    res.json({
      success: true,
      environmentVars: envVars,
      exportCommands: Object.entries(envVars).map(
        ([key, value]) => `export ${key}=${value}`
      )
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to get environment variables',
      error: error.message
    });
  }
});

export default router;
