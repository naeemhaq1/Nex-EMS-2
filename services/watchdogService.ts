import { EventEmitter } from 'events';
import { threePollerSystem } from './threePollerSystem.js';

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'unhealthy' | 'stopped';
  lastCheck: Date;
  lastActivity: Date | null;
  consecutiveFailures: number;
  uptime: number;
  errorCount: number;
  lastError?: string;
}

interface WatchdogConfig {
  checkInterval: number; // milliseconds
  maxFailures: number;
  restartDelay: number;
  healthTimeout: number;
  enabled: boolean;
}

class WatchdogService extends EventEmitter {
  private config: WatchdogConfig;
  private services: Map<string, ServiceHealth> = new Map();
  private watchdogInterval: NodeJS.Timeout | null = null;
  private startTime: Date = new Date();
  private isRunning = false;

  constructor() {
    super();
    
    this.config = {
      checkInterval: 60000, // Check every minute
      maxFailures: 3,
      restartDelay: 5000, // Wait 5 seconds before restart
      healthTimeout: 30000, // 30 second timeout for health checks
      enabled: true
    };

    // Register the enhanced Three-Poller System (replaces all old pollers)
    this.registerService('threePollerSystem', threePollerSystem);
  }

  private registerService(name: string, service: any) {
    this.services.set(name, {
      name,
      status: 'healthy',
      lastCheck: new Date(),
      lastActivity: null,
      consecutiveFailures: 0,
      uptime: 0,
      errorCount: 0
    });

    // Listen for service events
    if (service && typeof service.on === 'function') {
      service.on('error', (error: Error) => {
        this.handleServiceError(name, error);
      });

      service.on('activity', () => {
        this.updateServiceActivity(name);
      });

      // Listen for polling events
      service.on('timestampPollComplete', () => {
        this.updateServiceActivity(name);
      });

      service.on('pollComplete', () => {
        this.updateServiceActivity(name);
      });
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[Watchdog] Service already running');
      return;
    }

    this.isRunning = true;
    this.startTime = new Date();
    
    console.log('[Watchdog] 🐕 Starting watchdog service...');
    console.log(`[Watchdog] Configuration: Check every ${this.config.checkInterval/1000}s, Max failures: ${this.config.maxFailures}`);

    // Start monitoring loop
    this.watchdogInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.config.checkInterval);

    // Perform initial health check
    await this.performHealthChecks();
    
    console.log('[Watchdog] 🐕 Watchdog service started successfully');
    this.emit('watchdogStarted');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval);
      this.watchdogInterval = null;
    }

    console.log('[Watchdog] 🐕 Watchdog service stopped');
    this.emit('watchdogStopped');
  }

  private async performHealthChecks(): Promise<void> {
    const now = new Date();
    
    for (const [serviceName, health] of this.services) {
      try {
        const isHealthy = await this.checkServiceHealth(serviceName);
        
        if (isHealthy) {
          // Service is healthy
          if (health.status !== 'healthy') {
            console.log(`[Watchdog] ✅ Service ${serviceName} recovered`);
          }
          health.status = 'healthy';
          health.consecutiveFailures = 0;
        } else {
          // Service is unhealthy
          health.consecutiveFailures++;
          health.status = 'unhealthy';
          
          console.log(`[Watchdog] ⚠️ Service ${serviceName} unhealthy (${health.consecutiveFailures}/${this.config.maxFailures})`);
          
          // Attempt restart if max failures reached
          if (health.consecutiveFailures >= this.config.maxFailures) {
            console.log(`[Watchdog] 🔄 Attempting to restart service ${serviceName}`);
            await this.restartService(serviceName);
          }
        }
        
        health.lastCheck = now;
        health.uptime = now.getTime() - this.startTime.getTime();
        
      } catch (error) {
        console.error(`[Watchdog] Error checking service ${serviceName}:`, error);
        health.errorCount++;
        health.lastError = error.message;
      }
    }
  }

  private async checkServiceHealth(serviceName: string): Promise<boolean> {
    const health = this.services.get(serviceName);
    if (!health) return false;

    // First check if service has an isRunning method and use it
    try {
      const service = this.getServiceInstance(serviceName);
      if (service) {
        // Special handling for lateEarlyAnalysis service
        if (serviceName === 'lateEarlyAnalysis' && typeof service.isServiceRunning === 'function') {
          const isRunning = service.isServiceRunning();
          if (typeof isRunning === 'boolean') {
            return isRunning;
          }
        } else if (typeof service.isRunning === 'function') {
          const isRunning = service.isRunning();
          if (typeof isRunning === 'boolean') {
            return isRunning;
          }
        }
      }
    } catch (error) {
      console.log(`[Watchdog] Error checking isRunning for ${serviceName}:`, error.message);
    }

    // Fallback to activity-based health check
    const now = new Date();
    const timeSinceLastActivity = health.lastActivity ? 
      now.getTime() - health.lastActivity.getTime() : 
      Number.MAX_SAFE_INTEGER;

    // Define service-specific health criteria with more lenient timeouts
    switch (serviceName) {
      case 'timestampPolling':
        // Should have activity within last 15 minutes (3 polling cycles)
        return timeSinceLastActivity < 900000;
      
      case 'automatedPolling':
        // Should have activity within last 20 minutes
        return timeSinceLastActivity < 1200000;
      
      case 'checkAttend':
        // Should have activity within last 60 minutes
        return timeSinceLastActivity < 3600000;
      
      case 'autoPunchout':
        // Should have activity within last 2 hours
        return timeSinceLastActivity < 7200000;
      
      case 'lateEarlyAnalysis':
        // Should have activity within last 2 hours
        return timeSinceLastActivity < 7200000;
      
      default:
        return true;
    }
  }

  private getServiceInstance(serviceName: string): any {
    switch (serviceName) {
      case 'timestampPolling':
        return timestampBasedPollingService;
      case 'automatedPolling':
        return automatedBioTimePolling;
      case 'checkAttend':
        return checkAttendService;
      case 'autoPunchout':
        return autoPunchoutService;
      case 'lateEarlyAnalysis':
        return lateEarlyAnalysisService;
      default:
        return null;
    }
  }

  private async restartService(serviceName: string): Promise<void> {
    try {
      console.log(`[Watchdog] 🔄 Restarting service: ${serviceName}`);
      
      // Wait before restart
      await new Promise(resolve => setTimeout(resolve, this.config.restartDelay));
      
      // Restart specific service
      switch (serviceName) {
        case 'timestampPolling':
          await timestampBasedPollingService.stop();
          await timestampBasedPollingService.start();
          break;
        
        case 'automatedPolling':
          await automatedBioTimePolling.stop();
          await automatedBioTimePolling.start();
          break;
        
        case 'checkAttend':
          await checkAttendService.stop();
          await checkAttendService.start();
          break;
        
        case 'autoPunchout':
          await autoPunchoutService.stop();
          await autoPunchoutService.start();
          break;
        
        case 'lateEarlyAnalysis':
          await lateEarlyAnalysisService.stop();
          await lateEarlyAnalysisService.start();
          break;
      }
      
      // Reset failure count
      const health = this.services.get(serviceName);
      if (health) {
        health.consecutiveFailures = 0;
        health.status = 'healthy';
      }
      
      console.log(`[Watchdog] ✅ Service ${serviceName} restarted successfully`);
      this.emit('serviceRestarted', serviceName);
      
    } catch (error) {
      console.error(`[Watchdog] ❌ Failed to restart service ${serviceName}:`, error);
      this.emit('serviceRestartFailed', serviceName, error);
    }
  }

  private handleServiceError(serviceName: string, error: Error): void {
    const health = this.services.get(serviceName);
    if (health) {
      health.errorCount++;
      health.lastError = error.message;
      health.status = 'unhealthy';
    }
    
    console.error(`[Watchdog] Service ${serviceName} error:`, error);
    this.emit('serviceError', serviceName, error);
  }

  private updateServiceActivity(serviceName: string): void {
    const health = this.services.get(serviceName);
    if (health) {
      health.lastActivity = new Date();
      if (health.status === 'unhealthy') {
        health.status = 'healthy';
        health.consecutiveFailures = 0;
      }
    }
  }

  // Public API methods
  async getServiceHealth(): Promise<ServiceHealth[]> {
    return Array.from(this.services.values());
  }

  async getWatchdogStatus(): Promise<{
    isRunning: boolean;
    uptime: number;
    totalServices: number;
    healthyServices: number;
    unhealthyServices: number;
    lastCheck: Date;
  }> {
    const services = Array.from(this.services.values());
    const healthyCount = services.filter(s => s.status === 'healthy').length;
    const unhealthyCount = services.filter(s => s.status === 'unhealthy').length;
    
    return {
      isRunning: this.isRunning,
      uptime: new Date().getTime() - this.startTime.getTime(),
      totalServices: services.length,
      healthyServices: healthyCount,
      unhealthyServices: unhealthyCount,
      lastCheck: new Date()
    };
  }

  async forceRestartService(serviceName: string): Promise<void> {
    if (this.services.has(serviceName)) {
      await this.restartService(serviceName);
    } else {
      throw new Error(`Service ${serviceName} not found`);
    }
  }

  async setConfig(newConfig: Partial<WatchdogConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    // Restart monitoring with new config
    if (this.isRunning) {
      await this.stop();
      await this.start();
    }
  }
}

export const watchdogService = new WatchdogService();