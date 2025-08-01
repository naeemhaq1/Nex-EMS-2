/**
 * Location Service for Mobile EMS
 * Handles GPS, BLE, and network-based location detection
 */

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  source: 'gps' | 'ble' | 'network' | 'ip';
}

interface BLEBeacon {
  id: string;
  name: string;
  rssi: number;
  location: {
    latitude: number;
    longitude: number;
  };
}

class LocationService {
  private lastKnownLocation: LocationData | null = null;
  private bleBeacons: BLEBeacon[] = [];
  private watchId: number | null = null;

  async getCurrentLocation(): Promise<LocationData> {
    // Try GPS first
    try {
      const gpsLocation = await this.getGPSLocation();
      this.lastKnownLocation = gpsLocation;
      return gpsLocation;
    } catch (gpsError) {
      console.warn('GPS failed:', gpsError);
      
      // Try BLE if GPS fails
      try {
        const bleLocation = await this.getBLELocation();
        this.lastKnownLocation = bleLocation;
        return bleLocation;
      } catch (bleError) {
        console.warn('BLE failed:', bleError);
        
        // Try network-based location
        try {
          const networkLocation = await this.getNetworkLocation();
          this.lastKnownLocation = networkLocation;
          return networkLocation;
        } catch (networkError) {
          console.warn('Network location failed:', networkError);
          
          // If all methods fail, throw error
          throw new Error('Unable to determine location using any method');
        }
      }
    }
  }

  async getGPSLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now(),
            source: 'gps'
          });
        },
        (error) => {
          reject(new Error(`GPS error: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  }

  async getBLELocation(): Promise<LocationData> {
    if (!('bluetooth' in navigator)) {
      throw new Error('Bluetooth not supported');
    }

    try {
      // Request Bluetooth permission and scan for beacons
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service']
      });

      // Simulate BLE beacon detection
      // In a real implementation, you would scan for known beacons
      const nearbyBeacons = await this.scanForBeacons();
      
      if (nearbyBeacons.length === 0) {
        throw new Error('No known BLE beacons found');
      }

      // Use strongest signal beacon for location
      const strongestBeacon = nearbyBeacons.reduce((prev, current) => 
        current.rssi > prev.rssi ? current : prev
      );

      return {
        latitude: strongestBeacon.location.latitude,
        longitude: strongestBeacon.location.longitude,
        accuracy: this.estimateAccuracyFromRSSI(strongestBeacon.rssi),
        timestamp: Date.now(),
        source: 'ble'
      };
    } catch (error) {
      throw new Error(`BLE error: ${error}`);
    }
  }

  async getNetworkLocation(): Promise<LocationData> {
    try {
      // Use network-based location (IP geolocation)
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      
      if (data.latitude && data.longitude) {
        return {
          latitude: data.latitude,
          longitude: data.longitude,
          accuracy: 10000, // Network location is less accurate
          timestamp: Date.now(),
          source: 'network'
        };
      } else {
        throw new Error('Invalid network location data');
      }
    } catch (error) {
      throw new Error(`Network location error: ${error}`);
    }
  }

  async getAlternativeLocation(): Promise<LocationData> {
    // Try BLE and network methods when GPS is off
    try {
      return await this.getBLELocation();
    } catch (bleError) {
      return await this.getNetworkLocation();
    }
  }

  private async scanForBeacons(): Promise<BLEBeacon[]> {
    // Simulate known office beacons
    // In a real implementation, you would scan for actual BLE beacons
    const knownBeacons: BLEBeacon[] = [
      {
        id: 'beacon_office_main',
        name: 'Office Main Entrance',
        rssi: -45,
        location: {
          latitude: 31.5204,
          longitude: 74.3587
        }
      },
      {
        id: 'beacon_office_floor2',
        name: 'Office Floor 2',
        rssi: -65,
        location: {
          latitude: 31.5205,
          longitude: 74.3588
        }
      }
    ];

    // Simulate detection based on random factors
    return knownBeacons.filter(() => Math.random() > 0.5);
  }

  private estimateAccuracyFromRSSI(rssi: number): number {
    // Estimate accuracy based on signal strength
    // Stronger signal = better accuracy
    if (rssi > -50) return 5;
    if (rssi > -70) return 15;
    if (rssi > -90) return 50;
    return 100;
  }

  startWatchingLocation(callback: (location: LocationData) => void): void {
    if (this.watchId) {
      this.stopWatchingLocation();
    }

    if (navigator.geolocation) {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          const location: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now(),
            source: 'gps'
          };
          this.lastKnownLocation = location;
          callback(location);
        },
        (error) => {
          console.error('Location watch error:', error);
          // Try alternative methods
          this.getAlternativeLocation()
            .then(callback)
            .catch(console.error);
        },
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 60000
        }
      );
    }
  }

  stopWatchingLocation(): void {
    if (this.watchId && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  getLastKnownLocation(): LocationData | null {
    return this.lastKnownLocation;
  }

  async isLocationAvailable(): Promise<boolean> {
    try {
      await this.getCurrentLocation();
      return true;
    } catch {
      return false;
    }
  }

  async getLocationPermissionStatus(): Promise<'granted' | 'denied' | 'prompt'> {
    if (!navigator.permissions) {
      return 'prompt';
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      return permission.state;
    } catch {
      return 'prompt';
    }
  }

  async requestLocationPermission(): Promise<boolean> {
    try {
      await this.getGPSLocation();
      return true;
    } catch {
      return false;
    }
  }

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }

  async validateLocationForPunch(location: LocationData): Promise<{
    isValid: boolean;
    reason?: string;
    distance?: number;
  }> {
    // Define allowed locations (office coordinates)
    const allowedLocations = [
      {
        name: 'Main Office',
        latitude: 31.5204,
        longitude: 74.3587,
        radius: 200 // meters
      },
      {
        name: 'Branch Office',
        latitude: 31.5304,
        longitude: 74.3487,
        radius: 150
      }
    ];

    // Check if location is within any allowed area
    for (const allowedLocation of allowedLocations) {
      const distance = this.calculateDistance(
        location.latitude,
        location.longitude,
        allowedLocation.latitude,
        allowedLocation.longitude
      );

      if (distance <= allowedLocation.radius) {
        return {
          isValid: true,
          distance
        };
      }
    }

    // Find closest allowed location
    const distances = allowedLocations.map(loc => ({
      name: loc.name,
      distance: this.calculateDistance(
        location.latitude,
        location.longitude,
        loc.latitude,
        loc.longitude
      )
    }));

    const closest = distances.reduce((prev, current) => 
      current.distance < prev.distance ? current : prev
    );

    return {
      isValid: false,
      reason: `Too far from ${closest.name}`,
      distance: closest.distance
    };
  }
}

export const locationService = new LocationService();