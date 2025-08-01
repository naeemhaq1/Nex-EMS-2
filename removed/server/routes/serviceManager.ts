import express from "express";
import { serviceManager } from "../services/serviceManager";

const router = express.Router();

// Get all service statuses
router.get("/status", async (req, res) => {
  try {
    const services = await serviceManager.getServiceStatus();
    res.json(services);
  } catch (error) {
    console.error("Error fetching service status:", error);
    res.status(500).json({ error: "Failed to fetch service status" });
  }
});

// Get system health overview
router.get("/health", async (req, res) => {
  try {
    const health = await serviceManager.getSystemHealth();
    res.json(health);
  } catch (error) {
    console.error("Error fetching system health:", error);
    res.status(500).json({ error: "Failed to fetch system health" });
  }
});

// Get service manager status
router.get("/manager", async (req, res) => {
  try {
    const status = await serviceManager.getManagerStatus();
    res.json(status);
  } catch (error) {
    console.error("Error fetching manager status:", error);
    res.status(500).json({ error: "Failed to fetch manager status" });
  }
});

// Start a service
router.post("/services/:serviceName/start", async (req, res) => {
  try {
    const { serviceName } = req.params;
    await serviceManager.forceStartService(serviceName);
    res.json({ success: true, message: `Service ${serviceName} started successfully` });
  } catch (error) {
    console.error(`Error starting service ${req.params.serviceName}:`, error);
    res.status(500).json({ error: `Failed to start service ${req.params.serviceName}` });
  }
});

// Stop a service
router.post("/services/:serviceName/stop", async (req, res) => {
  try {
    const { serviceName } = req.params;
    await serviceManager.forceStopService(serviceName);
    res.json({ success: true, message: `Service ${serviceName} stopped successfully` });
  } catch (error) {
    console.error(`Error stopping service ${req.params.serviceName}:`, error);
    res.status(500).json({ error: `Failed to stop service ${req.params.serviceName}` });
  }
});

// Restart a service
router.post("/services/:serviceName/restart", async (req, res) => {
  try {
    const { serviceName } = req.params;
    await serviceManager.forceRestartService(serviceName);
    res.json({ success: true, message: `Service ${serviceName} restarted successfully` });
  } catch (error) {
    console.error(`Error restarting service ${req.params.serviceName}:`, error);
    res.status(500).json({ error: `Failed to restart service ${req.params.serviceName}` });
  }
});

// Enable maintenance mode
router.post("/maintenance/enable", async (req, res) => {
  try {
    await serviceManager.enableMaintenanceMode();
    res.json({ success: true, message: "Maintenance mode enabled" });
  } catch (error) {
    console.error("Error enabling maintenance mode:", error);
    res.status(500).json({ error: "Failed to enable maintenance mode" });
  }
});

// Disable maintenance mode
router.post("/maintenance/disable", async (req, res) => {
  try {
    await serviceManager.disableMaintenanceMode();
    res.json({ success: true, message: "Maintenance mode disabled" });
  } catch (error) {
    console.error("Error disabling maintenance mode:", error);
    res.status(500).json({ error: "Failed to disable maintenance mode" });
  }
});

// Set autostart for a service
router.post("/services/:serviceName/autostart", async (req, res) => {
  try {
    const { serviceName } = req.params;
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: "enabled must be a boolean" });
    }
    
    await serviceManager.setAutostart(serviceName, enabled);
    res.json({ success: true, message: `Autostart ${enabled ? 'enabled' : 'disabled'} for service ${serviceName}` });
  } catch (error) {
    console.error(`Error setting autostart for service ${req.params.serviceName}:`, error);
    res.status(500).json({ error: `Failed to set autostart for service ${req.params.serviceName}` });
  }
});

// Set watchdog for a service
router.post("/services/:serviceName/watchdog", async (req, res) => {
  try {
    const { serviceName } = req.params;
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: "enabled must be a boolean" });
    }
    
    await serviceManager.setWatchdogEnabled(serviceName, enabled);
    res.json({ success: true, message: `Watchdog ${enabled ? 'enabled' : 'disabled'} for service ${serviceName}` });
  } catch (error) {
    console.error(`Error setting watchdog for service ${req.params.serviceName}:`, error);
    res.status(500).json({ error: `Failed to set watchdog for service ${req.params.serviceName}` });
  }
});

export { router as serviceManagerRoutes };