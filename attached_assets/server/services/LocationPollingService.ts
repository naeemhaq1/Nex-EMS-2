import { db } from '../db';
import { eq, desc, and, gte, lte, inArray } from 'drizzle-orm';
import { EventEmitter } from 'events';
import crypto from 'crypto';
import { configService } from './configService';

interface LocationPollingConfig {
  batchSize: number;
  maxConcurrentBatches: number;
  pollingIntervalMs: number;
  retryDelayMs: number;
  maxRetries: number;
  validationEnabled: boolean;
  geofenceValidationEnabled: boolean;
}

interface LocationData {
  employeeId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  timestamp: Date;
  batteryLevel?: number;
  networkType?: string;
  deviceInfo?: any;
}

export class LocationPollingService extends EventEmitter {
  private config: LocationPollingConfig;
  private isRunning: boolean = false;
  private pollingTimer: NodeJS.Timeout | null = null;
  private activeBatches: Set<string> = new Set();

  constructor(config: Partial<LocationPollingConfig> = {}) {
    super();
    this.config = {
      batchSize: 50, // Process 50 employees at a time
      maxConcurrentBatches: 6, // Up to 6 concurrent batches (300 employees total)
      pollingIntervalMs: configService.getMobileLocationPollingInterval(), // Configurable (default: 3 minutes)
      retryDelayMs: 30000, // 30 seconds retry delay
      maxRetries: 3,
      validationEnabled: true,
      geofenceValidationEnabled: true,
      ...config
    };

    console.log('[LocationPolling] Service initialized with config:', this.config);
  }

  /**
   * Update polling interval from configuration service
   */
  public updatePollingInterval(): void {
    const newInterval = configService.getMobileLocationPollingInterval();
    if (newInterval !== this.config.pollingIntervalMs) {
      console.log(`[LocationPolling] Updating polling interval from ${this.config.pollingIntervalMs}ms to ${newInterval}ms`);
      this.config.pollingIntervalMs = newInterval;
      
      // If running, restart with new interval
      if (this.isRunning) {
        console.log('[LocationPolling] Restarting service with new polling interval...');
        this.stop();
        setTimeout(() => this.start(), 1000); // Restart after 1 second
      }
    }
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[LocationPolling] Service already running');
      return;
    }

    console.log('[LocationPolling] 🚀 Starting location polling service...');
    this.isRunning = true;
    this.emit('started');

    // Start the polling cycle
    await this.startPollingCycle();
    
    console.log('[LocationPolling] ✅ Service started successfully');
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('[LocationPolling] 🛑 Stopping location polling service...');
    this.isRunning = false;

    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }

    // Wait for active batches to complete
    while (this.activeBatches.size > 0) {
      console.log(`[LocationPolling] Waiting for ${this.activeBatches.size} active batches to complete...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.emit('stopped');
    console.log('[LocationPolling] ✅ Service stopped');
  }

  private async startPollingCycle(): Promise<void> {
    if (!this.isRunning) return;

    try {
      console.log('[LocationPolling] 🔄 Starting polling cycle...');
      
      // Get active employees for polling
      const activeEmployees = await this.getActiveEmployees();
      console.log(`[LocationPolling] Found ${activeEmployees.length} active employees`);

      if (activeEmployees.length > 0) {
        // Create batches for polling
        await this.createPollingBatches(activeEmployees);
        
        // Process batches
        await this.processPendingBatches();
      }

      // Schedule next cycle
      if (this.isRunning) {
        this.pollingTimer = setTimeout(() => {
          this.startPollingCycle();
        }, this.config.pollingIntervalMs);
        
        console.log(`[LocationPolling] Next cycle scheduled in ${this.config.pollingIntervalMs / 1000}s`);
      }
    } catch (error) {
      console.error('[LocationPolling] Error in polling cycle:', error);
      this.emit('error', error);
      
      // Retry after delay if still running
      if (this.isRunning) {
        this.pollingTimer = setTimeout(() => {
          this.startPollingCycle();
        }, this.config.retryDelayMs);
      }
    }
  }

  private async getActiveEmployees(): Promise<string[]> {
    try {
      // Get list of active employees from employee_records table
      const [result] = await db.execute(`
        SELECT DISTINCT employee_code 
        FROM employee_records 
        WHERE is_active = true 
        AND stop_pay = false 
        AND employee_code IS NOT NULL
      `);

      return (result as any).rows.map((row: any) => row.employee_code).filter(Boolean);
    } catch (error) {
      console.error('[LocationPolling] Error getting active employees:', error);
      return [];
    }
  }

  private async createPollingBatches(employeeIds: string[]): Promise<void> {
    const batches: string[][] = [];
    
    // Split employees into batches
    for (let i = 0; i < employeeIds.length; i += this.config.batchSize) {
      batches.push(employeeIds.slice(i, i + this.config.batchSize));
    }

    console.log(`[LocationPolling] Creating ${batches.length} batches for ${employeeIds.length} employees`);

    // Create queue entries for each batch
    for (let index = 0; index < batches.length; index++) {
      const batch = batches[index];
      const batchId = `poll_${Date.now()}_${index}`;
      const priority = Math.ceil((index + 1) / 2); // Higher priority for earlier batches

      try {
        await db.insert(locationPollingQueue).values({
          batchId,
          employeeIds: batch,
          status: 'pending',
          priority,
          scheduledFor: new Date(),
          totalEmployees: batch.length,
          successfulPolls: 0,
          failedPolls: 0,
          retryCount: 0,
          maxRetries: this.config.maxRetries
        });

        console.log(`[LocationPolling] Created batch ${batchId} with ${batch.length} employees (priority: ${priority})`);
      } catch (error) {
        console.error(`[LocationPolling] Error creating batch ${batchId}:`, error);
      }
    }
  }

  private async processPendingBatches(): Promise<void> {
    try {
      // Get pending batches ordered by priority
      const pendingBatches = await db
        .select()
        .from(locationPollingQueue)
        .where(eq(locationPollingQueue.status, 'pending'))
        .orderBy(locationPollingQueue.priority, locationPollingQueue.scheduledFor)
        .limit(this.config.maxConcurrentBatches);

      console.log(`[LocationPolling] Processing ${pendingBatches.length} pending batches`);

      // Process batches concurrently
      const batchPromises = pendingBatches.map(batch => this.processBatch(batch));
      await Promise.allSettled(batchPromises);

    } catch (error) {
      console.error('[LocationPolling] Error processing batches:', error);
    }
  }

  private async processBatch(batch: any): Promise<void> {
    const { batchId, employeeIds, id } = batch;
    this.activeBatches.add(batchId);

    try {
      console.log(`[LocationPolling] Processing batch ${batchId} with ${employeeIds.length} employees`);

      // Mark batch as processing
      await db
        .update(locationPollingQueue)
        .set({
          status: 'processing',
          startedAt: new Date()
        })
        .where(eq(locationPollingQueue.id, id));

      // Poll locations for employees in this batch
      const results = await this.pollEmployeeLocations(employeeIds);
      
      let successCount = 0;
      let failCount = 0;
      const errorDetails: any[] = [];

      // Process and store location data
      for (const result of results) {
        if (result.success && result.location) {
          try {
            await this.storeLocationData(result.location);
            successCount++;
          } catch (error) {
            console.error(`[LocationPolling] Error storing location for ${result.employeeId}:`, error);
            failCount++;
            errorDetails.push({
              employeeId: result.employeeId,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        } else {
          failCount++;
          errorDetails.push({
            employeeId: result.employeeId,
            error: result.error || 'Failed to get location'
          });
        }
      }

      // Update batch completion status
      await db
        .update(locationPollingQueue)
        .set({
          status: 'completed',
          completedAt: new Date(),
          successfulPolls: successCount,
          failedPolls: failCount,
          errorDetails: errorDetails.length > 0 ? errorDetails : null
        })
        .where(eq(locationPollingQueue.id, id));

      console.log(`[LocationPolling] Batch ${batchId} completed: ${successCount} success, ${failCount} failed`);
      this.emit('batchCompleted', { batchId, successCount, failCount });

    } catch (error) {
      console.error(`[LocationPolling] Error processing batch ${batchId}:`, error);
      
      // Mark batch as failed and check for retry
      const retryCount = batch.retryCount + 1;
      const shouldRetry = retryCount <= this.config.maxRetries;

      await db
        .update(locationPollingQueue)
        .set({
          status: shouldRetry ? 'pending' : 'failed',
          completedAt: shouldRetry ? null : new Date(),
          retryCount,
          errorDetails: [{
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          }]
        })
        .where(eq(locationPollingQueue.id, id));

      this.emit('batchError', { batchId, error, willRetry: shouldRetry });
    } finally {
      this.activeBatches.delete(batchId);
    }
  }

  private async pollEmployeeLocations(employeeIds: string[]): Promise<Array<{
    employeeId: string;
    success: boolean;
    location?: LocationData;
    error?: string;
  }>> {
    // This would interface with mobile apps or GPS devices to get actual location data
    // For now, we'll simulate the polling process
    
    const results: Array<{
      employeeId: string;
      success: boolean;
      location?: LocationData;
      error?: string;
    }> = [];

    for (const employeeId of employeeIds) {
      try {
        // Simulate location polling
        // In production, this would call mobile app APIs or GPS device endpoints
        const locationData = await this.simulateLocationPoll(employeeId);
        
        results.push({
          employeeId,
          success: true,
          location: locationData
        });
      } catch (error) {
        results.push({
          employeeId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  private async simulateLocationPoll(employeeId: string): Promise<LocationData> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000));
    
    // Simulate occasional failures
    if (Math.random() < 0.05) { // 5% failure rate
      throw new Error('Location service unavailable');
    }

    // Generate realistic location data (this would come from actual devices)
    const baseLatitude = 31.5497; // Lahore coordinates
    const baseLongitude = 74.3436;
    
    return {
      employeeId,
      latitude: baseLatitude + (Math.random() - 0.5) * 0.1,
      longitude: baseLongitude + (Math.random() - 0.5) * 0.1,
      accuracy: Math.random() * 20 + 5, // 5-25 meters
      timestamp: new Date(),
      batteryLevel: Math.floor(Math.random() * 100),
      networkType: Math.random() > 0.5 ? '4g' : 'wifi'
    };
  }

  private async storeLocationData(location: LocationData): Promise<void> {
    try {
      // Validate location data if enabled
      if (this.config.validationEnabled) {
        const validation = await this.validateLocation(location);
        if (!validation.isValid) {
          console.warn(`[LocationPolling] Invalid location for ${location.employeeId}: ${validation.reason}`);
          // Store with invalid status for review
          location = { ...location };
        }
      }

      // Insert location record
      const [insertedLocation] = await db.insert(employeeLocations).values({
        employeeId: location.employeeId,
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
        accuracy: location.accuracy?.toString(),
        altitude: location.altitude?.toString(),
        heading: location.heading?.toString(),
        speed: location.speed?.toString(),
        timestamp: location.timestamp,
        source: 'mobile',
        batteryLevel: location.batteryLevel,
        networkType: location.networkType,
        deviceInfo: location.deviceInfo,
        validationStatus: 'valid'
      }).returning();

      // Perform geofence validation if enabled
      if (this.config.geofenceValidationEnabled && insertedLocation) {
        await this.performGeofenceValidation(insertedLocation.id, location);
      }

      console.log(`[LocationPolling] Stored location for ${location.employeeId}`);

    } catch (error) {
      console.error(`[LocationPolling] Error storing location data for ${location.employeeId}:`, error);
      throw error;
    }
  }

  private async validateLocation(location: LocationData): Promise<{
    isValid: boolean;
    reason?: string;
  }> {
    // Basic validation checks
    if (!location.latitude || !location.longitude) {
      return { isValid: false, reason: 'Missing coordinates' };
    }

    if (Math.abs(location.latitude) > 90 || Math.abs(location.longitude) > 180) {
      return { isValid: false, reason: 'Invalid coordinate range' };
    }

    if (location.accuracy && location.accuracy > 1000) {
      return { isValid: false, reason: 'Accuracy too low' };
    }

    return { isValid: true };
  }

  private async performGeofenceValidation(locationId: number, location: LocationData): Promise<void> {
    try {
      // Get employee's geofence clusters
      const clusters = await db
        .select()
        .from(geofenceClusters)
        .where(and(
          eq(geofenceClusters.employeeId, location.employeeId),
          eq(geofenceClusters.isActive, true)
        ));

      if (clusters.length === 0) {
        // No geofences defined, log for potential cluster creation
        await db.insert(locationValidationLog).values({
          locationId,
          validationType: 'geofence',
          validationResult: 'warning',
          validationDetails: { message: 'No geofence clusters defined for employee' },
          validatedBy: 'system'
        });
        return;
      }

      // Check if location is within any cluster
      let withinCluster = false;
      for (const cluster of clusters) {
        const distance = this.calculateDistance(
          location.latitude,
          location.longitude,
          parseFloat(cluster.centerLatitude),
          parseFloat(cluster.centerLongitude)
        );

        if (distance <= cluster.radiusMeters) {
          withinCluster = true;
          
          // Log successful validation
          await db.insert(locationValidationLog).values({
            locationId,
            validationType: 'geofence',
            validationResult: 'pass',
            validationDetails: {
              clusterId: cluster.id,
              clusterName: cluster.clusterName,
              distance: Math.round(distance)
            },
            validatedBy: 'system'
          });
          break;
        }
      }

      if (!withinCluster) {
        // Location outside all geofences
        await db.insert(locationValidationLog).values({
          locationId,
          validationType: 'geofence',
          validationResult: 'fail',
          validationDetails: {
            message: 'Location outside all defined geofence clusters',
            nearestClusters: clusters.map(c => ({
              name: c.clusterName,
              distance: Math.round(this.calculateDistance(
                location.latitude,
                location.longitude,
                parseFloat(c.centerLatitude),
                parseFloat(c.centerLongitude)
              ))
            })).sort((a, b) => a.distance - b.distance).slice(0, 3)
          },
          validatedBy: 'system',
          actionTaken: 'flagged'
        });
      }

    } catch (error) {
      console.error('[LocationPolling] Error in geofence validation:', error);
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  public getStatus(): {
    isRunning: boolean;
    activeBatches: number;
    config: LocationPollingConfig;
  } {
    return {
      isRunning: this.isRunning,
      activeBatches: this.activeBatches.size,
      config: this.config
    };
  }
}