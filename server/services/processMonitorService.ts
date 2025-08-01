import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ProcessHealth {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  uptime: number;
  status: 'running' | 'stopped' | 'error';
  lastCheck: Date;
  restartCount: number;
  maxRestarts: number;
}

interface SystemMetrics {
  totalMemory: number;
  freeMemory: number;
  cpuUsage: number;
  loadAverage: number[];
  uptime: number;
  timestamp: Date;
}

class ProcessMonitorService extends EventEmitter {
  private processes: Map<string, ProcessHealth> = new Map();
  private monitorInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private checkInterval = 30000; // Check every 30 seconds
  private systemMetrics: SystemMetrics | null = null;

  constructor() {
    super();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[ProcessMonitor] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[ProcessMonitor] 🖥️ Starting process monitoring service...');

    // Start monitoring loop
    this.monitorInterval = setInterval(async () => {
      await this.performSystemCheck();
    }, this.checkInterval);

    // Perform initial check
    await this.performSystemCheck();
    
    console.log('[ProcessMonitor] 🖥️ Process monitoring service started');
    this.emit('monitorStarted');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    console.log('[ProcessMonitor] 🖥️ Process monitoring service stopped');
    this.emit('monitorStopped');
  }

  private async performSystemCheck(): Promise<void> {
    try {
      // Get system metrics
      this.systemMetrics = await this.getSystemMetrics();
      
      // Check critical thresholds
      await this.checkSystemHealth();
      
      // Log system status
      this.logSystemStatus();
      
    } catch (error) {
      console.error('[ProcessMonitor] Error during system check:', error);
      this.emit('systemCheckError', error);
    }
  }

  private async getSystemMetrics(): Promise<SystemMetrics> {
    const os = await import('os');
    
    return {
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpuUsage: await this.getCpuUsage(),
      loadAverage: os.loadavg(),
      uptime: os.uptime(),
      timestamp: new Date()
    };
  }

  private async getCpuUsage(): Promise<number> {
    try {
      const { stdout } = await execAsync("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | sed 's/%us,//'");
      return parseFloat(stdout.trim()) || 0;
    } catch {
      return 0;
    }
  }

  private async checkSystemHealth(): Promise<void> {
    if (!this.systemMetrics) return;

    const memoryUsagePercent = ((this.systemMetrics.totalMemory - this.systemMetrics.freeMemory) / this.systemMetrics.totalMemory) * 100;
    const cpuUsage = this.systemMetrics.cpuUsage;
    const loadAverage = this.systemMetrics.loadAverage[0];

    // Check memory threshold (90%)
    if (memoryUsagePercent > 90) {
      console.log(`[ProcessMonitor] ⚠️ High memory usage: ${memoryUsagePercent.toFixed(1)}%`);
      this.emit('highMemoryUsage', memoryUsagePercent);
      await this.handleHighMemoryUsage();
    }

    // Check CPU threshold (95%)
    if (cpuUsage > 95) {
      console.log(`[ProcessMonitor] ⚠️ High CPU usage: ${cpuUsage.toFixed(1)}%`);
      this.emit('highCpuUsage', cpuUsage);
      await this.handleHighCpuUsage();
    }

    // Check load average (4.0 for most systems)
    if (loadAverage > 4.0) {
      console.log(`[ProcessMonitor] ⚠️ High load average: ${loadAverage.toFixed(2)}`);
      this.emit('highLoadAverage', loadAverage);
    }
  }

  private async handleHighMemoryUsage(): Promise<void> {
    try {
      console.log('[ProcessMonitor] 🧹 Attempting to free memory...');
      
      // Force garbage collection if possible
      if (global.gc) {
        global.gc();
        console.log('[ProcessMonitor] ✅ Garbage collection triggered');
      }
      
      // Log memory-intensive processes
      await this.logMemoryIntensiveProcesses();
      
    } catch (error) {
      console.error('[ProcessMonitor] Error handling high memory usage:', error);
    }
  }

  private async handleHighCpuUsage(): Promise<void> {
    try {
      console.log('[ProcessMonitor] 🔄 Handling high CPU usage...');
      
      // Log CPU-intensive processes
      await this.logCpuIntensiveProcesses();
      
      // Add small delay to reduce CPU pressure
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error('[ProcessMonitor] Error handling high CPU usage:', error);
    }
  }

  private async logMemoryIntensiveProcesses(): Promise<void> {
    try {
      const { stdout } = await execAsync("ps aux --sort=-%mem | head -10");
      console.log('[ProcessMonitor] 📊 Top memory-consuming processes:');
      console.log(stdout);
    } catch (error) {
      console.error('[ProcessMonitor] Error getting memory processes:', error);
    }
  }

  private async logCpuIntensiveProcesses(): Promise<void> {
    try {
      const { stdout } = await execAsync("ps aux --sort=-%cpu | head -10");
      console.log('[ProcessMonitor] 📊 Top CPU-consuming processes:');
      console.log(stdout);
    } catch (error) {
      console.error('[ProcessMonitor] Error getting CPU processes:', error);
    }
  }

  private logSystemStatus(): void {
    if (!this.systemMetrics) return;

    const memoryUsed = this.systemMetrics.totalMemory - this.systemMetrics.freeMemory;
    const memoryUsagePercent = (memoryUsed / this.systemMetrics.totalMemory) * 100;
    
    const status = {
      memory: `${(memoryUsed / 1024 / 1024 / 1024).toFixed(1)}GB / ${(this.systemMetrics.totalMemory / 1024 / 1024 / 1024).toFixed(1)}GB (${memoryUsagePercent.toFixed(1)}%)`,
      cpu: `${this.systemMetrics.cpuUsage.toFixed(1)}%`,
      load: this.systemMetrics.loadAverage.map(l => l.toFixed(2)).join(', '),
      uptime: `${Math.floor(this.systemMetrics.uptime / 3600)}h ${Math.floor((this.systemMetrics.uptime % 3600) / 60)}m`
    };

    console.log(`[ProcessMonitor] 📊 System: Memory ${status.memory}, CPU ${status.cpu}, Load ${status.load}, Uptime ${status.uptime}`);
  }

  // Enhanced process restart with backoff
  async restartProcessWithBackoff(processName: string, attempt: number = 1): Promise<boolean> {
    const maxAttempts = 5;
    const baseDelay = 2000; // 2 seconds
    
    if (attempt > maxAttempts) {
      console.error(`[ProcessMonitor] ❌ Maximum restart attempts (${maxAttempts}) reached for ${processName}`);
      this.emit('processRestartFailed', processName);
      return false;
    }

    try {
      // Calculate exponential backoff delay
      const delay = baseDelay * Math.pow(2, attempt - 1);
      
      console.log(`[ProcessMonitor] 🔄 Restarting ${processName} (attempt ${attempt}/${maxAttempts}) after ${delay}ms`);
      
      // Wait before restart
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Attempt restart (this would integrate with your service manager)
      const success = await this.attemptProcessRestart(processName);
      
      if (success) {
        console.log(`[ProcessMonitor] ✅ ${processName} restarted successfully`);
        this.emit('processRestarted', processName);
        return true;
      } else {
        // Recursive call with increased attempt count
        return await this.restartProcessWithBackoff(processName, attempt + 1);
      }
      
    } catch (error) {
      console.error(`[ProcessMonitor] Error restarting ${processName}:`, error);
      return await this.restartProcessWithBackoff(processName, attempt + 1);
    }
  }

  private async attemptProcessRestart(processName: string): Promise<boolean> {
    try {
      // This would integrate with your specific service restart logic
      console.log(`[ProcessMonitor] Attempting to restart ${processName}...`);
      
      // Simulate restart process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return true;
    } catch (error) {
      console.error(`[ProcessMonitor] Failed to restart ${processName}:`, error);
      return false;
    }
  }

  // Circuit breaker pattern for service calls
  async executeWithCircuitBreaker<T>(
    operationName: string,
    operation: () => Promise<T>,
    timeout: number = 30000
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      // Set timeout for operation
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Operation ${operationName} timed out after ${timeout}ms`)), timeout);
      });
      
      // Race between operation and timeout
      const result = await Promise.race([operation(), timeoutPromise]);
      
      const duration = Date.now() - startTime;
      console.log(`[ProcessMonitor] ✅ ${operationName} completed in ${duration}ms`);
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[ProcessMonitor] ❌ ${operationName} failed after ${duration}ms:`, error);
      
      this.emit('operationFailed', operationName, error);
      throw error;
    }
  }

  // Health check with retry logic
  async performHealthCheckWithRetry(
    serviceName: string,
    healthCheckFn: () => Promise<boolean>,
    maxRetries: number = 3
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const isHealthy = await this.executeWithCircuitBreaker(
          `${serviceName}-health-check`,
          healthCheckFn,
          10000 // 10 second timeout
        );
        
        if (isHealthy) {
          if (attempt > 1) {
            console.log(`[ProcessMonitor] ✅ ${serviceName} health check passed on attempt ${attempt}`);
          }
          return true;
        }
        
      } catch (error) {
        console.log(`[ProcessMonitor] ⚠️ ${serviceName} health check failed (attempt ${attempt}/${maxRetries}):`, error.message);
        
        if (attempt < maxRetries) {
          const delay = 2000 * attempt; // Progressive delay
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.error(`[ProcessMonitor] ❌ ${serviceName} health check failed after ${maxRetries} attempts`);
    return false;
  }

  // Public API methods

  async getProcessHealth(): Promise<ProcessHealth[]> {
    return Array.from(this.processes.values());
  }

  async getMonitorStatus(): Promise<{
    isRunning: boolean;
    checkInterval: number;
    systemHealth: 'healthy' | 'warning' | 'critical';
    lastCheck: Date | null;
  }> {
    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (this.systemMetrics) {
      const memoryUsagePercent = ((this.systemMetrics.totalMemory - this.systemMetrics.freeMemory) / this.systemMetrics.totalMemory) * 100;
      const cpuUsage = this.systemMetrics.cpuUsage;
      
      if (memoryUsagePercent > 90 || cpuUsage > 95) {
        systemHealth = 'critical';
      } else if (memoryUsagePercent > 75 || cpuUsage > 80) {
        systemHealth = 'warning';
      }
    }
    
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      systemHealth,
      lastCheck: this.systemMetrics?.timestamp || null
    };
  }
}

export const processMonitorService = new ProcessMonitorService();