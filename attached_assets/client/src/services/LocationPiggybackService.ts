/**
 * Location Piggyback Service - Integrates GPS and BLE proximity for comprehensive location tracking
 */

import { bluetoothProximityService } from './BluetoothProximityService';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  source: 'N' | 'P' | 'D'; // Normal, Proximity, Delayed
  proximityEmployeeId?: string;
  bluetoothDeviceId?: string;
  timestamp: Date;
  platform?: string;
}

export interface AttendanceLocationData extends LocationData {
  employeeCode: string;
  checkType: 'in' | 'out';
  deviceInfo?: any;
}

class LocationPiggybackService {
  private currentEmployee: { id: string; code: string; name: string } | null = null;
  private networkQueue: AttendanceLocationData[] = [];
  private syncInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize the service with current employee info
   */
  async initialize(employee: { id: string; code: string; name: string }): Promise<void> {
    this.currentEmployee = employee;
    
    // Initialize Bluetooth proximity service
    await bluetoothProximityService.initialize(employee);
    bluetoothProximityService.startScanning();
    
    // Start network sync for delayed data
    this.startNetworkSync();
    
    console.log('🔄 Location Piggyback Service initialized for:', employee.code);
  }

  /**
   * Get navigation data from nearby devices (NOT for attendance - location services required for punch)
   */
  async getNavigationDataFromNearbyDevices(): Promise<LocationData | null> {
    console.log('🗺️ Getting navigation data from nearby mobile devices...');
    
    try {
      // Try location piggyback via BLE proximity for navigation only
      const piggybackLocation = await bluetoothProximityService.attemptLocationPiggyback();
      
      if (piggybackLocation) {
        console.log('🔵 Navigation data obtained from nearby device');
        return piggybackLocation;
      }

      console.log('📡 No nearby devices with location data found');
      return null;

    } catch (error) {
      console.error('❌ Error getting navigation data:', error);
      return null;
    }
  }

  /**
   * Get location for attendance - REQUIRES actual GPS location services enabled
   */
  async getLocationForAttendance(employeeCode: string, checkType: 'in' | 'out'): Promise<AttendanceLocationData | null> {
    console.log(`📍 Getting location for ${checkType} punch for employee: ${employeeCode}`);
    
    try {
      // ONLY GPS location allowed for attendance - no piggyback mode
      const gpsLocation = await this.tryGetGPSLocation();
      if (gpsLocation) {
        console.log('✅ GPS location obtained successfully for attendance');
        return {
          ...gpsLocation,
          employeeCode,
          checkType,
          source: 'N', // Normal GPS only
          deviceInfo: this.getDeviceInfo()
        };
      }

      // NO PIGGYBACK FOR ATTENDANCE - user must enable location services
      console.log('❌ GPS required for attendance - piggyback mode not allowed for punch in/out');
      return null;

    } catch (error) {
      console.error('❌ Error getting GPS location for attendance:', error);
      return null;
    }
  }

  /**
   * Try to get GPS location using the existing cross-platform implementation
   */
  private async tryGetGPSLocation(): Promise<LocationData | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.log('🚫 Geolocation not supported');
        resolve(null);
        return;
      }

      // Platform-specific timeout settings
      const platform = this.detectPlatform();
      const timeouts = {
        'iOS': 10000,
        'Android': 20000,
        'Desktop': 25000,
        'WebApp': 15000
      };

      const timeout = timeouts[platform] || 15000;

      const options = {
        enableHighAccuracy: true,
        timeout: timeout,
        maximumAge: platform === 'iOS' ? 30000 : 60000 // iOS: 30s, Others: 60s
      };

      console.log(`🎯 Getting GPS location for ${platform} with ${timeout}ms timeout`);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            source: 'N',
            timestamp: new Date(),
            platform: platform
          };

          // Store for fallback
          this.storeLocation(location);
          
          console.log(`✅ GPS location obtained: ${location.latitude}, ${location.longitude} (±${location.accuracy}m)`);
          resolve(location);
        },
        (error) => {
          console.log(`❌ GPS failed: ${error.message}`);
          resolve(null);
        },
        options
      );
    });
  }

  /**
   * Detect current platform for optimized GPS settings
   */
  private detectPlatform(): 'iOS' | 'Android' | 'Desktop' | 'WebApp' {
    const userAgent = navigator.userAgent;
    
    if (/iPhone|iPad|iPod/.test(userAgent)) return 'iOS';
    if (/Android/.test(userAgent)) return 'Android';
    if (window.matchMedia('(display-mode: standalone)').matches) return 'WebApp';
    return 'Desktop';
  }

  /**
   * Store location for fallback use
   */
  private storeLocation(location: LocationData): void {
    const stored = {
      lat: location.latitude,
      lng: location.longitude,
      accuracy: location.accuracy,
      timestamp: Date.now(),
      platform: location.platform
    };

    // Store in multiple keys for compatibility
    localStorage.setItem('lastKnownLocation', JSON.stringify(stored));
    localStorage.setItem('headerLastKnownLocation', JSON.stringify(stored));
    
    if (this.currentEmployee?.code) {
      localStorage.setItem(`employee_${this.currentEmployee.code}_location`, JSON.stringify(stored));
    }
  }

  /**
   * Get stored location as fallback
   */
  private getStoredLocation(): LocationData | null {
    try {
      const sources = [
        'lastKnownLocation',
        'headerLastKnownLocation',
        'adminLastKnownLocation',
        'desktopAdminLastKnownLocation'
      ];

      for (const source of sources) {
        const stored = localStorage.getItem(source);
        if (stored) {
          const location = JSON.parse(stored);
          // Check if location is recent (within 6 hours)
          if (Date.now() - location.timestamp < 6 * 60 * 60 * 1000) {
            return {
              latitude: location.lat,
              longitude: location.lng,
              accuracy: location.accuracy + 50, // Add uncertainty for old data
              source: 'D',
              timestamp: new Date(),
              platform: location.platform
            };
          }
        }
      }
    } catch (error) {
      console.error('Error getting stored location:', error);
    }
    return null;
  }

  /**
   * Get device information for tracking
   */
  private getDeviceInfo(): any {
    return {
      userAgent: navigator.userAgent,
      platform: this.detectPlatform(),
      timestamp: new Date().toISOString(),
      bluetooth: !!navigator.bluetooth,
      geolocation: !!navigator.geolocation,
      deviceId: bluetoothProximityService.getDeviceId()
    };
  }

  /**
   * Queue attendance data for delayed network sync
   */
  queueForDelayedSync(data: AttendanceLocationData): void {
    data.source = 'D';
    this.networkQueue.push(data);
    console.log(`📋 Queued attendance data for delayed sync: ${data.employeeCode} ${data.checkType}`);
  }

  /**
   * Start network synchronization for delayed data
   */
  private startNetworkSync(): void {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(async () => {
      if (this.networkQueue.length > 0 && navigator.onLine) {
        await this.syncQueuedData();
      }
    }, 30000); // Sync every 30 seconds
  }

  /**
   * Sync queued data when network is available
   */
  private async syncQueuedData(): Promise<void> {
    if (this.networkQueue.length === 0) return;

    console.log(`🔄 Syncing ${this.networkQueue.length} queued attendance records...`);

    const toSync = [...this.networkQueue];
    this.networkQueue = [];

    for (const data of toSync) {
      try {
        await this.sendAttendanceData(data);
        console.log(`✅ Synced delayed attendance: ${data.employeeCode} ${data.checkType}`);
      } catch (error) {
        console.error(`❌ Failed to sync delayed attendance: ${data.employeeCode} ${data.checkType}`, error);
        // Re-queue failed items
        this.networkQueue.push(data);
      }
    }
  }

  /**
   * Send attendance data to server
   */
  private async sendAttendanceData(data: AttendanceLocationData): Promise<void> {
    const response = await fetch('/api/mobile-attendance/punch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        checkType: data.checkType,
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy,
        locationSource: data.source,
        proximityEmployeeId: data.proximityEmployeeId,
        bluetoothDeviceId: data.bluetoothDeviceId,
        deviceInfo: data.deviceInfo
      })
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
  }

  /**
   * Get proximity statistics
   */
  getProximityStats(): { nearbyCount: number; deviceId: string } {
    return {
      nearbyCount: bluetoothProximityService.getNearbyCount(),
      deviceId: bluetoothProximityService.getDeviceId()
    };
  }

  /**
   * Stop the service
   */
  stop(): void {
    bluetoothProximityService.stopScanning();
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    console.log('🛑 Location Piggyback Service stopped');
  }
}

export const locationPiggybackService = new LocationPiggybackService();