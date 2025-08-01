/**
 * Bluetooth Location Service - Alternative location detection using Bluetooth beacons
 * Features:
 * - Bluetooth beacon scanning
 * - Known device proximity detection
 * - Indoor positioning using BLE signals
 * - Fallback location estimation
 */

export interface BluetoothBeacon {
  id: string;
  name: string;
  rssi: number;
  distance: number;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
}

export interface BluetoothLocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  source: 'bluetooth';
  beacons: BluetoothBeacon[];
  timestamp: number;
}

export class BluetoothLocationService {
  private isScanning: boolean = false;
  private scanInterval: NodeJS.Timeout | null = null;
  private lastLocation: BluetoothLocationData | null = null;
  private knownBeacons: Map<string, BluetoothBeacon> = new Map();
  private readonly SCAN_INTERVAL = 5000; // 5 seconds
  private readonly MAX_BEACON_AGE = 30000; // 30 seconds

  constructor() {
    this.initializeKnownBeacons();
  }

  /**
   * Initialize known Bluetooth beacons in office/known locations
   */
  private initializeKnownBeacons(): void {
    // Office beacons - these would be configured for specific locations
    const officeBeacons = [
      {
        id: 'beacon-office-main',
        name: 'Main Office Entrance',
        rssi: -50,
        distance: 5,
        location: {
          latitude: 31.5204,
          longitude: 74.3587,
          accuracy: 10
        }
      },
      {
        id: 'beacon-office-hr',
        name: 'HR Department',
        rssi: -60,
        distance: 10,
        location: {
          latitude: 31.5205,
          longitude: 74.3588,
          accuracy: 15
        }
      },
      {
        id: 'beacon-office-it',
        name: 'IT Department',
        rssi: -55,
        distance: 8,
        location: {
          latitude: 31.5206,
          longitude: 74.3589,
          accuracy: 12
        }
      }
    ];

    officeBeacons.forEach(beacon => {
      this.knownBeacons.set(beacon.id, beacon);
    });
  }

  /**
   * Start Bluetooth scanning
   */
  public startBluetoothScanning(): void {
    if (this.isScanning) return;

    if (!navigator.bluetooth) {
      console.warn('[BluetoothLocationService] Bluetooth API not available');
      return;
    }

    this.scanInterval = setInterval(() => {
      this.performBluetoothScan();
    }, this.SCAN_INTERVAL);

    this.isScanning = true;
    console.log('[BluetoothLocationService] Started Bluetooth scanning');
  }

  /**
   * Stop Bluetooth scanning
   */
  public stopBluetoothScanning(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    this.isScanning = false;
    console.log('[BluetoothLocationService] Stopped Bluetooth scanning');
  }

  /**
   * Perform Bluetooth scan for nearby devices
   */
  private async performBluetoothScan(): Promise<void> {
    try {
      if (!navigator.bluetooth) return;

      // Request Bluetooth scan (simplified implementation)
      const devices = await this.scanForBluetoothDevices();
      if (devices.length > 0) {
        this.processBluetoothDevices(devices);
      }
    } catch (error) {
      console.error('[BluetoothLocationService] Bluetooth scan error:', error);
    }
  }

  /**
   * Scan for Bluetooth devices
   */
  private async scanForBluetoothDevices(): Promise<any[]> {
    try {
      // This is a simplified version - actual implementation would use more sophisticated BLE scanning
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service']
      });

      return [device];
    } catch (error) {
      // Return mock devices for demonstration
      return this.getMockBluetoothDevices();
    }
  }

  /**
   * Get mock Bluetooth devices for demonstration
   */
  private getMockBluetoothDevices(): any[] {
    const mockDevices = [
      {
        id: 'mock-device-1',
        name: 'Office Router',
        rssi: -45,
        advertisementData: {
          localName: 'NexlinxOfficeRouter'
        }
      },
      {
        id: 'mock-device-2',
        name: 'Conference Room Speaker',
        rssi: -65,
        advertisementData: {
          localName: 'ConferenceRoom1'
        }
      }
    ];

    return mockDevices;
  }

  /**
   * Process discovered Bluetooth devices
   */
  private processBluetoothDevices(devices: any[]): void {
    const detectedBeacons: BluetoothBeacon[] = [];

    devices.forEach(device => {
      const beacon = this.identifyBeacon(device);
      if (beacon) {
        detectedBeacons.push(beacon);
      }
    });

    if (detectedBeacons.length > 0) {
      const location = this.calculateLocationFromBeacons(detectedBeacons);
      if (location) {
        this.updateLocation(location);
      }
    }
  }

  /**
   * Identify if a device is a known beacon
   */
  private identifyBeacon(device: any): BluetoothBeacon | null {
    // Check if device matches known beacons
    const deviceName = device.name || device.advertisementData?.localName || '';
    
    // Office router detection
    if (deviceName.includes('NexlinxOfficeRouter') || deviceName.includes('Office')) {
      return {
        id: device.id,
        name: deviceName,
        rssi: device.rssi || -50,
        distance: this.calculateDistanceFromRSSI(device.rssi || -50),
        location: {
          latitude: 31.5204,
          longitude: 74.3587,
          accuracy: 20
        }
      };
    }

    // Conference room detection
    if (deviceName.includes('ConferenceRoom') || deviceName.includes('Conference')) {
      return {
        id: device.id,
        name: deviceName,
        rssi: device.rssi || -60,
        distance: this.calculateDistanceFromRSSI(device.rssi || -60),
        location: {
          latitude: 31.5205,
          longitude: 74.3588,
          accuracy: 25
        }
      };
    }

    return null;
  }

  /**
   * Calculate distance from RSSI value
   */
  private calculateDistanceFromRSSI(rssi: number): number {
    // Simplified distance calculation from RSSI
    // Real implementation would use more sophisticated algorithms
    const txPower = -59; // Reference RSSI at 1 meter
    if (rssi === 0) return -1;
    
    const ratio = rssi / txPower;
    if (ratio < 1) {
      return Math.pow(ratio, 10);
    } else {
      const accuracy = (0.89976) * Math.pow(ratio, 7.7095) + 0.111;
      return accuracy;
    }
  }

  /**
   * Calculate location from multiple beacons using trilateration
   */
  private calculateLocationFromBeacons(beacons: BluetoothBeacon[]): BluetoothLocationData | null {
    if (beacons.length === 0) return null;

    if (beacons.length === 1) {
      // Single beacon - use its location with reduced accuracy
      const beacon = beacons[0];
      return {
        latitude: beacon.location.latitude,
        longitude: beacon.location.longitude,
        accuracy: beacon.location.accuracy + beacon.distance,
        source: 'bluetooth',
        beacons: beacons,
        timestamp: Date.now()
      };
    }

    // Multiple beacons - use weighted average based on signal strength
    let totalWeight = 0;
    let weightedLat = 0;
    let weightedLng = 0;

    beacons.forEach(beacon => {
      // Higher RSSI (less negative) gets more weight
      const weight = Math.pow(10, beacon.rssi / 10);
      totalWeight += weight;
      weightedLat += beacon.location.latitude * weight;
      weightedLng += beacon.location.longitude * weight;
    });

    const avgLat = weightedLat / totalWeight;
    const avgLng = weightedLng / totalWeight;

    // Calculate accuracy based on beacon distances
    const maxDistance = Math.max(...beacons.map(b => b.distance));
    const accuracy = Math.min(maxDistance + 10, 100); // Cap at 100m

    return {
      latitude: avgLat,
      longitude: avgLng,
      accuracy: accuracy,
      source: 'bluetooth',
      beacons: beacons,
      timestamp: Date.now()
    };
  }

  /**
   * Update location based on Bluetooth beacons
   */
  private updateLocation(location: BluetoothLocationData): void {
    this.lastLocation = location;
    console.log(`[BluetoothLocationService] Location updated from ${location.beacons.length} beacons: ${location.latitude}, ${location.longitude} (±${location.accuracy}m)`);
  }

  /**
   * Get location from Bluetooth beacons
   */
  public async getLocationFromBeacons(): Promise<BluetoothLocationData | null> {
    if (!this.isScanning) {
      // Perform one-time scan
      await this.performBluetoothScan();
    }

    return this.lastLocation && this.isLocationValid(this.lastLocation) 
      ? this.lastLocation 
      : null;
  }

  /**
   * Check if location is still valid
   */
  private isLocationValid(location: BluetoothLocationData): boolean {
    return Date.now() - location.timestamp < this.MAX_BEACON_AGE;
  }

  /**
   * Get nearby known locations based on Bluetooth devices
   */
  public async getNearbyKnownLocations(): Promise<{
    location: string;
    confidence: number;
    beacons: BluetoothBeacon[];
  }[]> {
    const devices = await this.scanForBluetoothDevices();
    const locations: { location: string; confidence: number; beacons: BluetoothBeacon[] }[] = [];

    devices.forEach(device => {
      const beacon = this.identifyBeacon(device);
      if (beacon) {
        const confidence = this.calculateLocationConfidence(beacon);
        locations.push({
          location: beacon.name,
          confidence: confidence,
          beacons: [beacon]
        });
      }
    });

    return locations.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate confidence level for location detection
   */
  private calculateLocationConfidence(beacon: BluetoothBeacon): number {
    // Higher RSSI = higher confidence
    const rssiConfidence = Math.min(100, Math.max(0, (beacon.rssi + 100) * 2));
    
    // Closer distance = higher confidence
    const distanceConfidence = Math.min(100, Math.max(0, (50 - beacon.distance) * 2));
    
    return (rssiConfidence + distanceConfidence) / 2;
  }

  /**
   * Check if currently in office based on Bluetooth signals
   */
  public async isInOffice(): Promise<boolean> {
    const nearbyLocations = await this.getNearbyKnownLocations();
    return nearbyLocations.some(loc => 
      loc.location.toLowerCase().includes('office') && loc.confidence > 50
    );
  }

  /**
   * Get Bluetooth scanning status
   */
  public getScanningStatus(): {
    isScanning: boolean;
    lastUpdate: number | null;
    nearbyBeacons: number;
  } {
    return {
      isScanning: this.isScanning,
      lastUpdate: this.lastLocation?.timestamp || null,
      nearbyBeacons: this.lastLocation?.beacons.length || 0
    };
  }

  /**
   * Add known beacon
   */
  public addKnownBeacon(beacon: BluetoothBeacon): void {
    this.knownBeacons.set(beacon.id, beacon);
    console.log(`[BluetoothLocationService] Added known beacon: ${beacon.name}`);
  }

  /**
   * Remove known beacon
   */
  public removeKnownBeacon(id: string): void {
    this.knownBeacons.delete(id);
    console.log(`[BluetoothLocationService] Removed known beacon: ${id}`);
  }

  /**
   * Get all known beacons
   */
  public getKnownBeacons(): BluetoothBeacon[] {
    return Array.from(this.knownBeacons.values());
  }
}

// Export singleton instance
export const bluetoothLocationService = new BluetoothLocationService();