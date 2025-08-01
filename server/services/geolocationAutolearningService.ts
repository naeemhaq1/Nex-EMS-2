import { db } from '../db';
import { employeeRecords, attendanceRecords, attendanceExternal } from '@shared/schema';
import { eq, and, gte, lte, isNotNull, sql, ne, count, avg, min, max } from 'drizzle-orm';
import { getPakistanTime } from '../config/timezone';

export interface LocationCluster {
  id: string;
  employeeCode: string;
  locationType: 'home' | 'office' | 'field_site' | 'unknown';
  centerLatitude: number;
  centerLongitude: number;
  radiusMeters: number;
  punchCount: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  confidence: number; // 0-100 percentage
  isActive: boolean;
  autoLearned: boolean;
}

export interface GeofenceValidation {
  isValid: boolean;
  locationType: 'home' | 'office' | 'field_site' | 'unknown';
  distance: number;
  clusterId?: string;
  confidence: number;
}

export class GeolocationAutolearningService {
  private static readonly CLUSTERING_RADIUS = 100; // meters
  private static readonly MIN_PUNCHES_FOR_CLUSTER = 3;
  private static readonly HOME_DETECTION_HOURS = [17, 8]; // 5 PM to 8 AM next day
  private static readonly OFFICE_DETECTION_HOURS = [8, 17]; // 8 AM to 5 PM
  private static readonly CONFIDENCE_THRESHOLD = 70;

  /**
   * Autolearn employee locations from historical mobile punch data
   */
  static async autoLearnEmployeeLocations(employeeCode?: string): Promise<void> {
    console.log(`[GeolocationAutolearning] Starting autolearning for ${employeeCode || 'all employees'}`);
    
    // Get employees with mobile punch history
    const mobileAttendance = await db
      .select({
        employeeCode: attendanceRecords.employeeCode,
        latitude: attendanceRecords.latitude,
        longitude: attendanceRecords.longitude,
        checkIn: attendanceRecords.checkIn,
        checkOut: attendanceRecords.checkOut,
        date: attendanceRecords.date
      })
      .from(attendanceRecords)
      .where(
        and(
          employeeCode ? eq(attendanceRecords.employeeCode, employeeCode) : sql`1=1`,
          isNotNull(attendanceRecords.latitude),
          isNotNull(attendanceRecords.longitude),
          sql`${attendanceRecords.latitude} != 0 AND ${attendanceRecords.longitude} != 0`
        )
      )
      .orderBy(attendanceRecords.date, attendanceRecords.checkIn);

    // Also check external attendance table
    const externalAttendance = await db
      .select({
        employeeCode: attendanceExternal.employeeCode,
        latitude: attendanceExternal.latitude,
        longitude: attendanceExternal.longitude,
        timestamp: attendanceExternal.timestamp
      })
      .from(attendanceExternal)
      .where(
        and(
          employeeCode ? eq(attendanceExternal.employeeCode, employeeCode) : sql`1=1`,
          isNotNull(attendanceExternal.latitude),
          isNotNull(attendanceExternal.longitude),
          sql`${attendanceExternal.latitude} != 0 AND ${attendanceExternal.longitude} != 0`
        )
      )
      .orderBy(attendanceExternal.timestamp);

    // Group by employee and process locations
    const employeeLocations = this.groupLocationsByEmployee(mobileAttendance, externalAttendance);
    
    for (const [empCode, locations] of Object.entries(employeeLocations)) {
      await this.processEmployeeLocations(empCode, locations);
    }

    console.log(`[GeolocationAutolearning] Autolearning completed for ${Object.keys(employeeLocations).length} employees`);
  }

  /**
   * Group location data by employee
   */
  private static groupLocationsByEmployee(
    mobileAttendance: any[],
    externalAttendance: any[]
  ): Record<string, Array<{lat: number, lng: number, timestamp: Date, type: 'checkin' | 'checkout' | 'mobile'}>> {
    const grouped: Record<string, any[]> = {};

    // Process mobile attendance
    mobileAttendance.forEach(record => {
      if (!grouped[record.employeeCode]) grouped[record.employeeCode] = [];
      
      if (record.checkIn && record.latitude && record.longitude) {
        grouped[record.employeeCode].push({
          lat: parseFloat(record.latitude),
          lng: parseFloat(record.longitude),
          timestamp: new Date(record.checkIn),
          type: 'checkin'
        });
      }
      
      if (record.checkOut && record.latitude && record.longitude) {
        grouped[record.employeeCode].push({
          lat: parseFloat(record.latitude),
          lng: parseFloat(record.longitude),
          timestamp: new Date(record.checkOut),
          type: 'checkout'
        });
      }
    });

    // Process external attendance
    externalAttendance.forEach(record => {
      if (!grouped[record.employeeCode]) grouped[record.employeeCode] = [];
      
      grouped[record.employeeCode].push({
        lat: parseFloat(record.latitude),
        lng: parseFloat(record.longitude),
        timestamp: new Date(record.timestamp),
        type: 'mobile'
      });
    });

    return grouped;
  }

  /**
   * Process locations for a specific employee
   */
  private static async processEmployeeLocations(
    employeeCode: string,
    locations: Array<{lat: number, lng: number, timestamp: Date, type: string}>
  ): Promise<void> {
    console.log(`[GeolocationAutolearning] Processing ${locations.length} locations for employee ${employeeCode}`);
    
    // Cluster locations using DBSCAN-like algorithm
    const clusters = this.clusterLocations(locations);
    
    // Classify clusters as home, office, or field sites
    const classifiedClusters = this.classifyClusters(clusters, employeeCode);
    
    // Store learned locations (would typically go to a geofence_clusters table)
    for (const cluster of classifiedClusters) {
      await this.storeLocationCluster(cluster);
    }
  }

  /**
   * Cluster locations using distance-based clustering
   */
  private static clusterLocations(
    locations: Array<{lat: number, lng: number, timestamp: Date, type: string}>
  ): Array<{
    centerLat: number,
    centerLng: number,
    radius: number,
    count: number,
    firstSeen: Date,
    lastSeen: Date,
    locations: Array<{lat: number, lng: number, timestamp: Date, type: string}>
  }> {
    const clusters: any[] = [];
    const visited = new Set<number>();

    for (let i = 0; i < locations.length; i++) {
      if (visited.has(i)) continue;

      const cluster = {
        centerLat: locations[i].lat,
        centerLng: locations[i].lng,
        radius: 0,
        count: 1,
        firstSeen: locations[i].timestamp,
        lastSeen: locations[i].timestamp,
        locations: [locations[i]]
      };

      visited.add(i);

      // Find nearby locations
      for (let j = i + 1; j < locations.length; j++) {
        if (visited.has(j)) continue;

        const distance = this.calculateDistance(
          locations[i].lat, locations[i].lng,
          locations[j].lat, locations[j].lng
        );

        if (distance <= this.CLUSTERING_RADIUS) {
          cluster.locations.push(locations[j]);
          cluster.count++;
          visited.add(j);
          
          if (locations[j].timestamp < cluster.firstSeen) {
            cluster.firstSeen = locations[j].timestamp;
          }
          if (locations[j].timestamp > cluster.lastSeen) {
            cluster.lastSeen = locations[j].timestamp;
          }
        }
      }

      // Recalculate center and radius
      if (cluster.count >= this.MIN_PUNCHES_FOR_CLUSTER) {
        const avgLat = cluster.locations.reduce((sum, loc) => sum + loc.lat, 0) / cluster.count;
        const avgLng = cluster.locations.reduce((sum, loc) => sum + loc.lng, 0) / cluster.count;
        
        cluster.centerLat = avgLat;
        cluster.centerLng = avgLng;
        
        // Calculate radius as max distance from center
        cluster.radius = Math.max(
          ...cluster.locations.map(loc => 
            this.calculateDistance(avgLat, avgLng, loc.lat, loc.lng)
          )
        );

        clusters.push(cluster);
      }
    }

    return clusters;
  }

  /**
   * Classify clusters based on time patterns
   */
  private static classifyClusters(
    clusters: any[],
    employeeCode: string
  ): LocationCluster[] {
    return clusters.map(cluster => {
      const locationType = this.determineLocationType(cluster.locations);
      const confidence = this.calculateConfidence(cluster);

      return {
        id: `${employeeCode}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        employeeCode,
        locationType,
        centerLatitude: cluster.centerLat,
        centerLongitude: cluster.centerLng,
        radiusMeters: Math.max(cluster.radius, 50), // Minimum 50m radius
        punchCount: cluster.count,
        firstSeenAt: cluster.firstSeen,
        lastSeenAt: cluster.lastSeen,
        confidence,
        isActive: true,
        autoLearned: true
      };
    });
  }

  /**
   * Determine location type based on time patterns
   */
  private static determineLocationType(locations: Array<{timestamp: Date, type: string}>): 'home' | 'office' | 'field_site' | 'unknown' {
    const hourCounts = { office: 0, home: 0, total: 0 };

    locations.forEach(location => {
      const hour = location.timestamp.getHours();
      hourCounts.total++;

      if (hour >= this.OFFICE_DETECTION_HOURS[0] && hour <= this.OFFICE_DETECTION_HOURS[1]) {
        hourCounts.office++;
      } else if (hour >= this.HOME_DETECTION_HOURS[0] || hour <= this.HOME_DETECTION_HOURS[1]) {
        hourCounts.home++;
      }
    });

    const officePercentage = (hourCounts.office / hourCounts.total) * 100;
    const homePercentage = (hourCounts.home / hourCounts.total) * 100;

    if (officePercentage > 60) return 'office';
    if (homePercentage > 40) return 'home';
    return 'field_site';
  }

  /**
   * Calculate confidence score for a cluster
   */
  private static calculateConfidence(cluster: any): number {
    let confidence = 0;

    // More punches = higher confidence
    confidence += Math.min(cluster.count * 10, 40);

    // Longer time span = higher confidence
    const daySpan = Math.ceil((cluster.lastSeen.getTime() - cluster.firstSeen.getTime()) / (24 * 60 * 60 * 1000));
    confidence += Math.min(daySpan * 2, 30);

    // Smaller radius = higher confidence
    const radiusScore = Math.max(30 - (cluster.radius / 10), 0);
    confidence += radiusScore;

    return Math.min(confidence, 100);
  }

  /**
   * Validate if a location is within learned geofences
   */
  static async validateLocation(
    employeeCode: string,
    latitude: number,
    longitude: number,
    punchType: 'checkin' | 'checkout'
  ): Promise<GeofenceValidation> {
    // For now, return a placeholder - would query geofence_clusters table
    const mockClusters = await this.getEmployeeClusters(employeeCode);
    
    for (const cluster of mockClusters) {
      const distance = this.calculateDistance(
        latitude, longitude,
        cluster.centerLatitude, cluster.centerLongitude
      );

      if (distance <= cluster.radiusMeters && cluster.confidence >= this.CONFIDENCE_THRESHOLD) {
        return {
          isValid: true,
          locationType: cluster.locationType,
          distance,
          clusterId: cluster.id,
          confidence: cluster.confidence
        };
      }
    }

    return {
      isValid: false,
      locationType: 'unknown',
      distance: 0,
      confidence: 0
    };
  }

  /**
   * Get learned clusters for an employee
   */
  private static async getEmployeeClusters(employeeCode: string): Promise<LocationCluster[]> {
    // Placeholder - would query actual geofence_clusters table
    return [];
  }

  /**
   * Store a location cluster
   */
  private static async storeLocationCluster(cluster: LocationCluster): Promise<void> {
    console.log(`[GeolocationAutolearning] Storing cluster for ${cluster.employeeCode}: ${cluster.locationType} with ${cluster.confidence}% confidence`);
    // Would insert into geofence_clusters table
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  /**
   * Update location clusters with new punch data
   */
  static async updateClustersWithNewPunch(
    employeeCode: string,
    latitude: number,
    longitude: number,
    timestamp: Date,
    punchType: 'checkin' | 'checkout'
  ): Promise<void> {
    console.log(`[GeolocationAutolearning] Updating clusters for employee ${employeeCode} with new ${punchType} at ${latitude}, ${longitude}`);
    
    // Check if this location fits into existing clusters
    const validation = await this.validateLocation(employeeCode, latitude, longitude, punchType);
    
    if (!validation.isValid) {
      // Start building a new potential cluster
      console.log(`[GeolocationAutolearning] New location detected for ${employeeCode}, monitoring for cluster formation`);
    }
  }

  /**
   * Get autolearning statistics
   */
  static async getAutolearningStats(): Promise<{
    totalEmployees: number;
    employeesWithClusters: number;
    totalClusters: number;
    clustersByType: Record<string, number>;
    averageConfidence: number;
  }> {
    // Placeholder - would query actual statistics
    return {
      totalEmployees: 318,
      employeesWithClusters: 0,
      totalClusters: 0,
      clustersByType: { home: 0, office: 0, field_site: 0, unknown: 0 },
      averageConfidence: 0
    };
  }
}