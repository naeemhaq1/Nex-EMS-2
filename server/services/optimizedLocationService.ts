import { EventEmitter } from 'events';
import { db } from '../db';
import { configService } from './configService';

interface LocationData {
  employeeId: string;
  timestamp: Date;
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface GeofenceZone {
  id: string;
  name: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  locationType: 'office' | 'field_site' | 'client_site' | 'home';
}

interface ProcessedLocation {
  employeeId: string;
  date: string;
  workSites: string[];
  homeTime: number; // minutes
  workTime: number; // minutes
  travelDistance: number; // meters
  significantLocations: LocationData[];
}

export class OptimizedLocationService extends EventEmitter {
  private geofenceZones: Map<string, GeofenceZone> = new Map();
  private lastProcessedLocation: Map<string, LocationData> = new Map();
  private pendingGeocodingQueue: LocationData[] = [];
  private isProcessingBatch = false;

  constructor() {
    super();
    this.loadGeofenceZones();
    this.scheduleProcessing();
  }

  /**
   * Store raw location data without API calls
   * This is the primary collection method - ZERO cost
   */
  async storeRawLocation(locationData: LocationData): Promise<void> {
    try {
      // Store in raw locations table immediately
      await db.execute(`
        INSERT INTO locations_raw (employee_id, timestamp, latitude, longitude, accuracy, processed)
        VALUES ($1, $2, $3, $4, $5, false)
      `, [
        locationData.employeeId,
        locationData.timestamp,
        locationData.latitude,
        locationData.longitude,
        locationData.accuracy
      ]);

      // Check if this needs immediate processing (geofence entry/exit)
      const requiresProcessing = await this.checkGeofenceEvents(locationData);
      if (requiresProcessing) {
        await this.processLocationImmediate(locationData);
      }

      console.log(`[OptimizedLocation] Stored raw location for ${locationData.employeeId}`);
    } catch (error) {
      console.error('[OptimizedLocation] Error storing raw location:', error);
    }
  }

  /**
   * Check if location is within known geofences (NO API CALLS)
   */
  private async checkGeofenceEvents(location: LocationData): Promise<boolean> {
    const lastLocation = this.lastProcessedLocation.get(location.employeeId);

    for (const [zoneId, zone] of this.geofenceZones) {
      const distance = this.calculateDistance(
        location.latitude, location.longitude,
        zone.centerLat, zone.centerLng
      );

      const isInZone = distance <= zone.radiusMeters;

      // Check if this is a geofence entry/exit event
      if (lastLocation) {
        const lastDistance = this.calculateDistance(
          lastLocation.latitude, lastLocation.longitude,
          zone.centerLat, zone.centerLng
        );
        const wasInZone = lastDistance <= zone.radiusMeters;

        if (isInZone !== wasInZone) {
          // Geofence entry/exit - this needs immediate processing
          console.log(`[OptimizedLocation] Geofence ${isInZone ? 'entry' : 'exit'}: ${zone.name}`);
          return true;
        }
      }
    }

    // Check for significant movement (>500m)
    if (lastLocation) {
      const movement = this.calculateDistance(
        location.latitude, location.longitude,
        lastLocation.latitude, lastLocation.longitude
      );

      if (movement > 500) { // 500 meters threshold
        return true;
      }
    }

    this.lastProcessedLocation.set(location.employeeId, location);
    return false;
  }

  /**
   * Process location immediately for geofence events (minimal API usage)
   */
  private async processLocationImmediate(location: LocationData): Promise<void> {
    // Only process if it's not in a known geofence
    const knownZone = this.findKnownGeofence(location.latitude, location.longitude);

    if (!knownZone) {
      // Queue for batch geocoding later
      this.pendingGeocodingQueue.push(location);
      console.log(`[OptimizedLocation] Queued for batch processing: ${location.employeeId}`);
    } else {
      // Process with known zone data (no API call needed)
      await this.storeProcessedLocation(location, knownZone.name, knownZone.locationType);
    }
  }

  /**
   * Find if location is within any known geofence
   */
  private findKnownGeofence(lat: number, lng: number): GeofenceZone | null {
    for (const [zoneId, zone] of this.geofenceZones) {
      const distance = this.calculateDistance(lat, lng, zone.centerLat, zone.centerLng);
      if (distance <= zone.radiusMeters) {
        return zone;
      }
    }
    return null;
  }

  /**
   * Batch process pending locations during off-hours
   * This is where we make minimal Google API calls
   */
  private async processBatch(): Promise<void> {
    if (this.isProcessingBatch || this.pendingGeocodingQueue.length === 0) {
      return;
    }

    this.isProcessingBatch = true;
    console.log(`[OptimizedLocation] Processing batch of ${this.pendingGeocodingQueue.length} locations`);

    try {
      // Process in chunks to stay under API limits
      const batchSize = 50;
      const totalBatches = Math.ceil(this.pendingGeocodingQueue.length / batchSize);

      for (let i = 0; i < totalBatches; i++) {
        const batch = this.pendingGeocodingQueue.slice(i * batchSize, (i + 1) * batchSize);

        // Group by approximate location to reduce API calls
        const locationClusters = this.clusterNearbyLocations(batch);

        for (const cluster of locationClusters) {
          // Only make one API call per cluster
          const representativeLocation = cluster[0];
          const locationInfo = await this.geocodeLocation(
            representativeLocation.latitude,
            representativeLocation.longitude
          );

          // Apply results to all locations in cluster
          for (const location of cluster) {
            await this.storeProcessedLocation(location, locationInfo.name, locationInfo.type);
          }
        }

        // Rate limiting: wait between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Clear the queue
      this.pendingGeocodingQueue = [];

    } catch (error) {
      console.error('[OptimizedLocation] Batch processing error:', error);
    } finally {
      this.isProcessingBatch = false;
    }
  }

  /**
   * Group nearby locations to minimize API calls
   */
  private clusterNearbyLocations(locations: LocationData[]): LocationData[][] {
    const clusters: LocationData[][] = [];
    const processed = new Set<number>();
    const clusterRadius = 100; // 100 meters

    for (let i = 0; i < locations.length; i++) {
      if (processed.has(i)) continue;

      const cluster = [locations[i]];
      processed.add(i);

      for (let j = i + 1; j < locations.length; j++) {
        if (processed.has(j)) continue;

        const distance = this.calculateDistance(
          locations[i].latitude, locations[i].longitude,
          locations[j].latitude, locations[j].longitude
        );

        if (distance <= clusterRadius) {
          cluster.push(locations[j]);
          processed.add(j);
        }
      }

      clusters.push(cluster);
    }

    return clusters;
  }

  /**
   * Make actual Google API call (used sparingly)
   */
  private async geocodeLocation(lat: number, lng: number): Promise<{name: string, type: string}> {
    // This is where you'd make the Google API call
    // For now, return a placeholder - implement actual geocoding when needed
    return {
      name: `Location ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      type: 'unknown'
    };
  }

  /**
   * Store processed location data
   */
  private async storeProcessedLocation(location: LocationData, locationName: string, locationType: string): Promise<void> {
    await db.execute(`
      INSERT INTO locations_processed (employee_id, timestamp, latitude, longitude, location_name, location_type)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (employee_id, timestamp) DO UPDATE SET
        location_name = EXCLUDED.location_name,
        location_type = EXCLUDED.location_type
    `, [
      location.employeeId,
      location.timestamp,
      location.latitude,
      location.longitude,
      locationName,
      locationType
    ]);
  }

  /**
   * Get locations for map display (optimized for viewing)
   * Returns cached processed data instead of making new API calls
   */
  async getLocationsForMap(employeeIds: string[], date: string): Promise<any[]> {
    const locations = await db.execute(`
      SELECT 
        employee_id,
        latitude,
        longitude,
        location_name,
        location_type,
        timestamp
      FROM locations_processed 
      WHERE employee_id = ANY(?) 
        AND DATE(timestamp) = ?
      ORDER BY timestamp DESC
    `, [employeeIds, date]);

    return (locations as any).rows || [];
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  /**
   * Load known geofence zones from database
   */
  private async loadGeofenceZones(): Promise<void> {
    try {
      const zones = await db.execute(`
        SELECT id, name, center_lat, center_lng, radius_meters, location_type 
        FROM geofences 
        WHERE active = true
      `);

      for (const zone of zones.rows || []) {
        this.geofenceZones.set(zone.id, {
          id: zone.id,
          name: zone.name,
          centerLat: zone.center_lat,
          centerLng: zone.center_lng,
          radiusMeters: zone.radius_meters,
          locationType: zone.location_type
        });
      }

      console.log(`[OptimizedLocation] Loaded ${this.geofenceZones.size} geofence zones`);
    } catch (error) {
      console.error('[OptimizedLocation] Error loading geofence zones:', error);
    }
  }

  /**
   * Schedule batch processing during off-hours
   */
  private scheduleProcessing(): void {
    // Process batch every hour at :00 minutes
    const scheduleNext = () => {
      const now = new Date();
      const nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0);
      const msUntilNextHour = nextHour.getTime() - now.getTime();

      setTimeout(() => {
        this.processBatch();
        scheduleNext(); // Schedule next batch
      }, msUntilNextHour);
    };

    scheduleNext();
    console.log('[OptimizedLocation] Batch processing scheduled');
  }
}

export const optimizedLocationService = new OptimizedLocationService();