import { EventEmitter } from 'events';
import { watchdogService } from './watchdogService';
import { processMonitorService } from './processMonitorService';
import { threePollerSystem } from './threePollerSystem';
import { systemAlertsService } from './systemAlertsService';
import { notificationService } from './notificationService';
import { autoBackupService } from './autoBackupService';
import { attendanceProcessingService } from './attendanceProcessingService';
import { dailyAttendanceConfirmationService } from './dailyAttendanceConfirmationService';

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
  startupMethod?: string;
  lastShutdownReason?: string;
  startedBy?: string;
  stoppedBy?: string;
}

class CoreServiceManager extends EventEmitter {
  private services: Map<string, any> = new Map();
  private serviceStatus: Map<string, ServiceStatus> = new Map();
  private isRunning = false;
  private startTime: Date = new Date();

  constructor() {
    super();
    this.registerServices().catch(console.error);
  }

  private async registerServices(): Promise<void> {
    console.log('[CoreServiceManager] 📋 Registering core services...');
    
    // Register core services (non-WhatsApp)
    this.services.set('threePollerSystem', threePollerSystem);
    this.services.set('attendanceProcessor', attendanceProcessingService);
    this.services.set('watchdog', watchdogService);
    this.services.set('processMonitor', processMonitorService);
    this.services.set('systemAlerts', systemAlertsService);
    this.services.set('notificationService', notificationService);
    this.services.set('autoBackupService', autoBackupService);
    this.services.set('dailyAttendanceConfirmation', dailyAttendanceConfirmationService);

    // Initialize service status
    for (const name of this.services.keys()) {
      this.serviceStatus.set(name, {
        name,
        isRunning: false,
        health: 'stopped',
        lastHeartbeat: null,
        errorCount: 0,
        restartCount: 0,
        uptime: 0,
        autostart: true,
        watchdogEnabled: true,
        startupMethod: 'system',
        startedBy: 'core-manager'
      });
    }

    console.log(`[CoreServiceManager] ✅ Registered ${this.services.size} core services`);
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[CoreServiceManager] ⚠️ Core services already running');
      return;
    }

    console.log('[CoreServiceManager] 🚀 Starting core services...');
    this.isRunning = true;
    this.startTime = new Date();

    // Start critical services first
    const criticalServices = ['threePollerSystem', 'attendanceProcessor'];
    
    console.log('[CoreServiceManager] 🔑 Starting critical services...');
    for (const serviceName of criticalServices) {
      await this.startService(serviceName);
    }

    // Start remaining services
    console.log('[CoreServiceManager] 🔄 Starting remaining services...');
    for (const serviceName of this.services.keys()) {
      if (!criticalServices.includes(serviceName)) {
        await this.startService(serviceName);
      }
    }

    console.log('[CoreServiceManager] ✅ All core services started successfully');
  }

  private async startService(serviceName: string): Promise<void> {
    try {
      console.log(`[CoreServiceManager] 🔄 Starting service ${serviceName}...`);
      
      const service = this.services.get(serviceName);
      if (!service) {
        throw new Error(`Service ${serviceName} not found`);
      }

      if (typeof service.start === 'function') {
        await service.start();
      }

      this.updateServiceStatus(serviceName, 'healthy');
      console.log(`[CoreServiceManager] ✅ Service ${serviceName} started successfully`);
    } catch (error) {
      console.error(`[CoreServiceManager] ❌ Failed to start service ${serviceName}:`, error);
      this.updateServiceStatus(serviceName, 'error');
    }
  }

  private updateServiceStatus(serviceName: string, health: 'healthy' | 'unhealthy' | 'stopped' | 'error'): void {
    const status = this.serviceStatus.get(serviceName);
    if (status) {
      status.health = health;
      status.isRunning = health === 'healthy';
      status.lastHeartbeat = new Date();
      
      if (health === 'healthy') {
        status.uptime = Date.now() - this.startTime.getTime();
      }

      console.log(`[CoreServiceManager] 📊 Service ${serviceName}: stopped → ${health}`);
    }
  }

  getAllServices(): Map<string, any> {
    return this.services;
  }

  getServiceStatusByName(name: string): ServiceStatus | undefined {
    return this.serviceStatus.get(name);
  }

  getServiceSummary(): { total: number; healthy: number; unhealthy: number } {
    const total = this.services.size;
    const healthy = Array.from(this.serviceStatus.values()).filter(s => s.health === 'healthy').length;
    const unhealthy = total - healthy;

    return { total, healthy, unhealthy };
  }

  isCriticalService(serviceName: string): boolean {
    return ['threePollerSystem', 'attendanceProcessor'].includes(serviceName);
  }

  async stop(): Promise<void> {
    console.log('[CoreServiceManager] 🛑 Stopping all core services...');
    this.isRunning = false;

    for (const serviceName of this.services.keys()) {
      const service = this.services.get(serviceName);
      try {
        if (typeof service.stop === 'function') {
          await service.stop();
        }
        this.updateServiceStatus(serviceName, 'stopped');
      } catch (error) {
        console.error(`[CoreServiceManager] Error stopping ${serviceName}:`, error);
      }
    }
  }
}

export const coreServiceManager = new CoreServiceManager();