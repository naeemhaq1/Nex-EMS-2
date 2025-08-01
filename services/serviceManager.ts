import { EventEmitter } from 'events';
import { watchdogService } from './watchdogService.js';
import { processMonitorService } from './processMonitorService.js';
import { threePollerSystem } from './threePollerSystem.js';
// Old services removed - using enhanced Three-Poller System only
import { WhatsAppService } from './whatsappService.js';
import { WhatsAppMonitorService } from './whatsappMonitorService.js';
// backupService removed during deployment optimization
import { systemAlertsService } from './systemAlertsService.js';
import { notificationService } from './notificationService.js';
import { autoBackupService } from './autoBackupService.js';
import { attendanceProcessingService } from './attendanceProcessingService.js';
import { postProcessingAnalyticsService } from './postProcessingAnalyticsService.js';

interface ServiceStatus {
  name: string;
  isRunning: boolean;
  health: 'healthy' | 'unhealthy' | 'stopped' | 'error';
  lastHeartbeat: Date | null;
  errorCount: number;
  restartCount: number;
  uptime: number;
  autostart?: boolean;
  watchdogEnabled?: boolean;
  startupMethod?: 'dev' | 'admin' | 'watchdog' | 'system' | 'auto' | 'manual';
  lastShutdownReason?: 'admin_stop' | 'admin_restart' | 'watchdog_restart' | 'system_shutdown' | 'error' | 'crash' | 'maintenance' | 'unknown';
  startedBy?: string;
  stoppedBy?: string;
}

interface ServiceManagerConfig {
  enableWatchdog: boolean;
  enableProcessMonitor: boolean;
  enableAutoRestart: boolean;
  maxRestartAttempts: number;
  restartDelay: number;
  healthCheckInterval: number;
  criticalServices: string[];
}

class ServiceManager extends EventEmitter {
  private config: ServiceManagerConfig;
  private services: Map<string, any> = new Map();
  private serviceStatus: Map<string, ServiceStatus> = new Map();
  private isRunning = false;
  private startTime: Date = new Date();
  private maintenanceMode = false;
  private shutdownInProgress = false;

  constructor() {
    super();
    
    this.config = {
      enableWatchdog: true,
      enableProcessMonitor: true,
      enableAutoRestart: true,
      maxRestartAttempts: 5,
      restartDelay: 3000,
      healthCheckInterval: 60000, // 1 minute
      criticalServices: ['threePollerSystem', 'attendanceProcessor']
    };

    this.registerServices().catch(console.error);
    this.setupEventHandlers();
  }

  private async registerServices(): Promise<void> {
    console.log('[ServiceManager] 📋 Registering services...');
    
    // Register enhanced Three-Poller System (replaces all old polling services)
    this.services.set('threePollerSystem', threePollerSystem);
    this.services.set('attendanceProcessor', attendanceProcessingService);
    this.services.set('postProcessingAnalytics', postProcessingAnalyticsService);
    this.services.set('watchdog', watchdogService);
    this.services.set('processMonitor', processMonitorService);
    
    // Register clean WhatsApp service
    try {
      const { whatsappService } = await import('./whatsappService.ts');
      this.services.set('whatsappService', whatsappService);
      console.log('[ServiceManager] 📱 Clean WhatsApp Service registered');
    } catch (error) {
      console.log('[ServiceManager] ⚠️ WhatsApp Service not available:', error.message);
    }
    
    // Register Auto Backup Service for daily comprehensive backups at 00:01 PKT
    try {
      const { autoBackupService } = await import('./autoBackupService.ts');
      this.services.set('autoBackupService', autoBackupService);
      console.log('[ServiceManager] 💾 Auto Backup Service registered');
    } catch (error) {
      console.log('[ServiceManager] ⚠️ Auto Backup Service not available:', error.message);
    }
    
    this.services.set('systemAlerts', systemAlertsService);
    this.services.set('notificationService', notificationService);
    
    // Additional WhatsApp services will be registered after recreation

    console.log(`[ServiceManager] 📋 Registered ${this.services.size} services:`, Array.from(this.services.keys()));

    // Initialize service status with autostart and watchdog settings
    for (const [name] of Array.from(this.services.entries())) {
      this.serviceStatus.set(name, {
        name,
        isRunning: false,
        health: 'stopped',
        lastHeartbeat: null,
        errorCount: 0,
        restartCount: 0,
        uptime: 0,
        autostart: true, // Default autostart enabled
        watchdogEnabled: true, // Default watchdog enabled
        startupMethod: 'system', // Default startup method
        lastShutdownReason: 'unknown',
        startedBy: 'system',
        stoppedBy: 'system'
      });
    }
  }

  private setupEventHandlers(): void {
    // Handle process termination signals
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    process.on('SIGHUP', () => this.handleReload());

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      console.error('[ServiceManager] ❌ Uncaught exception:', error);
      this.handleCriticalError(error);
    });

    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      console.error('[ServiceManager] ❌ Unhandled rejection at:', promise, 'reason:', reason);
      this.handleCriticalError(new Error(`Unhandled rejection: ${reason}`));
    });

    // Listen for watchdog events
    watchdogService.on('serviceRestarted', (serviceName) => {
      this.updateServiceStatus(serviceName, 'healthy');
      console.log(`[ServiceManager] ✅ Service ${serviceName} restarted by watchdog`);
    });

    watchdogService.on('serviceRestartFailed', (serviceName) => {
      this.handleServiceFailure(serviceName);
    });

    // Listen for process monitor events
    processMonitorService.on('highMemoryUsage', (usage) => {
      console.log(`[ServiceManager] ⚠️ High memory usage detected: ${usage.toFixed(1)}%`);
      this.handleHighResourceUsage('memory', usage);
    });

    processMonitorService.on('highCpuUsage', (usage) => {
      console.log(`[ServiceManager] ⚠️ High CPU usage detected: ${usage.toFixed(1)}%`);
      this.handleHighResourceUsage('cpu', usage);
    });
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[ServiceManager] Already running');
      return;
    }

    this.isRunning = true;
    this.startTime = new Date();
    console.log('[ServiceManager] 🚀 Starting service management system...');

    try {
      // Start monitoring services first
      if (this.config.enableProcessMonitor) {
        await processMonitorService.start();
        this.updateServiceStatus('processMonitor', 'healthy');
      }

      if (this.config.enableWatchdog) {
        await watchdogService.start();
        this.updateServiceStatus('watchdog', 'healthy');
      }

      // Start critical services
      await this.startCriticalServices();

      // Start remaining services
      await this.startRemainingServices();

      console.log('[ServiceManager] 🚀 All services started successfully');
      this.emit('allServicesStarted');

    } catch (error) {
      console.error('[ServiceManager] ❌ Error starting services:', error);
      this.emit('startupError', error);
      throw error;
    }
  }

  private async startCriticalServices(): Promise<void> {
    console.log('[ServiceManager] 🔑 Starting critical services...');
    
    for (const serviceName of this.config.criticalServices) {
      try {
        await this.startService(serviceName);
        console.log(`[ServiceManager] ✅ Critical service ${serviceName} started`);
      } catch (error) {
        console.error(`[ServiceManager] ❌ Failed to start critical service ${serviceName}:`, error);
        throw new Error(`Critical service ${serviceName} failed to start: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  private async startRemainingServices(): Promise<void> {
    console.log('[ServiceManager] 🔄 Starting remaining services...');
    
    for (const [serviceName] of Array.from(this.services.entries())) {
      if (!this.config.criticalServices.includes(serviceName) && 
          serviceName !== 'watchdog' && 
          serviceName !== 'processMonitor') {
        
        const status = this.serviceStatus.get(serviceName);
        if (status && status.autostart === false) {
          console.log(`[ServiceManager] ⏸️ Skipping service ${serviceName} (autostart disabled)`);
          continue;
        }
        
        try {
          console.log(`[ServiceManager] 🔄 Starting service ${serviceName}...`);
          await this.startService(serviceName);
          console.log(`[ServiceManager] ✅ Service ${serviceName} started successfully`);
          
          // Special handling for WhatsApp status monitor
          if (serviceName === 'whatsappStatusMonitor') {
            const service = this.services.get(serviceName);
            if (service && service.start) {
              service.start();
              console.log(`[ServiceManager] 🟢 WhatsApp Status Monitor started with 5-minute intervals`);
            }
          }
        } catch (error) {
          console.error(`[ServiceManager] ⚠️ Failed to start service ${serviceName}:`, error);
          console.error(`[ServiceManager] Error details for ${serviceName}:`, error instanceof Error ? error.message : 'Unknown error');
          this.updateServiceStatus(serviceName, 'error');
          // Non-critical services can fail without stopping the system
        }
      }
    }
  }

  private async startService(serviceName: string, method: 'dev' | 'admin' | 'watchdog' | 'system' | 'auto' | 'manual' = 'system', startedBy: string = 'system'): Promise<void> {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }

    if (typeof service.start === 'function') {
      await service.start();
      const status = this.serviceStatus.get(serviceName);
      if (status) {
        status.startupMethod = method;
        status.startedBy = startedBy;
        status.lastShutdownReason = undefined; // Clear previous shutdown reason
      }
      this.updateServiceStatus(serviceName, 'healthy');
      console.log(`[ServiceManager] 🚀 Service ${serviceName} started by ${method} (${startedBy})`);
    } else {
      console.log(`[ServiceManager] ⚠️ Service ${serviceName} has no start method`);
    }
  }

  private async stopService(serviceName: string, reason: 'admin_stop' | 'admin_restart' | 'watchdog_restart' | 'system_shutdown' | 'error' | 'crash' | 'maintenance' | 'unknown' = 'unknown', stoppedBy: string = 'system'): Promise<void> {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }

    if (typeof service.stop === 'function') {
      await service.stop();
      const status = this.serviceStatus.get(serviceName);
      if (status) {
        status.lastShutdownReason = reason;
        status.stoppedBy = stoppedBy;
      }
      this.updateServiceStatus(serviceName, 'stopped');
      console.log(`[ServiceManager] ⏹️ Service ${serviceName} stopped: ${reason} (${stoppedBy})`);
    } else {
      console.log(`[ServiceManager] ⚠️ Service ${serviceName} has no stop method`);
    }
  }

  private async restartService(serviceName: string): Promise<void> {
    console.log(`[ServiceManager] 🔄 Restarting service ${serviceName}...`);
    
    const status = this.serviceStatus.get(serviceName);
    if (status) {
      status.restartCount++;
      
      if (status.restartCount > this.config.maxRestartAttempts) {
        console.error(`[ServiceManager] ❌ Service ${serviceName} exceeded max restart attempts`);
        this.handleServiceFailure(serviceName);
        return;
      }
    }

    try {
      // Stop the service
      await this.stopService(serviceName);
      
      // Wait before restart
      await new Promise(resolve => setTimeout(resolve, this.config.restartDelay));
      
      // Start the service
      await this.startService(serviceName);
      
      console.log(`[ServiceManager] ✅ Service ${serviceName} restarted successfully`);
      this.emit('serviceRestarted', serviceName);
      
    } catch (error) {
      console.error(`[ServiceManager] ❌ Failed to restart service ${serviceName}:`, error);
      this.handleServiceFailure(serviceName);
    }
  }

  private updateServiceStatus(serviceName: string, health: 'healthy' | 'unhealthy' | 'stopped' | 'error'): void {
    const status = this.serviceStatus.get(serviceName);
    if (status) {
      const previousHealth = status.health;
      status.health = health;
      status.isRunning = health === 'healthy';
      status.lastHeartbeat = new Date();
      status.uptime = new Date().getTime() - this.startTime.getTime();
      
      // Log significant status changes
      if (previousHealth !== health) {
        console.log(`[ServiceManager] 📊 Service ${serviceName}: ${previousHealth} → ${health}`);
      }
      
      // Reset error count on healthy status
      if (health === 'healthy') {
        status.errorCount = 0;
      } else if (health === 'error') {
        status.errorCount++;
      }
    }
  }

  private async handleServiceFailure(serviceName: string): Promise<void> {
    const status = this.serviceStatus.get(serviceName);
    if (status) {
      status.errorCount++;
      this.updateServiceStatus(serviceName, 'error');
    }

    console.error(`[ServiceManager] ❌ Service ${serviceName} failed`);
    this.emit('serviceFailed', serviceName);

    // Check if it's a critical service
    if (this.config.criticalServices.includes(serviceName)) {
      console.error(`[ServiceManager] 🚨 Critical service ${serviceName} failed - initiating emergency protocols`);
      await this.handleCriticalServiceFailure(serviceName);
    }
  }

  private async handleCriticalServiceFailure(serviceName: string): Promise<void> {
    console.log(`[ServiceManager] 🚨 Handling critical service failure: ${serviceName}`);
    
    // Try immediate restart
    if (this.config.enableAutoRestart) {
      await this.restartService(serviceName);
    }

    // If still failing, escalate
    const status = this.serviceStatus.get(serviceName);
    if (status && status.health === 'error') {
      console.error(`[ServiceManager] 🚨 Critical service ${serviceName} still failing after restart`);
      this.emit('criticalServiceFailure', serviceName);
      
      // You might want to implement additional escalation here
      // such as sending alerts, triggering failover, etc.
    }
  }

  private async handleHighResourceUsage(type: 'memory' | 'cpu', usage: number): Promise<void> {
    console.log(`[ServiceManager] ⚠️ High ${type} usage: ${usage.toFixed(1)}%`);
    
    if (usage > 95) {
      console.log(`[ServiceManager] 🚨 Critical ${type} usage - taking defensive actions`);
      
      // Force garbage collection
      if (global.gc) {
        global.gc();
      }
      
      // Temporarily pause non-critical services
      await this.pauseNonCriticalServices();
      
      // Resume after a delay
      setTimeout(async () => {
        await this.resumeNonCriticalServices();
      }, 30000); // 30 seconds
    }
  }

  private async pauseNonCriticalServices(): Promise<void> {
    console.log('[ServiceManager] ⏸️ Pausing non-critical services...');
    
    for (const [serviceName] of Array.from(this.services.entries())) {
      if (!this.config.criticalServices.includes(serviceName) && 
          serviceName !== 'watchdog' && 
          serviceName !== 'processMonitor') {
        
        const service = this.services.get(serviceName);
        if (service && typeof service.pause === 'function') {
          try {
            await service.pause();
            console.log(`[ServiceManager] ⏸️ Service ${serviceName} paused`);
          } catch (error) {
            console.error(`[ServiceManager] Error pausing service ${serviceName}:`, error);
          }
        }
      }
    }
  }

  private async resumeNonCriticalServices(): Promise<void> {
    console.log('[ServiceManager] ▶️ Resuming non-critical services...');
    
    for (const [serviceName] of Array.from(this.services.entries())) {
      if (!this.config.criticalServices.includes(serviceName) && 
          serviceName !== 'watchdog' && 
          serviceName !== 'processMonitor') {
        
        const service = this.services.get(serviceName);
        if (service && typeof service.resume === 'function') {
          try {
            await service.resume();
            console.log(`[ServiceManager] ▶️ Service ${serviceName} resumed`);
          } catch (error) {
            console.error(`[ServiceManager] Error resuming service ${serviceName}:`, error);
          }
        }
      }
    }
  }

  private async handleCriticalError(error: Error): Promise<void> {
    console.error('[ServiceManager] 🚨 Critical error detected:', error);
    
    if (!this.shutdownInProgress) {
      this.emit('criticalError', error);
      
      // Try to save state or perform emergency actions
      await this.emergencyShutdown();
    }
  }

  private async handleReload(): Promise<void> {
    console.log('[ServiceManager] 🔄 Handling reload signal...');
    
    // Reload configuration
    // Restart services if needed
    this.emit('reload');
  }

  private async gracefulShutdown(signal: string): Promise<void> {
    if (this.shutdownInProgress) {
      console.log(`[ServiceManager] Shutdown already in progress, ignoring ${signal}`);
      return;
    }

    this.shutdownInProgress = true;
    console.log(`[ServiceManager] 🛑 Graceful shutdown initiated by ${signal}`);

    try {
      // Stop all services in reverse order
      const serviceNames = Array.from(this.services.keys()).reverse();
      
      for (const serviceName of serviceNames) {
        try {
          await this.stopService(serviceName);
          console.log(`[ServiceManager] ✅ Service ${serviceName} stopped`);
        } catch (error) {
          console.error(`[ServiceManager] Error stopping service ${serviceName}:`, error);
        }
      }

      console.log('[ServiceManager] 🛑 Graceful shutdown completed');
      process.exit(0);

    } catch (error) {
      console.error('[ServiceManager] Error during graceful shutdown:', error);
      process.exit(1);
    }
  }

  private async emergencyShutdown(): Promise<void> {
    console.log('[ServiceManager] 🚨 Emergency shutdown initiated');
    
    this.shutdownInProgress = true;
    
    // Force stop all services
    for (const [serviceName] of Array.from(this.services.entries())) {
      try {
        await this.stopService(serviceName);
      } catch (error) {
        console.error(`[ServiceManager] Error force stopping service ${serviceName}:`, error);
      }
    }

    process.exit(1);
  }

  // Public API methods
  async getServiceStatus(): Promise<ServiceStatus[]> {
    return Array.from(this.serviceStatus.values());
  }

  async getManagerStatus(): Promise<{
    isRunning: boolean;
    uptime: number;
    totalServices: number;
    healthyServices: number;
    unhealthyServices: number;
    criticalServices: string[];
    maintenanceMode: boolean;
  }> {
    const services = Array.from(this.serviceStatus.values());
    const healthyCount = services.filter(s => s.health === 'healthy').length;
    const unhealthyCount = services.filter(s => s.health === 'unhealthy' || s.health === 'error').length;
    
    return {
      isRunning: this.isRunning,
      uptime: new Date().getTime() - this.startTime.getTime(),
      totalServices: services.length,
      healthyServices: healthyCount,
      unhealthyServices: unhealthyCount,
      criticalServices: this.config.criticalServices,
      maintenanceMode: this.maintenanceMode
    };
  }

  async forceRestartService(serviceName: string, adminUser?: string): Promise<void> {
    await this.stopService(serviceName, 'admin_restart', adminUser || 'admin');
    await this.startService(serviceName, 'admin', adminUser || 'admin');
  }

  async forceStartService(serviceName: string, adminUser?: string): Promise<void> {
    await this.startService(serviceName, 'admin', adminUser || 'admin');
  }

  async forceStopService(serviceName: string, adminUser?: string): Promise<void> {
    await this.stopService(serviceName, 'admin_stop', adminUser || 'admin');
  }

  async getSystemHealth(): Promise<{
    overallHealth: number;
    totalServices: number;
    healthyServices: number;
    warningServices: number;
    criticalServices: number;
    stoppedServices: number;
    maintenanceMode: boolean;
    uptime: number;
  }> {
    const services = Array.from(this.serviceStatus.values());
    const healthyCount = services.filter(s => s.health === 'healthy').length;
    const warningCount = services.filter(s => s.health === 'unhealthy').length;
    const criticalCount = services.filter(s => s.health === 'error').length;
    const stoppedCount = services.filter(s => s.health === 'stopped').length;
    
    // Calculate overall health percentage
    const overallHealth = services.length > 0 ? (healthyCount / services.length) * 100 : 0;
    
    return {
      overallHealth: Math.round(overallHealth),
      totalServices: services.length,
      healthyServices: healthyCount,
      warningServices: warningCount,
      criticalServices: criticalCount,
      stoppedServices: stoppedCount,
      maintenanceMode: this.maintenanceMode,
      uptime: Math.floor((new Date().getTime() - this.startTime.getTime()) / 1000)
    };
  }

  async enableMaintenanceMode(): Promise<void> {
    this.maintenanceMode = true;
    console.log('[ServiceManager] 🔧 Maintenance mode enabled');
    this.emit('maintenanceModeEnabled');
  }

  async disableMaintenanceMode(): Promise<void> {
    this.maintenanceMode = false;
    console.log('[ServiceManager] 🔧 Maintenance mode disabled');
    this.emit('maintenanceModeDisabled');
  }

  async setAutostart(serviceName: string, enabled: boolean): Promise<void> {
    const status = this.serviceStatus.get(serviceName);
    if (!status) {
      throw new Error(`Service ${serviceName} not found`);
    }
    
    status.autostart = enabled;
    console.log(`[ServiceManager] ${enabled ? '✅' : '❌'} Autostart ${enabled ? 'enabled' : 'disabled'} for service ${serviceName}`);
    
    this.emit('autostartChanged', { serviceName, enabled });
  }

  async setWatchdogEnabled(serviceName: string, enabled: boolean): Promise<void> {
    const status = this.serviceStatus.get(serviceName);
    if (!status) {
      throw new Error(`Service ${serviceName} not found`);
    }
    
    status.watchdogEnabled = enabled;
    console.log(`[ServiceManager] ${enabled ? '✅' : '❌'} Watchdog ${enabled ? 'enabled' : 'disabled'} for service ${serviceName}`);
    
    this.emit('watchdogChanged', { serviceName, enabled });
  }

  // Additional API methods for service management
  getAllServices(): Map<string, any> {
    return new Map(this.services);
  }

  getServiceStatusByName(serviceName: string): ServiceStatus | null {
    return this.serviceStatus.get(serviceName) || null;
  }

  isCriticalService(serviceName: string): boolean {
    return this.config.criticalServices.includes(serviceName);
  }

  getServiceHealth(): { healthy: number; unhealthy: number; stopped: number } {
    const statuses = Array.from(this.serviceStatus.values());
    return {
      healthy: statuses.filter(s => s.health === 'healthy').length,
      unhealthy: statuses.filter(s => s.health === 'unhealthy' || s.health === 'error').length,
      stopped: statuses.filter(s => s.health === 'stopped').length
    };
  }

  getAllServiceStatuses(): ServiceStatus[] {
    return Array.from(this.serviceStatus.values());
  }
}

export const serviceManager = new ServiceManager();