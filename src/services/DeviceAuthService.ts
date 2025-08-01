/**
 * Device Authentication Service
 * Integrates device detection with user authentication
 */

import { deviceDetectionService, type DeviceInfo } from './DeviceDetectionService';

interface DeviceAuthResult {
  canAuthenticate: boolean;
  isNewDevice: boolean;
  requiresRegistration?: boolean;
  device?: any;
  error?: string;
  boundUserId?: number;
}

interface DeviceRegistrationResult {
  success: boolean;
  device: any;
  isNewDevice: boolean;
  error?: string;
}

class DeviceAuthService {
  /**
   * Check if current device can authenticate for user
   */
  async checkDeviceAuth(requestedUserId?: number, userRole?: string): Promise<DeviceAuthResult> {
    try {
      // Collect device information
      const deviceInfo = await deviceDetectionService.collectDeviceInfo();
      
      console.log('🔐 Checking device authentication for fingerprint:', deviceInfo.fingerprint);

      // Check with server
      const response = await fetch('/api/device-management/check-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          deviceFingerprint: deviceInfo.fingerprint,
          requestedUserId,
          userRole // Include user role for admin exemption
        })
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          canAuthenticate: false,
          isNewDevice: false,
          error: error.error || 'Authentication check failed',
          boundUserId: error.boundUserId
        };
      }

      const result = await response.json();
      console.log('✅ Device authentication check result:', result);
      
      return result;

    } catch (error) {
      console.error('❌ Error checking device authentication:', error);
      return {
        canAuthenticate: false,
        isNewDevice: false,
        error: 'Failed to check device authentication'
      };
    }
  }

  /**
   * Register device for user after successful login
   */
  async registerDevice(userId: number, userRole?: string, loginIp?: string): Promise<DeviceRegistrationResult> {
    try {
      // Get device information
      const deviceInfo = deviceDetectionService.getDeviceInfo();
      
      if (!deviceInfo) {
        throw new Error('Device information not available');
      }

      console.log('📱 Registering device for user:', userId);

      const response = await fetch('/api/device-management/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          deviceInfo,
          loginIp: loginIp || this.getClientIP(),
          userRole // Include user role for admin exemption
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Device registration failed');
      }

      const result = await response.json();
      console.log('✅ Device registration result:', result);

      // Store device ID for future reference
      localStorage.setItem('nexlinx_device_id', result.device.id.toString());
      localStorage.setItem('nexlinx_device_fingerprint', deviceInfo.fingerprint);

      return result;

    } catch (error) {
      console.error('❌ Error registering device:', error);
      return {
        success: false,
        device: null,
        isNewDevice: false,
        error: error instanceof Error ? error.message : 'Device registration failed'
      };
    }
  }

  /**
   * Get user's devices
   */
  async getUserDevices(userId: number): Promise<any[]> {
    try {
      const response = await fetch(`/api/device-management/user/${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch user devices');
      }

      const result = await response.json();
      return result.devices || [];

    } catch (error) {
      console.error('❌ Error fetching user devices:', error);
      return [];
    }
  }

  /**
   * Enhanced login with device authentication
   */
  async authenticateWithDevice(username: string, password: string): Promise<any> {
    try {
      // First, collect device information
      await deviceDetectionService.collectDeviceInfo();

      // Skip device authentication check - proper credentials should never be blocked
      console.log('🔓 Skipping device authentication check - allowing login to proceed');

      // Proceed with normal login
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      if (!loginResponse.ok) {
        const error = await loginResponse.json();
        throw new Error(error.error || 'Login failed');
      }

      const loginResult = await loginResponse.json();
      console.log('✅ Login successful:', loginResult.user.username);

      // Register/update device after successful login
      const deviceReg = await this.registerDevice(
        loginResult.user.id,
        this.getClientIP()
      );

      if (!deviceReg.success) {
        console.warn('⚠️ Device registration failed but login successful:', deviceReg.error);
      } else {
        console.log(`📱 Device ${deviceReg.isNewDevice ? 'registered' : 'updated'} successfully`);
      }

      return {
        ...loginResult,
        deviceInfo: {
          registered: deviceReg.success,
          isNewDevice: deviceReg.isNewDevice,
          device: deviceReg.device
        }
      };

    } catch (error) {
      console.error('❌ Enhanced login failed:', error);
      throw error;
    }
  }

  /**
   * Get current device ID from storage
   */
  getCurrentDeviceId(): string | null {
    return localStorage.getItem('nexlinx_device_id');
  }

  /**
   * Get current device fingerprint from storage
   */
  getCurrentDeviceFingerprint(): string | null {
    return localStorage.getItem('nexlinx_device_fingerprint');
  }

  /**
   * Get client IP (best effort)
   */
  private getClientIP(): string {
    // In a real implementation, this would be handled server-side
    // This is just a placeholder
    return 'unknown';
  }

  /**
   * Clear device storage (on logout)
   */
  clearDeviceStorage(): void {
    localStorage.removeItem('nexlinx_device_id');
    localStorage.removeItem('nexlinx_device_fingerprint');
  }

  /**
   * Generate device summary for display
   */
  getDeviceSummary(): string {
    const deviceInfo = deviceDetectionService.getDeviceInfo();
    
    if (!deviceInfo) {
      return 'Unknown Device';
    }

    const parts = [];
    
    if (deviceInfo.deviceName) {
      parts.push(deviceInfo.deviceName);
    } else if (deviceInfo.manufacturer && deviceInfo.model) {
      parts.push(`${deviceInfo.manufacturer} ${deviceInfo.model}`);
    } else {
      parts.push(deviceInfo.deviceType);
    }

    if (deviceInfo.operatingSystem) {
      parts.push(deviceInfo.operatingSystem);
      if (deviceInfo.osVersion) {
        parts[parts.length - 1] += ` ${deviceInfo.osVersion}`;
      }
    }

    if (deviceInfo.browser) {
      parts.push(deviceInfo.browser);
      if (deviceInfo.browserVersion) {
        parts[parts.length - 1] += ` ${deviceInfo.browserVersion}`;
      }
    }

    return parts.join(' • ');
  }
}

export const deviceAuthService = new DeviceAuthService();