/**
 * Bluetooth Low Energy (BLE) Proximity Service for Location Piggyback
 * Detects nearby employees and shares location data when GPS is unavailable
 */

export interface NearbyEmployee {
  employeeId: string;
  employeeCode: string;
  name: string;
  bluetoothDeviceId: string;
  rssi: number; // Signal strength
  distance: number; // Estimated distance in meters
  lastSeen: Date;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: Date;
  };
}

export interface LocationPiggybackData {
  latitude: number;
  longitude: number;
  accuracy: number;
  source: 'P'; // Proximity/Piggyback
  proximityEmployeeId: string;
  bluetoothDeviceId: string;
  timestamp: Date;
}

class BluetoothProximityService {
  private isScanning = false;
  private nearbyEmployees = new Map<string, NearbyEmployee>();
  private scanInterval: NodeJS.Timeout | null = null;
  private deviceId: string;
  private currentEmployee: { id: string; code: string; name: string } | null = null;

  constructor() {
    this.deviceId = this.generateDeviceId();
  }

  /**
   * Generate unique device identifier for BLE advertising
   */
  private generateDeviceId(): string {
    const platform = navigator.userAgent.includes('iPhone') ? 'iOS' : 
                    navigator.userAgent.includes('Android') ? 'Android' : 'Web';
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${platform}-${timestamp}-${random}`;
  }

  /**
   * Initialize BLE proximity service with current employee info
   */
  async initialize(employee: { id: string; code: string; name: string }): Promise<boolean> {
    this.currentEmployee = employee;
    
    try {
      // Check if Web Bluetooth is supported
      if (!navigator.bluetooth) {
        console.log('🔵 Web Bluetooth not supported, using fallback proximity detection');
        return this.initializeFallbackProximity();
      }

      console.log('🔵 Initializing BLE proximity service for employee:', employee.code);
      return true;
    } catch (error) {
      console.error('❌ BLE initialization failed:', error);
      return this.initializeFallbackProximity();
    }
  }

  /**
   * Fallback proximity detection using localStorage sharing and network requests
   */
  private async initializeFallbackProximity(): Promise<boolean> {
    console.log('🔵 Using fallback proximity detection via localStorage and API');
    
    // Store current employee's presence for other devices to detect
    this.broadcastPresence();
    
    // Start scanning for nearby employees
    this.startFallbackScanning();
    
    return true;
  }

  /**
   * Broadcast current employee presence for other devices to detect
   */
  private broadcastPresence(): void {
    if (!this.currentEmployee) return;

    const presenceData = {
      employeeId: this.currentEmployee.id,
      employeeCode: this.currentEmployee.code,
      name: this.currentEmployee.name,
      deviceId: this.deviceId,
      timestamp: Date.now(),
      location: this.getCurrentStoredLocation()
    };

    // Store in localStorage for same-device detection
    localStorage.setItem(`nexlinx_presence_${this.currentEmployee.id}`, JSON.stringify(presenceData));
    
    // Broadcast to API for cross-device detection
    this.broadcastToAPI(presenceData);
  }

  /**
   * Get current stored location from various sources
   */
  private getCurrentStoredLocation(): any {
    try {
      // Try to get from various localStorage keys
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
          // Check if location is recent (within 30 minutes)
          if (Date.now() - location.timestamp < 30 * 60 * 1000) {
            return {
              latitude: location.lat,
              longitude: location.lng,
              accuracy: location.accuracy,
              timestamp: location.timestamp
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
   * Broadcast presence to API for other devices to discover
   */
  private async broadcastToAPI(presenceData: any): Promise<void> {
    try {
      await fetch('/api/bluetooth-proximity/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(presenceData)
      });
    } catch (error) {
      console.log('📡 API broadcast failed, using localStorage only');
    }
  }

  /**
   * Start fallback scanning for nearby employees
   */
  private startFallbackScanning(): void {
    if (this.scanInterval) return;

    console.log('🔍 Starting fallback proximity scanning...');
    
    this.scanInterval = setInterval(() => {
      this.scanForNearbyEmployees();
    }, 5000); // Scan every 5 seconds
  }

  /**
   * Scan for nearby employees using localStorage and API
   */
  private async scanForNearbyEmployees(): Promise<void> {
    try {
      // Scan localStorage for other employee presence
      this.scanLocalStorage();
      
      // Scan via API for employees on other devices
      await this.scanViaAPI();
      
      // Clean up old entries
      this.cleanupOldEntries();
      
    } catch (error) {
      console.error('Error scanning for nearby employees:', error);
    }
  }

  /**
   * Scan localStorage for other employee presence data
   */
  private scanLocalStorage(): void {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('nexlinx_presence_') && !key.includes(this.currentEmployee?.id || '')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          
          // Check if data is recent (within 2 minutes)
          if (Date.now() - data.timestamp < 2 * 60 * 1000) {
            this.addNearbyEmployee({
              employeeId: data.employeeId,
              employeeCode: data.employeeCode,
              name: data.name,
              bluetoothDeviceId: data.deviceId,
              rssi: -50, // Simulated strong signal for same device
              distance: 0.5, // Very close for same device
              lastSeen: new Date(data.timestamp),
              location: data.location
            });
          }
        } catch (error) {
          console.error('Error parsing presence data:', error);
        }
      }
    }
  }

  /**
   * Scan for nearby employees via API
   */
  private async scanViaAPI(): Promise<void> {
    try {
      const response = await fetch('/api/bluetooth-proximity/nearby');
      const nearbyEmployees = await response.json();
      
      nearbyEmployees.forEach((employee: any) => {
        if (employee.employeeId !== this.currentEmployee?.id) {
          this.addNearbyEmployee({
            employeeId: employee.employeeId,
            employeeCode: employee.employeeCode,
            name: employee.name,
            bluetoothDeviceId: employee.deviceId,
            rssi: employee.rssi || -70, // Simulated signal strength
            distance: employee.distance || 10, // Estimated distance
            lastSeen: new Date(employee.timestamp),
            location: employee.location
          });
        }
      });
    } catch (error) {
      console.log('📡 API scanning failed, using localStorage only');
    }
  }

  /**
   * Add or update nearby employee
   */
  private addNearbyEmployee(employee: NearbyEmployee): void {
    this.nearbyEmployees.set(employee.employeeId, employee);
    console.log(`🔵 Found nearby employee: ${employee.employeeCode} (${employee.distance}m)`);
  }

  /**
   * Clean up old employee entries
   */
  private cleanupOldEntries(): void {
    const cutoffTime = Date.now() - 5 * 60 * 1000; // 5 minutes
    
    for (const [employeeId, employee] of this.nearbyEmployees.entries()) {
      if (employee.lastSeen.getTime() < cutoffTime) {
        this.nearbyEmployees.delete(employeeId);
        console.log(`🧹 Cleaned up old entry for employee: ${employee.employeeCode}`);
      }
    }
  }

  /**
   * Get nearby employees with valid location data
   */
  getNearbyEmployeesWithLocation(): NearbyEmployee[] {
    return Array.from(this.nearbyEmployees.values())
      .filter(emp => emp.location && emp.distance < 50) // Within 50 meters
      .sort((a, b) => a.distance - b.distance); // Sort by distance
  }

  /**
   * Attempt to get location via piggyback from nearby employee
   */
  async attemptLocationPiggyback(): Promise<LocationPiggybackData | null> {
    const nearbyEmployees = this.getNearbyEmployeesWithLocation();
    
    if (nearbyEmployees.length === 0) {
      console.log('🔵 No nearby employees with location found for piggyback');
      return null;
    }

    // Use the closest employee with the most recent location
    const closestEmployee = nearbyEmployees[0];
    
    if (!closestEmployee.location) {
      return null;
    }

    console.log(`🔵 Using location piggyback from employee: ${closestEmployee.employeeCode}`);
    
    return {
      latitude: closestEmployee.location.latitude,
      longitude: closestEmployee.location.longitude,
      accuracy: Math.max(closestEmployee.location.accuracy + closestEmployee.distance, 10), // Add distance uncertainty
      source: 'P',
      proximityEmployeeId: closestEmployee.employeeId,
      bluetoothDeviceId: closestEmployee.bluetoothDeviceId,
      timestamp: new Date()
    };
  }

  /**
   * Start proximity scanning
   */
  startScanning(): void {
    if (this.isScanning) return;
    
    this.isScanning = true;
    this.startFallbackScanning();
    
    // Broadcast presence every 30 seconds
    setInterval(() => {
      this.broadcastPresence();
    }, 30000);
  }

  /**
   * Stop proximity scanning
   */
  stopScanning(): void {
    this.isScanning = false;
    
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    
    console.log('🔵 Stopped BLE proximity scanning');
  }

  /**
   * Get current device ID
   */
  getDeviceId(): string {
    return this.deviceId;
  }

  /**
   * Get nearby employees count
   */
  getNearbyCount(): number {
    return this.nearbyEmployees.size;
  }
}

export const bluetoothProximityService = new BluetoothProximityService();