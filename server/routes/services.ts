import { Router } from 'express';
import { serviceManager } from '../services/serviceManager';

const router = Router();

// Get all services status
router.get('/status', async (req, res) => {
  try {
    const services = serviceManager.getAllServices();
    
    // Format the response with proper date formatting
    const formattedServices = services.map(service => ({
      ...service,
      lastRun: service.lastRun ? service.lastRun.toISOString() : undefined,
      nextRun: service.nextRun ? service.nextRun.toISOString() : undefined
    }));
    
    res.json(formattedServices);
  } catch (error) {
    console.error('Error fetching service status:', error);
    res.status(500).json({ error: 'Failed to fetch service status' });
  }
});

// Get specific service status
router.get('/:serviceName/status', async (req, res) => {
  try {
    const { serviceName } = req.params;
    const service = serviceManager.getServiceStatus(serviceName);
    
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    res.json({
      ...service,
      lastRun: service.lastRun ? service.lastRun.toISOString() : undefined,
      nextRun: service.nextRun ? service.nextRun.toISOString() : undefined
    });
  } catch (error) {
    console.error('Error fetching service status:', error);
    res.status(500).json({ error: 'Failed to fetch service status' });
  }
});

// Start a service
router.post('/:serviceName/start', async (req, res) => {
  try {
    const { serviceName } = req.params;
    const success = serviceManager.startService(serviceName);
    
    if (!success) {
      return res.status(400).json({ error: 'Failed to start service' });
    }
    
    res.json({ 
      message: `Service ${serviceName} started successfully`,
      status: 'running'
    });
  } catch (error) {
    console.error('Error starting service:', error);
    res.status(500).json({ error: 'Failed to start service' });
  }
});

// Stop a service
router.post('/:serviceName/stop', async (req, res) => {
  try {
    const { serviceName } = req.params;
    const success = serviceManager.stopService(serviceName);
    
    if (!success) {
      return res.status(400).json({ error: 'Failed to stop service' });
    }
    
    res.json({ 
      message: `Service ${serviceName} stopped successfully`,
      status: 'stopped'
    });
  } catch (error) {
    console.error('Error stopping service:', error);
    res.status(500).json({ error: 'Failed to stop service' });
  }
});

// Restart a service
router.post('/:serviceName/restart', async (req, res) => {
  try {
    const { serviceName } = req.params;
    const success = serviceManager.restartService(serviceName);
    
    if (!success) {
      return res.status(400).json({ error: 'Failed to restart service' });
    }
    
    res.json({ 
      message: `Service ${serviceName} restarted successfully`,
      status: 'running'
    });
  } catch (error) {
    console.error('Error restarting service:', error);
    res.status(500).json({ error: 'Failed to restart service' });
  }
});

// Recalculate metrics for specified days
router.post('/recalculate', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 90;
    
    if (days < 1 || days > 365) {
      return res.status(400).json({ error: 'Days must be between 1 and 365' });
    }
    
    // Start recalculation in background
    serviceManager.recalculateMetrics(days).catch(error => {
      console.error('Background recalculation failed:', error);
    });
    
    res.json({ 
      message: `Recalculation for last ${days} days started`,
      days,
      status: 'started'
    });
  } catch (error) {
    console.error('Error starting recalculation:', error);
    res.status(500).json({ error: 'Failed to start recalculation' });
  }
});

// Get service logs (placeholder for now)
router.get('/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    
    // Mock service logs - in a real implementation, this would fetch from a log store
    const mockLogs = [
      {
        timestamp: new Date().toISOString(),
        service: 'auto-punchout',
        level: 'info',
        message: 'Processed 15 attendance records, 3 employees auto-punched out',
        details: { processed: 15, autoPunchedOut: 3 }
      },
      {
        timestamp: new Date(Date.now() - 300000).toISOString(),
        service: 'lateearly-analysis',
        level: 'info',
        message: 'Analyzed 225 attendance records for timing patterns',
        details: { analyzed: 225, lateDetected: 12, earlyDetected: 8 }
      },
      {
        timestamp: new Date(Date.now() - 600000).toISOString(),
        service: 'data-backup',
        level: 'info',
        message: 'Daily backup completed successfully (45.2MB)',
        details: { size: '45.2MB', duration: '2.3s' }
      }
    ];
    
    res.json(mockLogs.slice(0, limit));
  } catch (error) {
    console.error('Error fetching service logs:', error);
    res.status(500).json({ error: 'Failed to fetch service logs' });
  }
});

export default router;