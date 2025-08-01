/**
 * Network Service - Handles network connectivity detection and monitoring
 * Features:
 * - Network status monitoring
 * - Connection quality detection
 * - Offline/online event handling
 * - Bandwidth estimation
 */

export interface NetworkStatus {
  isOnline: boolean;
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
  downlink: number;
  rtt: number;
  saveData: boolean;
}

export type NetworkChangeCallback = (isOnline: boolean, status: NetworkStatus) => void;

export class NetworkService {
  private callbacks: NetworkChangeCallback[] = [];
  private currentStatus: NetworkStatus;
  private connectionMonitor: NodeJS.Timeout | null = null;
  private readonly MONITOR_INTERVAL = 5000; // 5 seconds

  constructor() {
    this.currentStatus = this.getInitialNetworkStatus();
    this.initializeNetworkMonitoring();
  }

  /**
   * Get initial network status
   */
  private getInitialNetworkStatus(): NetworkStatus {
    return {
      isOnline: navigator.onLine,
      connectionType: this.getConnectionType(),
      effectiveType: this.getEffectiveConnectionType(),
      downlink: this.getDownlink(),
      rtt: this.getRTT(),
      saveData: this.getSaveData()
    };
  }

  /**
   * Initialize network monitoring
   */
  private initializeNetworkMonitoring(): void {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.handleNetworkChange(true);
    });

    window.addEventListener('offline', () => {
      this.handleNetworkChange(false);
    });

    // Monitor connection changes
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', () => {
        this.handleNetworkChange(navigator.onLine);
      });
    }

    // Start periodic connection monitoring
    this.startConnectionMonitoring();
  }

  /**
   * Start periodic connection monitoring
   */
  private startConnectionMonitoring(): void {
    this.connectionMonitor = setInterval(() => {
      this.checkConnectionQuality();
    }, this.MONITOR_INTERVAL);
  }

  /**
   * Stop connection monitoring
   */
  public stopConnectionMonitoring(): void {
    if (this.connectionMonitor) {
      clearInterval(this.connectionMonitor);
      this.connectionMonitor = null;
    }
  }

  /**
   * Handle network status changes
   */
  private handleNetworkChange(isOnline: boolean): void {
    const newStatus: NetworkStatus = {
      isOnline,
      connectionType: this.getConnectionType(),
      effectiveType: this.getEffectiveConnectionType(),
      downlink: this.getDownlink(),
      rtt: this.getRTT(),
      saveData: this.getSaveData()
    };

    const statusChanged = JSON.stringify(this.currentStatus) !== JSON.stringify(newStatus);
    
    if (statusChanged) {
      this.currentStatus = newStatus;
      console.log(`[NetworkService] Network status changed:`, newStatus);
      
      // Notify all callbacks
      this.callbacks.forEach(callback => {
        try {
          callback(isOnline, newStatus);
        } catch (error) {
          console.error('[NetworkService] Error in network callback:', error);
        }
      });
    }
  }

  /**
   * Check connection quality by making test requests
   */
  private async checkConnectionQuality(): Promise<void> {
    if (!navigator.onLine) return;

    try {
      const startTime = performance.now();
      const response = await fetch('/api/ping', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      const endTime = performance.now();
      
      const latency = endTime - startTime;
      
      // Update RTT estimate
      this.updateConnectionMetrics(latency, response.ok);
      
    } catch (error) {
      console.warn('[NetworkService] Connection quality check failed:', error);
      // Network might be down
      if (navigator.onLine) {
        this.handleNetworkChange(false);
      }
    }
  }

  /**
   * Update connection metrics
   */
  private updateConnectionMetrics(latency: number, success: boolean): void {
    // Update current status with measured latency
    this.currentStatus.rtt = latency;
    
    // Estimate effective type based on latency
    if (latency < 50) {
      this.currentStatus.effectiveType = '4g';
    } else if (latency < 200) {
      this.currentStatus.effectiveType = '3g';
    } else if (latency < 500) {
      this.currentStatus.effectiveType = '2g';
    } else {
      this.currentStatus.effectiveType = 'slow-2g';
    }
  }

  /**
   * Get connection type
   */
  private getConnectionType(): NetworkStatus['connectionType'] {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection.type || 'unknown';
    }
    return 'unknown';
  }

  /**
   * Get effective connection type
   */
  private getEffectiveConnectionType(): NetworkStatus['effectiveType'] {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection.effectiveType || 'unknown';
    }
    return 'unknown';
  }

  /**
   * Get downlink bandwidth
   */
  private getDownlink(): number {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection.downlink || 0;
    }
    return 0;
  }

  /**
   * Get round trip time
   */
  private getRTT(): number {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection.rtt || 0;
    }
    return 0;
  }

  /**
   * Get save data preference
   */
  private getSaveData(): boolean {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection.saveData || false;
    }
    return false;
  }

  /**
   * Check if online
   */
  public isOnline(): boolean {
    return this.currentStatus.isOnline;
  }

  /**
   * Get current network status
   */
  public getNetworkStatus(): NetworkStatus {
    return { ...this.currentStatus };
  }

  /**
   * Add network change callback
   */
  public onNetworkChange(callback: NetworkChangeCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Remove network change callback
   */
  public removeNetworkChangeCallback(callback: NetworkChangeCallback): void {
    this.callbacks = this.callbacks.filter(cb => cb !== callback);
  }

  /**
   * Check if connection is fast enough for real-time sync
   */
  public isFastConnection(): boolean {
    return this.currentStatus.effectiveType === '4g' || 
           this.currentStatus.effectiveType === '3g' ||
           this.currentStatus.downlink > 1.0;
  }

  /**
   * Check if connection is slow (should use data-saving mode)
   */
  public isSlowConnection(): boolean {
    return this.currentStatus.effectiveType === 'slow-2g' || 
           this.currentStatus.effectiveType === '2g' ||
           this.currentStatus.saveData;
  }

  /**
   * Estimate data transfer time
   */
  public estimateTransferTime(dataSize: number): number {
    const downlink = this.currentStatus.downlink;
    if (downlink === 0) return 0;
    
    // Convert from Mbps to bytes per second
    const bytesPerSecond = (downlink * 1024 * 1024) / 8;
    return dataSize / bytesPerSecond;
  }

  /**
   * Test network connectivity
   */
  public async testConnectivity(): Promise<{
    isReachable: boolean;
    latency: number;
    error?: string;
  }> {
    try {
      const startTime = performance.now();
      const response = await fetch('/api/ping', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      });
      const endTime = performance.now();
      
      return {
        isReachable: response.ok,
        latency: endTime - startTime
      };
    } catch (error) {
      return {
        isReachable: false,
        latency: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get connection quality score (0-100)
   */
  public getConnectionQuality(): number {
    if (!this.currentStatus.isOnline) return 0;
    
    let score = 100;
    
    // Reduce score based on RTT
    if (this.currentStatus.rtt > 0) {
      if (this.currentStatus.rtt > 1000) score -= 50;
      else if (this.currentStatus.rtt > 500) score -= 30;
      else if (this.currentStatus.rtt > 200) score -= 15;
    }
    
    // Reduce score based on effective type
    switch (this.currentStatus.effectiveType) {
      case 'slow-2g': score -= 40; break;
      case '2g': score -= 25; break;
      case '3g': score -= 10; break;
      case '4g': break; // No reduction
      default: score -= 5; break;
    }
    
    // Reduce score if save data is enabled
    if (this.currentStatus.saveData) {
      score -= 10;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get network type description
   */
  public getNetworkDescription(): string {
    if (!this.currentStatus.isOnline) return 'Offline';
    
    const type = this.currentStatus.connectionType;
    const effectiveType = this.currentStatus.effectiveType;
    
    if (type === 'wifi') return 'Wi-Fi';
    if (type === 'cellular') {
      switch (effectiveType) {
        case '4g': return '4G/LTE';
        case '3g': return '3G';
        case '2g': return '2G';
        case 'slow-2g': return 'Slow 2G';
        default: return 'Mobile Data';
      }
    }
    if (type === 'ethernet') return 'Ethernet';
    
    return 'Unknown';
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    this.stopConnectionMonitoring();
    this.callbacks = [];
  }
}

// Export singleton instance
export const networkService = new NetworkService();