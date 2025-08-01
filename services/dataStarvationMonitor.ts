import { EventEmitter } from 'events';
import { db } from '../db';
import { attendancePullExt } from '@shared/schema';
import { sql } from 'drizzle-orm';

export interface DataStarvationStatus {
  status: 'healthy' | 'warning' | 'critical' | 'waiting_for_data';
  lastDataReceived: Date | null;
  minutesSinceLastData: number;
  message: string;
  recommendation: string;
  isStarved: boolean;
}

export interface DataStarvationConfig {
  warningThresholdMinutes: number;  // Show warning after X minutes
  criticalThresholdMinutes: number; // Show critical after X minutes
  checkIntervalMinutes: number;     // Check every X minutes
}

export class DataStarvationMonitor extends EventEmitter {
  private config: DataStarvationConfig;
  private isRunning = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private lastKnownStatus: DataStarvationStatus | null = null;

  constructor(config?: Partial<DataStarvationConfig>) {
    super();
    this.config = {
      warningThresholdMinutes: 10,    // Warning after 10 minutes
      criticalThresholdMinutes: 30,   // Critical after 30 minutes
      checkIntervalMinutes: 2,        // Check every 2 minutes
      ...config
    };
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[DataStarvationMonitor] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[DataStarvationMonitor] 🔍 Starting data starvation monitoring...');
    console.log(`[DataStarvationMonitor] Config: Warning=${this.config.warningThresholdMinutes}min, Critical=${this.config.criticalThresholdMinutes}min`);

    // Perform initial check
    await this.checkDataStarvation();

    // Schedule regular checks
    this.checkInterval = setInterval(async () => {
      await this.checkDataStarvation();
    }, this.config.checkIntervalMinutes * 60 * 1000);

    console.log(`[DataStarvationMonitor] ✅ Started - checking every ${this.config.checkIntervalMinutes} minutes`);
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    console.log('[DataStarvationMonitor] 🛑 Stopped');
  }

  async checkDataStarvation(): Promise<DataStarvationStatus> {
    try {
      // Get the most recent data timestamp
      const result = await db
        .select({
          lastPunchTime: sql<string>`MAX(${attendancePullExt.allFields}->>'punch_time')`,
          lastPulledAt: sql<string>`MAX(${attendancePullExt.pulledAt})`,
          recordCount: sql<number>`COUNT(*)`
        })
        .from(attendancePullExt)
        .where(sql`${attendancePullExt.allFields}->>'punch_time' IS NOT NULL`);

      const data = result[0];
      const now = new Date();
      let lastDataReceived: Date | null = null;
      let minutesSinceLastData = 0;

      // Determine the most recent data point
      if (data.lastPunchTime) {
        const punchTime = new Date(data.lastPunchTime);
        const pulledTime = data.lastPulledAt ? new Date(data.lastPulledAt) : null;
        
        // Use the more recent of punch_time or pulledAt
        lastDataReceived = pulledTime && pulledTime > punchTime ? pulledTime : punchTime;
        minutesSinceLastData = Math.floor((now.getTime() - lastDataReceived.getTime()) / (1000 * 60));
      }

      // Determine status and create response
      const status = this.determineStatus(minutesSinceLastData, data.recordCount);
      
      // Log status changes
      if (!this.lastKnownStatus || this.lastKnownStatus.status !== status.status) {
        console.log(`[DataStarvationMonitor] Status changed: ${this.lastKnownStatus?.status || 'unknown'} → ${status.status}`);
        console.log(`[DataStarvationMonitor] ${status.message}`);
        
        // Emit status change event
        this.emit('statusChange', status, this.lastKnownStatus);
      }

      this.lastKnownStatus = status;
      return status;

    } catch (error) {
      console.error('[DataStarvationMonitor] Error checking data starvation:', error);
      
      const errorStatus: DataStarvationStatus = {
        status: 'critical',
        lastDataReceived: null,
        minutesSinceLastData: 0,
        message: 'Unable to check data status due to database error',
        recommendation: 'Check database connectivity and restart services',
        isStarved: true
      };
      
      this.emit('statusChange', errorStatus, this.lastKnownStatus);
      return errorStatus;
    }
  }

  private determineStatus(minutesSinceLastData: number, recordCount: number): DataStarvationStatus {
    const { warningThresholdMinutes, criticalThresholdMinutes } = this.config;
    
    // No data at all
    if (recordCount === 0) {
      return {
        status: 'waiting_for_data',
        lastDataReceived: null,
        minutesSinceLastData: 0,
        message: 'Waiting for initial data from BioTime API',
        recommendation: 'Check BioTime API connectivity and authentication',
        isStarved: true
      };
    }

    // Recent data (healthy)
    if (minutesSinceLastData < warningThresholdMinutes) {
      return {
        status: 'healthy',
        lastDataReceived: new Date(Date.now() - (minutesSinceLastData * 60 * 1000)),
        minutesSinceLastData,
        message: `Data is flowing normally (${minutesSinceLastData} minutes ago)`,
        recommendation: 'System is operating normally',
        isStarved: false
      };
    }

    // Warning threshold reached
    if (minutesSinceLastData < criticalThresholdMinutes) {
      return {
        status: 'warning',
        lastDataReceived: new Date(Date.now() - (minutesSinceLastData * 60 * 1000)),
        minutesSinceLastData,
        message: `⚠️ No new data received for ${minutesSinceLastData} minutes`,
        recommendation: 'Check BioTime API connectivity and employee activity',
        isStarved: true
      };
    }

    // Critical threshold reached
    return {
      status: 'critical',
      lastDataReceived: new Date(Date.now() - (minutesSinceLastData * 60 * 1000)),
      minutesSinceLastData,
      message: `🚨 CRITICAL: No data received for ${minutesSinceLastData} minutes`,
      recommendation: 'Immediate attention required - check BioTime API, network connectivity, and service health',
      isStarved: true
    };
  }

  async getStatus(): Promise<DataStarvationStatus> {
    return await this.checkDataStarvation();
  }

  getConfig(): DataStarvationConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<DataStarvationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('[DataStarvationMonitor] Configuration updated:', this.config);
  }

  isHealthy(): boolean {
    return this.lastKnownStatus?.status === 'healthy';
  }

  isStarved(): boolean {
    return this.lastKnownStatus?.isStarved === true;
  }
}

// Export singleton instance
export const dataStarvationMonitor = new DataStarvationMonitor();