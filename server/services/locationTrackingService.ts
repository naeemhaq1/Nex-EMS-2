import { db } from "../db";
import { empLoc, employeeRecords } from "../../shared/schema";
import { eq, and, gt, lt } from "drizzle-orm";
import { getCurrentSystemDate } from "../config/timezone";
import { EventEmitter } from "events";

export interface LocationData {
  employeeId: number;
  employeeCode: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  batteryLevel?: number;
  networkType?: string;
  locationName?: string;
  isWorkLocation?: boolean;
  jobSiteId?: string;
  deviceInfo?: any;
  source?: string;
  notes?: string;
}

export interface LocationServiceStats {
  totalRecordsCollected: number;
  activeEmployees: number;
  lastCollectionTime: Date | null;
  successRate: number;
  failureCount: number;
  averageAccuracy: number;
  dataRetentionDays: number;
}

class LocationTrackingService extends EventEmitter {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private watchdogIntervalId: NodeJS.Timeout | null = null;
  private collectionInterval = 5 * 60 * 1000; // 5 minutes
  private watchdogInterval = 2 * 60 * 1000; // 2 minutes watchdog check
  private maxRetries = 3;
  private currentRetryCount = 0;
  private stats: LocationServiceStats = {
    totalRecordsCollected: 0,
    activeEmployees: 0,
    lastCollectionTime: null,
    successRate: 100,
    failureCount: 0,
    averageAccuracy: 0,
    dataRetentionDays: 90, // Keep 90 days of location data
  };

  constructor() {
    super();
    this.setupSignalHandlers();
  }

  /**
   * Start the location tracking service with watchdog protection
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log("[LocationTracking] Service already running");
      return;
    }

    console.log("[LocationTracking] Starting location tracking service...");
    this.isRunning = true;
    this.currentRetryCount = 0;

    // Start the main collection interval
    this.intervalId = setInterval(async () => {
      await this.collectLocationData();
    }, this.collectionInterval);

    // Start the watchdog timer
    this.startWatchdog();

    // Run initial collection
    await this.collectLocationData();

    console.log(`[LocationTracking] Service started - collecting every ${this.collectionInterval / 1000} seconds`);
    this.emit('service-started');
  }

  /**
   * Stop the location tracking service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log("[LocationTracking] Service not running");
      return;
    }

    console.log("[LocationTracking] Stopping location tracking service...");
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.watchdogIntervalId) {
      clearInterval(this.watchdogIntervalId);
      this.watchdogIntervalId = null;
    }

    console.log("[LocationTracking] Service stopped");
    this.emit('service-stopped');
  }

  /**
   * Restart the service with exponential backoff
   */
  async restart(): Promise<void> {
    console.log("[LocationTracking] Restarting service...");
    await this.stop();
    
    // Wait before restarting with exponential backoff
    const delay = Math.min(1000 * Math.pow(2, this.currentRetryCount), 30000);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    this.currentRetryCount++;
    await this.start();
  }

  /**
   * Watchdog function to monitor service health
   */
  private startWatchdog(): void {
    this.watchdogIntervalId = setInterval(() => {
      this.checkServiceHealth();
    }, this.watchdogInterval);
  }

  /**
   * Check service health and restart if needed
   */
  private checkServiceHealth(): void {
    const now = getCurrentSystemDate();
    const lastCollection = this.stats.lastCollectionTime;

    // Check if last collection was more than 2 intervals ago
    if (lastCollection) {
      const timeSinceLastCollection = now.getTime() - lastCollection.getTime();
      const maxAllowedGap = this.collectionInterval * 2;

      if (timeSinceLastCollection > maxAllowedGap) {
        console.log(`[LocationTracking] Watchdog detected stale data - restarting service`);
        this.restart();
        return;
      }
    }

    // Check if service is marked as running but interval is null
    if (this.isRunning && !this.intervalId) {
      console.log("[LocationTracking] Watchdog detected missing interval - restarting service");
      this.restart();
      return;
    }

    // Reset retry count on successful health check
    if (this.currentRetryCount > 0) {
      this.currentRetryCount = 0;
    }
  }

  /**
   * Main location data collection function
   */
  private async collectLocationData(): Promise<void> {
    try {
      console.log("[LocationTracking] Starting location data collection...");
      const startTime = Date.now();

      // Get all active employees
      const activeEmployees = await db
        .select()
        .from(employeeRecords)
        .where(eq(employeeRecords.isActive, true));

      console.log(`[LocationTracking] Found ${activeEmployees.length} active employees`);

      // In a real implementation, you would request location data from mobile devices
      // For now, we'll create a framework for handling incoming location data
      this.stats.activeEmployees = activeEmployees.length;
      this.stats.lastCollectionTime = getCurrentSystemDate();

      // Emit event for external location data providers
      this.emit('location-collection-requested', {
        employees: activeEmployees.map(emp => ({
          employeeId: emp.id,
          employeeCode: emp.employeeCode,
          department: emp.department
        })),
        timestamp: this.stats.lastCollectionTime
      });

      // Cleanup old location data (older than retention period)
      await this.cleanupOldLocationData();

      const duration = Date.now() - startTime;
      console.log(`[LocationTracking] Collection completed in ${duration}ms`);
      
    } catch (error) {
      console.error("[LocationTracking] Error during location collection:", error);
      this.stats.failureCount++;
      this.updateSuccessRate();
      
      // Emit error event
      this.emit('collection-error', error);
      
      // Restart if too many failures
      if (this.stats.failureCount > this.maxRetries) {
        console.log("[LocationTracking] Too many failures, restarting service...");
        this.restart();
      }
    }
  }

  /**
   * Process incoming location data from mobile devices
   */
  async processLocationData(locationData: LocationData): Promise<void> {
    try {
      const timestamp = getCurrentSystemDate();
      
      // Insert location data into database
      await db.insert(empLoc).values({
        employeeId: locationData.employeeId,
        employeeCode: locationData.employeeCode,
        timestamp,
        latitude: locationData.latitude.toString(),
        longitude: locationData.longitude.toString(),
        accuracy: locationData.accuracy?.toString(),
        altitude: locationData.altitude?.toString(),
        speed: locationData.speed?.toString(),
        heading: locationData.heading?.toString(),
        batteryLevel: locationData.batteryLevel,
        networkType: locationData.networkType,
        locationName: locationData.locationName,
        isWorkLocation: locationData.isWorkLocation || false,
        jobSiteId: locationData.jobSiteId,
        deviceInfo: locationData.deviceInfo,
        source: locationData.source || 'mobile_app',
        status: 'active',
        syncStatus: 'synced',
        notes: locationData.notes,
      });

      this.stats.totalRecordsCollected++;
      
      // Update average accuracy
      if (locationData.accuracy) {
        this.updateAverageAccuracy(locationData.accuracy);
      }

      this.emit('location-data-processed', {
        employeeCode: locationData.employeeCode,
        timestamp,
        location: {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy
        }
      });

    } catch (error) {
      console.error("[LocationTracking] Error processing location data:", error);
      this.stats.failureCount++;
      this.updateSuccessRate();
      throw error;
    }
  }

  /**
   * Get location tracking statistics
   */
  getStats(): LocationServiceStats {
    return { ...this.stats };
  }

  /**
   * Get recent location data for an employee
   */
  async getEmployeeLocationHistory(employeeCode: string, limit: number = 10): Promise<any[]> {
    try {
      const locations = await db
        .select()
        .from(empLoc)
        .where(eq(empLoc.employeeCode, employeeCode))
        .orderBy(empLoc.timestamp)
        .limit(limit);

      return locations;
    } catch (error) {
      console.error("[LocationTracking] Error getting employee location history:", error);
      return [];
    }
  }

  /**
   * Get current locations of all employees
   */
  async getCurrentLocations(): Promise<any[]> {
    try {
      // Get the most recent location for each employee
      const recentLocations = await db
        .select()
        .from(empLoc)
        .where(
          and(
            eq(empLoc.status, 'active'),
            gt(empLoc.timestamp, new Date(Date.now() - this.collectionInterval * 2))
          )
        )
        .orderBy(empLoc.timestamp);

      return recentLocations;
    } catch (error) {
      console.error("[LocationTracking] Error getting current locations:", error);
      return [];
    }
  }

  /**
   * Clean up old location data beyond retention period
   */
  private async cleanupOldLocationData(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.stats.dataRetentionDays);

      const result = await db
        .delete(empLoc)
        .where(lt(empLoc.timestamp, cutoffDate));

      if (result.rowCount && result.rowCount > 0) {
        console.log(`[LocationTracking] Cleaned up ${result.rowCount} old location records`);
      }
    } catch (error) {
      console.error("[LocationTracking] Error cleaning up old location data:", error);
    }
  }

  /**
   * Update success rate calculation
   */
  private updateSuccessRate(): void {
    const totalOperations = this.stats.totalRecordsCollected + this.stats.failureCount;
    if (totalOperations > 0) {
      this.stats.successRate = (this.stats.totalRecordsCollected / totalOperations) * 100;
    }
  }

  /**
   * Update average accuracy calculation
   */
  private updateAverageAccuracy(newAccuracy: number): void {
    if (this.stats.totalRecordsCollected === 1) {
      this.stats.averageAccuracy = newAccuracy;
    } else {
      this.stats.averageAccuracy = (
        (this.stats.averageAccuracy * (this.stats.totalRecordsCollected - 1) + newAccuracy) /
        this.stats.totalRecordsCollected
      );
    }
  }

  /**
   * Handle process signals for graceful shutdown
   */
  private setupSignalHandlers(): void {
    process.on('SIGINT', async () => {
      console.log("[LocationTracking] Received SIGINT, shutting down gracefully...");
      await this.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log("[LocationTracking] Received SIGTERM, shutting down gracefully...");
      await this.stop();
      process.exit(0);
    });

    process.on('uncaughtException', async (error) => {
      console.error("[LocationTracking] Uncaught exception:", error);
      await this.restart();
    });

    process.on('unhandledRejection', async (reason, promise) => {
      console.error("[LocationTracking] Unhandled rejection at:", promise, "reason:", reason);
      await this.restart();
    });
  }
}

// Export singleton instance
export const locationTrackingService = new LocationTrackingService();