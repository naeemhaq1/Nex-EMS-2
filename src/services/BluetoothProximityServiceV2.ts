/**
 * Bluetooth Proximity Service V2 - Detects ANY mobile device nearby
 * Navigation data only - NOT for attendance (requires actual GPS for punch in/out)
 */

interface NearbyDevice {
  id: string;
  name: string;
  rssi: number;
  lastSeen: number;
  employeeId?: string;
  username?: string;
  isSystemUser: boolean;
  isAnonymous: boolean;
  hasLocation: boolean;
  locationFlag: 'N' | 'A'; // N=Named system user, A=Anonymous device
}

interface ProximityLocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  source: 'P'; // Proximity/Piggyback
  proximityDeviceId: string;
  proximityFlag: 'N' | 'A'; // N=Named user, A=Anonymous device
  proximityUsername?: string;
  timestamp: Date;
}

class BluetoothProximityServiceV2 {
  private isScanning = false;
  private nearbyDevices = new Map<string, NearbyDevice>();
  private scanInterval: NodeJS.Timeout | null = null;
  private deviceId: string;
  private bluetoothSupported = false;

  constructor() {
    this.deviceId = this.generateDeviceId();
    this.bluetoothSupported = !!navigator.bluetooth;
    console.log('🔵 Bluetooth Proximity Service V2 initialized - Any device detection enabled');
  }

  /**
   * Generate unique device identifier
   */
  private generateDeviceId(): string {
    const platform = navigator.userAgent.includes('iPhone') ? 'iOS' : 
                    navigator.userAgent.includes('Android') ? 'Android' : 'Web';
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${platform}-${timestamp}-${random}`;
  }

  /**
   * Check if device name indicates a system user
   */
  private isSystemUserDevice(deviceName: string | null): boolean {
    if (!deviceName) return false;
    
    const systemIndicators = [
      'Employee', 'EMS', 'NEXLINX', 'Admin', 'Manager', 'Staff'
    ];
    
    return systemIndicators.some(indicator => 
      deviceName.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  /**
   * Extract username from system user device name
   */
  private extractUsername(deviceName: string): string | undefined {
    // Look for patterns like "Employee-John", "EMS-AdminUser", etc.
    const match = deviceName.match(/(Employee|EMS|NEXLINX|Admin|Manager|Staff)[-_]?(.+)/i);
    return match ? match[2] : undefined;
  }

  /**
   * Start scanning for ANY nearby mobile devices
   */
  async startScanning(): Promise<void> {
    if (this.isScanning) return;

    console.log('🔵 Starting scan for ANY nearby mobile devices...');
    this.isScanning = true;

    // Start fallback scanning (works without Web Bluetooth)
    this.startFallbackScanning();

    // Also try Web Bluetooth if supported
    if (this.bluetoothSupported) {
      this.startBluetoothScanning();
    }
  }

  /**
   * Fallback scanning using localStorage and API detection
   */
  private startFallbackScanning(): void {
    console.log('📡 Starting fallback device detection...');
    
    this.scanInterval = setInterval(() => {
      this.scanForNearbyDevices();
    }, 10000); // Scan every 10 seconds
  }

  /**
   * Web Bluetooth scanning (if supported)
   */
  private async startBluetoothScanning(): Promise<void> {
    try {
      // Scan for any mobile devices
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service', 'device_information']
      });

      if (device) {
        const isSystemUser = this.isSystemUserDevice(device.name);
        const username = isSystemUser ? this.extractUsername(device.name || '') : undefined;
        
        const deviceInfo: NearbyDevice = {
          id: device.id,
          name: device.name || 'Unknown Device',
          rssi: -50, // Estimated
          lastSeen: Date.now(),
          employeeId: username,
          username: username,
          isSystemUser: isSystemUser,
          isAnonymous: !isSystemUser,
          hasLocation: true,
          locationFlag: isSystemUser ? 'N' : 'A'
        };

        console.log(`🔍 Detected device: ${device.name} ${isSystemUser ? `(User: ${username})` : '(Anonymous)'}`, deviceInfo);
        this.nearbyDevices.set(device.id, deviceInfo);
      }
    } catch (error) {
      console.log('🔵 Web Bluetooth not available or permission denied, using fallback only');
    }
  }

  /**
   * Scan for nearby devices using API and localStorage detection
   */
  private async scanForNearbyDevices(): Promise<void> {
    try {
      // Check localStorage for other device presence
      this.scanLocalStorage();
      
      // Check API for nearby devices
      await this.scanViaAPI();
      
      // Clean up old devices (older than 5 minutes)
      this.cleanupOldDevices();
      
    } catch (error) {
      console.error('❌ Error scanning for nearby devices:', error);
    }
  }

  /**
   * Scan localStorage for other device presence
   */
  private scanLocalStorage(): void {
    const keys = Object.keys(localStorage);
    const presenceKeys = keys.filter(key => key.startsWith('nexlinx_presence_'));
    
    presenceKeys.forEach(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        const age = Date.now() - data.timestamp;
        
        // Consider devices active if seen within last 5 minutes
        if (age < 5 * 60 * 1000) {
          const isSystemUser = !!data.employeeCode;
          
          const deviceInfo: NearbyDevice = {
            id: data.deviceId || key,
            name: isSystemUser ? `EMS-${data.employeeCode}` : 'Anonymous Device',
            rssi: -60, // Estimated for localStorage detection
            lastSeen: data.timestamp,
            employeeId: data.employeeCode,
            username: data.employeeCode,
            isSystemUser: isSystemUser,
            isAnonymous: !isSystemUser,
            hasLocation: !!data.location,
            locationFlag: isSystemUser ? 'N' : 'A'
          };
          
          this.nearbyDevices.set(deviceInfo.id, deviceInfo);
          console.log(`📱 Found nearby device via localStorage: ${deviceInfo.name} (${deviceInfo.locationFlag})`);
        }
      } catch (error) {
        console.error('Error parsing localStorage presence data:', error);
      }
    });
  }

  /**
   * Scan via API for nearby devices
   */
  private async scanViaAPI(): Promise<void> {
    try {
      const response = await fetch('/api/bluetooth-proximity/nearby', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const nearbyDevices = await response.json();
        nearbyDevices.forEach((device: any) => {
          const isSystemUser = !!device.username;
          
          const deviceInfo: NearbyDevice = {
            id: device.deviceId,
            name: isSystemUser ? `User-${device.username}` : 'Anonymous Device',
            rssi: device.rssi || -70,
            lastSeen: device.lastSeen,
            employeeId: device.username,
            username: device.username,
            isSystemUser: isSystemUser,
            isAnonymous: !isSystemUser,
            hasLocation: device.hasLocation,
            locationFlag: isSystemUser ? 'N' : 'A'
          };
          
          this.nearbyDevices.set(deviceInfo.id, deviceInfo);
          console.log(`🌐 Found nearby device via API: ${deviceInfo.name} (${deviceInfo.locationFlag})`);
        });
      }
    } catch (error) {
      console.error('Error scanning via API:', error);
    }
  }

  /**
   * Clean up devices not seen recently
   */
  private cleanupOldDevices(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    for (const [id, device] of this.nearbyDevices) {
      if (now - device.lastSeen > maxAge) {
        this.nearbyDevices.delete(id);
        console.log(`🧹 Removed old device: ${device.name}`);
      }
    }
  }

  /**
   * Attempt to get location data from nearby devices (NAVIGATION ONLY - NOT FOR ATTENDANCE)
   */
  async attemptLocationPiggyback(): Promise<ProximityLocationData | null> {
    const devicesWithLocation = Array.from(this.nearbyDevices.values())
      .filter(device => device.hasLocation)
      .sort((a, b) => b.rssi - a.rssi); // Sort by signal strength

    if (devicesWithLocation.length === 0) {
      console.log('📡 No nearby devices with location data');
      return null;
    }

    const bestDevice = devicesWithLocation[0];
    console.log(`🗺️ Getting navigation data from ${bestDevice.isSystemUser ? 'system user' : 'anonymous'} device: ${bestDevice.name}`);

    try {
      // Try to get location from the device
      const location = await this.getLocationFromDevice(bestDevice);
      
      if (location) {
        return {
          latitude: location.lat,
          longitude: location.lng,
          accuracy: location.accuracy + 25, // Add uncertainty for proximity data
          source: 'P',
          proximityDeviceId: bestDevice.id,
          proximityFlag: bestDevice.locationFlag,
          proximityUsername: bestDevice.username,
          timestamp: new Date()
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting location from nearby device:', error);
      return null;
    }
  }

  /**
   * Get location data from a specific device
   */
  private async getLocationFromDevice(device: NearbyDevice): Promise<any> {
    // Try localStorage first
    const storedLocation = localStorage.getItem(`device_location_${device.id}`);
    if (storedLocation) {
      const location = JSON.parse(storedLocation);
      const age = Date.now() - location.timestamp;
      
      if (age < 30 * 60 * 1000) { // Within 30 minutes
        console.log(`📍 Using stored location from ${device.locationFlag === 'N' ? 'system user' : 'anonymous'} device`);
        return location;
      }
    }

    // Try API request
    try {
      const response = await fetch(`/api/bluetooth-proximity/device-location/${device.id}`);
      if (response.ok) {
        const location = await response.json();
        console.log(`🌐 Got location from ${device.locationFlag === 'N' ? 'system user' : 'anonymous'} device via API`);
        return location;
      }
    } catch (error) {
      console.error('Error getting location from API:', error);
    }

    return null;
  }

  /**
   * Get nearby device count
   */
  getNearbyCount(): number {
    return this.nearbyDevices.size;
  }

  /**
   * Get device summary
   */
  getDevicesSummary(): { total: number; systemUsers: number; anonymous: number } {
    const devices = Array.from(this.nearbyDevices.values());
    return {
      total: devices.length,
      systemUsers: devices.filter(d => d.isSystemUser).length,
      anonymous: devices.filter(d => d.isAnonymous).length
    };
  }

  /**
   * Stop scanning
   */
  stopScanning(): void {
    this.isScanning = false;
    
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    
    console.log('🛑 Bluetooth proximity scanning stopped');
  }

  /**
   * Get device ID
   */
  getDeviceId(): string {
    return this.deviceId;
  }
}

export const bluetoothProximityServiceV2 = new BluetoothProximityServiceV2();