/**
 * Device Detection Service
 * Collects comprehensive device information for device management and binding
 */

export interface DeviceInfo {
  fingerprint: string;
  deviceName?: string;
  deviceType: string;
  manufacturer?: string;
  model?: string;
  operatingSystem: string;
  osVersion?: string;
  browser: string;
  browserVersion: string;
  screenResolution: string;
  userAgent: string;
  platform: string;
  language: string;
  timezone: string;
  macAddress?: string;
  networkInfo?: any;
  batteryInfo?: any;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  maxTouchPoints?: number;
  devicePixelRatio?: number;
  colorDepth?: number;
}

class DeviceDetectionService {
  private deviceInfo: DeviceInfo | null = null;

  /**
   * Collect comprehensive device information
   */
  async collectDeviceInfo(): Promise<DeviceInfo> {
    try {
      console.log('🔍 Starting comprehensive device detection...');

      // Basic browser detection
      const userAgent = navigator.userAgent;
      const platform = navigator.platform;
      const language = navigator.language;
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Screen information
      const screenResolution = `${screen.width}x${screen.height}`;
      const devicePixelRatio = window.devicePixelRatio || 1;
      const colorDepth = screen.colorDepth || 24;

      // Hardware information
      const hardwareConcurrency = navigator.hardwareConcurrency || 0;
      const maxTouchPoints = navigator.maxTouchPoints || 0;
      const deviceMemory = (navigator as any).deviceMemory || 0;

      // Operating system detection
      const osInfo = this.detectOperatingSystem(userAgent, platform);
      
      // Browser detection
      const browserInfo = this.detectBrowser(userAgent);
      
      // Device type detection
      const deviceType = this.detectDeviceType(userAgent);
      
      // Device manufacturer and model
      const deviceDetails = this.detectDeviceDetails(userAgent);

      // Network information (if available)
      let networkInfo;
      try {
        const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
        if (connection) {
          networkInfo = {
            effectiveType: connection.effectiveType,
            type: connection.type,
            downlink: connection.downlink,
            rtt: connection.rtt
          };
        }
      } catch (error) {
        console.warn('Network info not available:', error);
      }

      // Battery information (if available)
      let batteryInfo;
      try {
        const battery = await (navigator as any).getBattery?.();
        if (battery) {
          batteryInfo = {
            level: battery.level,
            charging: battery.charging,
            chargingTime: battery.chargingTime,
            dischargingTime: battery.dischargingTime
          };
        }
      } catch (error) {
        console.warn('Battery info not available:', error);
      }

      // Generate device fingerprint
      const fingerprint = await this.generateFingerprint({
        userAgent,
        platform,
        screenResolution,
        timezone,
        language,
        hardwareConcurrency,
        devicePixelRatio,
        colorDepth,
        maxTouchPoints
      });

      this.deviceInfo = {
        fingerprint,
        deviceName: deviceDetails.deviceName,
        deviceType,
        manufacturer: deviceDetails.manufacturer,
        model: deviceDetails.model,
        operatingSystem: osInfo.os,
        osVersion: osInfo.version,
        browser: browserInfo.browser,
        browserVersion: browserInfo.version,
        screenResolution,
        userAgent,
        platform,
        language,
        timezone,
        networkInfo,
        batteryInfo,
        deviceMemory,
        hardwareConcurrency,
        maxTouchPoints,
        devicePixelRatio,
        colorDepth
      };

      console.log('✅ Device detection completed:', {
        fingerprint: this.deviceInfo.fingerprint,
        deviceType: this.deviceInfo.deviceType,
        os: `${this.deviceInfo.operatingSystem} ${this.deviceInfo.osVersion}`,
        browser: `${this.deviceInfo.browser} ${this.deviceInfo.browserVersion}`
      });

      return this.deviceInfo;
    } catch (error) {
      console.error('❌ Device detection failed:', error);
      throw new Error('Failed to collect device information');
    }
  }

  /**
   * Get cached device information
   */
  getDeviceInfo(): DeviceInfo | null {
    return this.deviceInfo;
  }

  /**
   * Detect operating system from user agent
   */
  private detectOperatingSystem(userAgent: string, platform: string): { os: string; version?: string } {
    const ua = userAgent.toLowerCase();
    
    // iOS Detection
    if (/iphone|ipad|ipod/.test(ua)) {
      const match = ua.match(/os (\d+)[._](\d+)[._]?(\d+)?/);
      const version = match ? `${match[1]}.${match[2]}${match[3] ? '.' + match[3] : ''}` : undefined;
      return { os: /ipad/.test(ua) ? 'iPadOS' : 'iOS', version };
    }
    
    // Android Detection
    if (/android/.test(ua)) {
      const match = ua.match(/android (\d+(?:\.\d+)*)/);
      return { os: 'Android', version: match ? match[1] : undefined };
    }
    
    // Windows Detection
    if (/windows/.test(ua)) {
      if (/windows nt 10/.test(ua)) return { os: 'Windows', version: '10/11' };
      if (/windows nt 6\.3/.test(ua)) return { os: 'Windows', version: '8.1' };
      if (/windows nt 6\.2/.test(ua)) return { os: 'Windows', version: '8' };
      if (/windows nt 6\.1/.test(ua)) return { os: 'Windows', version: '7' };
      return { os: 'Windows' };
    }
    
    // macOS Detection
    if (/macintosh|mac os x/.test(ua)) {
      const match = ua.match(/mac os x (\d+)[._](\d+)[._]?(\d+)?/);
      const version = match ? `${match[1]}.${match[2]}${match[3] ? '.' + match[3] : ''}` : undefined;
      return { os: 'macOS', version };
    }
    
    // Linux Detection
    if (/linux/.test(ua)) {
      return { os: 'Linux' };
    }
    
    // Chrome OS Detection
    if (/cros/.test(ua)) {
      return { os: 'Chrome OS' };
    }
    
    return { os: platform || 'Unknown' };
  }

  /**
   * Detect browser from user agent
   */
  private detectBrowser(userAgent: string): { browser: string; version?: string } {
    const ua = userAgent.toLowerCase();
    
    // Edge Detection (must come before Chrome)
    if (/edg\//.test(ua)) {
      const match = ua.match(/edg\/(\d+(?:\.\d+)*)/);
      return { browser: 'Edge', version: match ? match[1] : undefined };
    }
    
    // Chrome Detection (must come before Safari)
    if (/chrome\//.test(ua) && !/edg\//.test(ua)) {
      const match = ua.match(/chrome\/(\d+(?:\.\d+)*)/);
      return { browser: 'Chrome', version: match ? match[1] : undefined };
    }
    
    // Firefox Detection
    if (/firefox\//.test(ua)) {
      const match = ua.match(/firefox\/(\d+(?:\.\d+)*)/);
      return { browser: 'Firefox', version: match ? match[1] : undefined };
    }
    
    // Safari Detection
    if (/safari\//.test(ua) && !/chrome\//.test(ua)) {
      const match = ua.match(/version\/(\d+(?:\.\d+)*)/);
      return { browser: 'Safari', version: match ? match[1] : undefined };
    }
    
    // Opera Detection
    if (/opera|opr\//.test(ua)) {
      const match = ua.match(/(?:opera|opr)\/(\d+(?:\.\d+)*)/);
      return { browser: 'Opera', version: match ? match[1] : undefined };
    }
    
    return { browser: 'Unknown' };
  }

  /**
   * Detect device type from user agent
   */
  private detectDeviceType(userAgent: string): string {
    const ua = userAgent.toLowerCase();
    
    if (/mobile|android|iphone|ipod|blackberry|windows phone/.test(ua)) {
      return 'mobile';
    }
    
    if (/tablet|ipad|android(?!.*mobile)/.test(ua)) {
      return 'tablet';
    }
    
    return 'desktop';
  }

  /**
   * Detect device manufacturer and model
   */
  private detectDeviceDetails(userAgent: string): { manufacturer?: string; model?: string; deviceName?: string } {
    const ua = userAgent.toLowerCase();
    
    // iPhone Detection
    if (/iphone/.test(ua)) {
      const match = ua.match(/iphone os (\d+)[._](\d+)/);
      return {
        manufacturer: 'Apple',
        model: 'iPhone',
        deviceName: match ? `iPhone (iOS ${match[1]}.${match[2]})` : 'iPhone'
      };
    }
    
    // iPad Detection
    if (/ipad/.test(ua)) {
      return {
        manufacturer: 'Apple',
        model: 'iPad',
        deviceName: 'iPad'
      };
    }
    
    // Samsung Detection
    if (/samsung/.test(ua)) {
      const models = ['galaxy s', 'galaxy note', 'galaxy a', 'galaxy m'];
      for (const model of models) {
        if (ua.includes(model)) {
          return {
            manufacturer: 'Samsung',
            model: model.replace('galaxy ', 'Galaxy '),
            deviceName: `Samsung ${model.replace('galaxy ', 'Galaxy ')}`
          };
        }
      }
      return { manufacturer: 'Samsung', deviceName: 'Samsung Device' };
    }
    
    // Google Pixel Detection
    if (/pixel/.test(ua)) {
      return {
        manufacturer: 'Google',
        model: 'Pixel',
        deviceName: 'Google Pixel'
      };
    }
    
    return {};
  }

  /**
   * Generate unique device fingerprint
   */
  private async generateFingerprint(data: any): Promise<string> {
    try {
      // Create a string from device characteristics
      const fingerprintData = JSON.stringify({
        userAgent: data.userAgent,
        platform: data.platform,
        screenResolution: data.screenResolution,
        timezone: data.timezone,
        language: data.language,
        hardwareConcurrency: data.hardwareConcurrency,
        devicePixelRatio: data.devicePixelRatio,
        colorDepth: data.colorDepth,
        maxTouchPoints: data.maxTouchPoints
      });

      // Generate hash if crypto.subtle is available
      if (window.crypto && window.crypto.subtle) {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(fingerprintData);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } else {
        // Fallback: simple hash
        let hash = 0;
        for (let i = 0; i < fingerprintData.length; i++) {
          const char = fingerprintData.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16);
      }
    } catch (error) {
      console.warn('Fingerprint generation failed, using fallback:', error);
      return Date.now().toString(36) + Math.random().toString(36);
    }
  }

  /**
   * Get device summary for display
   */
  getDeviceSummary(): string {
    if (!this.deviceInfo) return 'Unknown Device';
    
    const parts = [];
    
    if (this.deviceInfo.deviceName) {
      parts.push(this.deviceInfo.deviceName);
    } else if (this.deviceInfo.manufacturer && this.deviceInfo.model) {
      parts.push(`${this.deviceInfo.manufacturer} ${this.deviceInfo.model}`);
    } else {
      parts.push(this.deviceInfo.deviceType);
    }

    if (this.deviceInfo.operatingSystem) {
      parts.push(this.deviceInfo.operatingSystem);
      if (this.deviceInfo.osVersion) {
        parts[parts.length - 1] += ` ${this.deviceInfo.osVersion}`;
      }
    }

    return parts.join(' • ');
  }

  /**
   * Check if device info is collected
   */
  isDeviceInfoCollected(): boolean {
    return this.deviceInfo !== null;
  }

  /**
   * Clear cached device info
   */
  clearDeviceInfo(): void {
    this.deviceInfo = null;
  }
}

export const deviceDetectionService = new DeviceDetectionService();