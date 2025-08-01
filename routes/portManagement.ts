import express from 'express';
import { portManager } from '../services/portManager';

const router = express.Router();

// Get current port configuration with real-time service monitoring
router.get('/config', async (req, res) => {
  try {
    const config = portManager.getCurrentConfig();
    const status = portManager.getServiceStatus();
    
    // Dynamic service monitoring for configured ports
    const dynamicServiceStatus = await portManager.getDynamicServiceStatus();
    
    const portConfigs = [
      {
        id: 'frontend',
        name: 'Frontend Server',
        port: 5000, // Locked at port 5000
        description: 'Main web interface and client application (Port Locked)',
        status: 'running', // Frontend is always running if we can respond
        services: ['Web Interface', 'Static Assets', 'API Gateway'],
        locked: true // Mark as locked/non-configurable - port manager runs here
      },
      {
        id: 'services', 
        name: 'Core Services',
        port: config.services,
        description: 'Attendance processing, monitoring, and core business logic',
        status: status.services?.status || 'stopped',
        services: dynamicServiceStatus.coreServices || ['Attendance Processor', 'Watchdog', 'Process Monitor'],
        uptime: status.services?.startTime ? 
          Math.floor((Date.now() - status.services.startTime.getTime()) / 1000) : 0,
        error: status.services?.error
      },
      {
        id: 'whatsapp',
        name: 'WhatsApp Services', 
        port: config.whatsapp,
        description: 'WhatsApp messaging, chatbot, and communication services',
        status: status.whatsapp?.status || 'stopped',
        services: dynamicServiceStatus.whatsappServices || ['WhatsApp API', 'Chatbot', 'Message Queue'],
        uptime: status.whatsapp?.startTime ? 
          Math.floor((Date.now() - status.whatsapp.startTime.getTime()) / 1000) : 0,
        error: status.whatsapp?.error
      }
    ];
    
    res.json(portConfigs);
  } catch (error: any) {
    console.error('Error getting port configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get port configuration',
      error: error.message
    });
  }
});

// Validate port configuration
router.post('/validate', async (req, res) => {
  try {
    const { frontend, services, whatsapp } = req.body;
    
    if (!frontend || !services || !whatsapp) {
      return res.status(400).json({
        success: false,
        message: 'Missing required ports: frontend, services, whatsapp'
      });
    }

    const validation = await portManager.validatePortConfiguration({
      frontend: parseInt(frontend),
      services: parseInt(services),
      whatsapp: parseInt(whatsapp)
    });

    res.json({
      success: validation.valid,
      validation
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to validate port configuration',
      error: error.message
    });
  }
});

// Apply new port configuration
router.post('/apply', async (req, res) => {
  try {
    const { frontend, services, whatsapp } = req.body;
    
    if (!frontend || !services || !whatsapp) {
      return res.status(400).json({
        success: false,
        message: 'Missing required ports: frontend, services, whatsapp'
      });
    }

    const newConfig = {
      frontend: parseInt(frontend),
      services: parseInt(services),
      whatsapp: parseInt(whatsapp)
    };

    const result = await portManager.applyConfiguration(newConfig);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to apply port configuration',
      error: error.message
    });
  }
});

// Check port availability
router.post('/check-availability', async (req, res) => {
  try {
    const { port } = req.body;
    
    if (!port || isNaN(parseInt(port))) {
      return res.status(400).json({
        success: false,
        message: 'Valid port number required'
      });
    }

    const available = await portManager.checkPortAvailability(parseInt(port));
    
    res.json({
      success: true,
      port: parseInt(port),
      available
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to check port availability',
      error: error.message
    });
  }
});

// Get port availability for multiple ports
router.get('/availability', async (req, res) => {
  try {
    const ports = [5000, 5001, 5002, 5003, 5004, 5005];
    const availability: Record<number, boolean> = {};
    
    await Promise.all(ports.map(async (port) => {
      availability[port] = await portManager.checkPortAvailability(port);
    }));
    
    res.json(availability);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to check port availability',
      error: error.message
    });
  }
});

// Start specific service
router.post('/services/:serviceType/start', async (req, res) => {
  try {
    const { serviceType } = req.params;
    
    if (!['services', 'whatsapp'].includes(serviceType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service type. Must be "services" or "whatsapp"'
      });
    }
    
    const result = await portManager.startServiceType(serviceType as 'services' | 'whatsapp');
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to start service',
      error: error.message
    });
  }
});

// Stop specific service  
router.post('/services/:serviceType/stop', async (req, res) => {
  try {
    const { serviceType } = req.params;
    
    if (!['services', 'whatsapp'].includes(serviceType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service type. Must be "services" or "whatsapp"'
      });
    }
    
    const result = await portManager.stopServiceType(serviceType as 'services' | 'whatsapp');
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to stop service',
      error: error.message
    });
  }
});

// Apply port configuration
router.post('/config', async (req, res) => {
  try {
    const newConfig = req.body;
    const result = await portManager.applyConfiguration(newConfig);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to apply configuration',
      error: error.message
    });
  }
});

// Restart services
router.post('/restart', async (req, res) => {
  try {
    await portManager.restart();
    
    res.json({
      success: true,
      message: 'Services restarted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to restart services',
      error: error.message
    });
  }
});

// Get service health status
router.get('/health', async (req, res) => {
  try {
    const status = portManager.getServiceStatus();
    const config = portManager.getCurrentConfig();
    
    // Test actual connectivity to services
    const serviceChecks = await Promise.allSettled([
      fetch(`http://localhost:${config.services}/api/core/health`).then(r => r.ok),
      fetch(`http://localhost:${config.whatsapp}/api/whatsapp/health`).then(r => r.ok)
    ]);

    res.json({
      success: true,
      health: {
        services: {
          configured: status.services?.status === 'running',
          responsive: serviceChecks[0].status === 'fulfilled' ? serviceChecks[0].value : false,
          port: config.services,
          uptime: status.services?.startTime ? 
            Math.floor((Date.now() - status.services.startTime.getTime()) / 1000) : 0
        },
        whatsapp: {
          configured: status.whatsapp?.status === 'running',
          responsive: serviceChecks[1].status === 'fulfilled' ? serviceChecks[1].value : false,
          port: config.whatsapp,
          uptime: status.whatsapp?.startTime ? 
            Math.floor((Date.now() - status.whatsapp.startTime.getTime()) / 1000) : 0
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to get service health',
      error: error.message
    });
  }
});

export default router;