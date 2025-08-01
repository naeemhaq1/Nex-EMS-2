import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { serviceManager } from '../../services/serviceManager';

const router = Router();

interface ServiceDetails {
  name: string;
  status: 'healthy' | 'unhealthy' | 'stopped' | 'error';
  uptime: string;
  lastStarted: string | null;
  lastStopped: string | null;
  description: string;
  type: 'critical' | 'standard' | 'background';
  autostart: boolean;
  watchdogEnabled: boolean;
  restarts: number;
  errorCount: number;
  errors: string[];
  lastHeartbeat: string | null;
  pid: number | null;
  cpu?: number;
  memory?: number;
  startTime?: Date;
}

// Get all services status
router.get('/services', requireAuth, requireAdmin, async (req, res) => {
  try {
    const services = await serviceManager.getAllServicesStatus();
    const enhancedServices: ServiceDetails[] = services.map((service: any) => {
      const uptime = service.startTime ? 
        formatDuration(Date.now() - service.startTime.getTime()) : '0s';
      
      return {
        name: service.name,
        status: service.isRunning ? 
          (service.health === 'healthy' ? 'healthy' : 'unhealthy') : 'stopped',
        uptime,
        lastStarted: service.startTime ? service.startTime.toISOString() : null,
        lastStopped: service.lastStopped ? service.lastStopped.toISOString() : null,
        description: getServiceDescription(service.name),
        type: getCriticalServices().includes(service.name) ? 'critical' : 'standard',
        autostart: service.autostart || false,
        watchdogEnabled: service.watchdogEnabled || false,
        restarts: service.restartCount || 0,
        errorCount: service.errorCount || 0,
        errors: service.errors || [],
        lastHeartbeat: service.lastHeartbeat ? service.lastHeartbeat.toISOString() : null,
        pid: service.pid || null,
        cpu: service.cpu,
        memory: service.memory,
        startTime: service.startTime
      };
    });

    res.json(enhancedServices);
  } catch (error) {
    console.error('[Admin API] Error fetching services:', error);
    res.status(500).json({ error: 'Failed to fetch services status' });
  }
});

// Get specific service details
router.get('/services/:serviceName', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { serviceName } = req.params;
    const serviceStatus = await serviceManager.getServiceStatus(serviceName);
    
    if (!serviceStatus) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const uptime = serviceStatus.startTime ? 
      formatDuration(Date.now() - serviceStatus.startTime.getTime()) : '0s';

    const serviceDetails: ServiceDetails = {
      name: serviceStatus.name,
      status: serviceStatus.isRunning ? 
        (serviceStatus.health === 'healthy' ? 'healthy' : 'unhealthy') : 'stopped',
      uptime,
      lastStarted: serviceStatus.startTime ? serviceStatus.startTime.toISOString() : null,
      lastStopped: serviceStatus.lastStopped ? serviceStatus.lastStopped.toISOString() : null,
      description: getServiceDescription(serviceName),
      type: getCriticalServices().includes(serviceName) ? 'critical' : 'standard',
      autostart: serviceStatus.autostart || false,
      watchdogEnabled: serviceStatus.watchdogEnabled || false,
      restarts: serviceStatus.restartCount || 0,
      errorCount: serviceStatus.errorCount || 0,
      errors: serviceStatus.errors || [],
      lastHeartbeat: serviceStatus.lastHeartbeat ? serviceStatus.lastHeartbeat.toISOString() : null,
      pid: serviceStatus.pid || null,
      cpu: serviceStatus.cpu,
      memory: serviceStatus.memory,
      startTime: serviceStatus.startTime
    };

    res.json(serviceDetails);
  } catch (error) {
    console.error(`[Admin API] Error fetching service ${req.params.serviceName}:`, error);
    res.status(500).json({ error: 'Failed to fetch service details' });
  }
});

// Start service
router.post('/services/:serviceName/start', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { serviceName } = req.params;
    const result = await serviceManager.startService(serviceName);
    
    if (result.success) {
      res.json({ success: true, message: `Service ${serviceName} started successfully` });
    } else {
      res.status(400).json({ error: result.error || `Failed to start service ${serviceName}` });
    }
  } catch (error) {
    console.error(`[Admin API] Error starting service ${req.params.serviceName}:`, error);
    res.status(500).json({ error: 'Failed to start service' });
  }
});

// Stop service
router.post('/services/:serviceName/stop', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { serviceName } = req.params;
    const result = await serviceManager.stopService(serviceName);
    
    if (result.success) {
      res.json({ success: true, message: `Service ${serviceName} stopped successfully` });
    } else {
      res.status(400).json({ error: result.error || `Failed to stop service ${serviceName}` });
    }
  } catch (error) {
    console.error(`[Admin API] Error stopping service ${req.params.serviceName}:`, error);
    res.status(500).json({ error: 'Failed to stop service' });
  }
});

// Restart service
router.post('/services/:serviceName/restart', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { serviceName } = req.params;
    const result = await serviceManager.restartService(serviceName);
    
    if (result.success) {
      res.json({ success: true, message: `Service ${serviceName} restarted successfully` });
    } else {
      res.status(400).json({ error: result.error || `Failed to restart service ${serviceName}` });
    }
  } catch (error) {
    console.error(`[Admin API] Error restarting service ${req.params.serviceName}:`, error);
    res.status(500).json({ error: 'Failed to restart service' });
  }
});

// Toggle autostart for service
router.post('/services/:serviceName/autostart', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { serviceName } = req.params;
    const { enabled } = req.body;
    
    const result = await serviceManager.setAutostart(serviceName, enabled);
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: `Autostart ${enabled ? 'enabled' : 'disabled'} for service ${serviceName}` 
      });
    } else {
      res.status(400).json({ error: result.error || 'Failed to update autostart setting' });
    }
  } catch (error) {
    console.error(`[Admin API] Error updating autostart for ${req.params.serviceName}:`, error);
    res.status(500).json({ error: 'Failed to update autostart setting' });
  }
});

// Toggle watchdog for service
router.post('/services/:serviceName/watchdog', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { serviceName } = req.params;
    const { enabled } = req.body;
    
    const result = await serviceManager.setWatchdog(serviceName, enabled);
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: `Watchdog ${enabled ? 'enabled' : 'disabled'} for service ${serviceName}` 
      });
    } else {
      res.status(400).json({ error: result.error || 'Failed to update watchdog setting' });
    }
  } catch (error) {
    console.error(`[Admin API] Error updating watchdog for ${req.params.serviceName}:`, error);
    res.status(500).json({ error: 'Failed to update watchdog setting' });
  }
});

// Get system overview
router.get('/services/system/overview', requireAuth, requireAdmin, async (req, res) => {
  try {
    const services = await serviceManager.getAllServicesStatus();
    const systemUptime = formatDuration(Date.now() - serviceManager.getStartTime().getTime());
    
    const overview = {
      totalServices: services.length,
      healthyServices: services.filter((s: any) => s.isRunning && s.health === 'healthy').length,
      unhealthyServices: services.filter((s: any) => s.isRunning && s.health !== 'healthy').length,
      stoppedServices: services.filter((s: any) => !s.isRunning).length,
      systemUptime,
      lastUpdated: new Date().toISOString(),
      watchdogEnabled: serviceManager.isWatchdogEnabled(),
      maintenanceMode: serviceManager.isMaintenanceMode()
    };

    res.json(overview);
  } catch (error) {
    console.error('[Admin API] Error fetching system overview:', error);
    res.status(500).json({ error: 'Failed to fetch system overview' });
  }
});

// Clear service errors
router.post('/services/:serviceName/clear-errors', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { serviceName } = req.params;
    const result = await serviceManager.clearServiceErrors(serviceName);
    
    if (result.success) {
      res.json({ success: true, message: `Errors cleared for service ${serviceName}` });
    } else {
      res.status(400).json({ error: result.error || 'Failed to clear errors' });
    }
  } catch (error) {
    console.error(`[Admin API] Error clearing errors for ${req.params.serviceName}:`, error);
    res.status(500).json({ error: 'Failed to clear errors' });
  }
});

// Helper functions
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function getServiceDescription(serviceName: string): string {
  const descriptions: Record<string, string> = {
    'threePollerSystem': 'BioTime data synchronization with three-tier polling system',
    'watchdog': 'System health monitoring and automatic service recovery',
    'processMonitor': 'System resource monitoring and performance tracking',
    'whatsappService': 'WhatsApp Business API integration and messaging',
    'whatsappMonitor': 'WhatsApp service health monitoring and error tracking',
    'whatsappStatusMonitor': 'WhatsApp API connectivity and status monitoring',
    'whatsappChatbot': 'Intelligent WhatsApp chatbot with AI capabilities',
    'whatsappDirectoryService': 'Employee contact directory and phone number management',
    'autoBackupService': 'Automated daily database backups at 00:01 PKT',
    'systemAlerts': 'System-wide alert management and notification dispatch',
    'notificationService': 'Multi-channel notification delivery system'
  };
  
  return descriptions[serviceName] || 'System service';
}

function getCriticalServices(): string[] {
  return [
    'threePollerSystem',
    'watchdog',
    'processMonitor',
    'autoBackupService'
  ];
}

export default router;