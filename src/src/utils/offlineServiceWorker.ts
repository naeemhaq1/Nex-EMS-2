// Enhanced Offline Service Worker Management
// Handles comprehensive offline support with request interception

export class OfflineServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private isOnline = navigator.onLine;
  
  constructor() {
    this.setupNetworkListeners();
  }
  
  // Register enhanced offline service worker
  async register(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      console.warn('[SW] Service Worker not supported');
      return false;
    }
    
    try {
      // Try to register offline-enabled service worker first
      this.registration = await navigator.serviceWorker.register('/sw-offline.js', {
        scope: '/',
        updateViaCache: 'none'
      });
      
      console.log('[SW] Offline Service Worker registered successfully');
      
      this.setupServiceWorkerListeners();
      this.setupMessageHandling();
      
      return true;
    } catch (error) {
      console.error('[SW] Offline Service Worker registration failed:', error);
      
      // Fallback to basic service worker
      return this.registerBasicServiceWorker();
    }
  }
  
  // Fallback to basic service worker
  private async registerBasicServiceWorker(): Promise<boolean> {
    try {
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[SW] Basic Service Worker registered as fallback');
      return true;
    } catch (error) {
      console.error('[SW] Basic Service Worker registration failed:', error);
      return false;
    }
  }
  
  // Setup service worker event listeners
  private setupServiceWorkerListeners() {
    if (!this.registration) return;
    
    this.registration.addEventListener('updatefound', () => {
      const newWorker = this.registration!.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            this.handleServiceWorkerUpdate();
          }
        });
      }
    });
  }
  
  // Setup message handling with service worker
  private setupMessageHandling() {
    navigator.serviceWorker.addEventListener('message', (event) => {
      this.handleServiceWorkerMessage(event.data);
    });
  }
  
  // Setup network status listeners
  private setupNetworkListeners() {
    window.addEventListener('online', () => this.handleNetworkOnline());
    window.addEventListener('offline', () => this.handleNetworkOffline());
  }
  
  // Handle service worker messages
  private handleServiceWorkerMessage(data: any) {
    const { type, payload } = data;
    
    switch (type) {
      case 'SYNC_SUCCESS':
        console.log('[SW] Background sync successful:', payload.url);
        this.notifyComponents('sync-success', payload);
        break;
        
      case 'CACHE_UPDATED':
        console.log('[SW] Cache updated for:', payload.url);
        this.notifyComponents('cache-updated', payload);
        break;
        
      case 'OFFLINE_READY':
        console.log('[SW] App ready for offline use');
        this.notifyComponents('offline-ready', payload);
        break;
        
      case 'REQUEST_FAILED':
        console.log('[SW] Request failed, serving fallback:', payload.url);
        this.notifyComponents('request-failed', payload);
        break;
    }
  }
  
  // Handle network coming online
  private handleNetworkOnline() {
    console.log('[SW] Network restored - triggering sync');
    this.isOnline = true;
    
    // Notify service worker about network restoration
    this.postMessage({
      type: 'NETWORK_RESTORED',
      timestamp: Date.now()
    });
    
    // Notify components
    this.notifyComponents('network-online', { timestamp: Date.now() });
    
    // Trigger sync operations
    this.triggerBackgroundSync();
  }
  
  // Handle network going offline
  private handleNetworkOffline() {
    console.log('[SW] Network lost - enabling offline mode');
    this.isOnline = false;
    
    // Notify components
    this.notifyComponents('network-offline', { timestamp: Date.now() });
  }
  
  // Handle service worker update
  private handleServiceWorkerUpdate() {
    console.log('[SW] Service Worker update available');
    this.notifyComponents('sw-update-available', {
      message: 'App update available - refresh to get latest features'
    });
  }
  
  // Post message to service worker
  private postMessage(message: any) {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(message);
    }
  }
  
  // Notify components using custom events
  private notifyComponents(type: string, data: any) {
    window.dispatchEvent(new CustomEvent(`sw-${type}`, { detail: data }));
  }
  
  // Trigger background sync
  private triggerBackgroundSync() {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      this.registration?.sync?.register('background-sync');
    } else {
      // Manual sync for browsers without background sync
      this.postMessage({ type: 'FORCE_SYNC' });
    }
  }
  
  // Get cache status
  async getCacheStatus(): Promise<any> {
    return new Promise((resolve) => {
      if (!navigator.serviceWorker.controller) {
        resolve({ error: 'No service worker controller' });
        return;
      }
      
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        resolve(event.data);
      };
      
      navigator.serviceWorker.controller.postMessage(
        { type: 'CACHE_STATUS' },
        [channel.port2]
      );
    });
  }
  
  // Clear all caches
  async clearCaches(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!navigator.serviceWorker.controller) {
        resolve(false);
        return;
      }
      
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        resolve(event.data.success || false);
      };
      
      navigator.serviceWorker.controller.postMessage(
        { type: 'CLEAR_CACHE' },
        [channel.port2]
      );
    });
  }
  
  // Force sync failed requests
  async forceSyncFailedRequests(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!navigator.serviceWorker.controller) {
        resolve(false);
        return;
      }
      
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        resolve(event.data.synced || false);
      };
      
      navigator.serviceWorker.controller.postMessage(
        { type: 'FORCE_SYNC' },
        [channel.port2]
      );
    });
  }
  
  // Check if currently offline
  isOffline(): boolean {
    return !this.isOnline;
  }
  
  // Get network information
  getNetworkInfo() {
    const connection = (navigator as any).connection;
    return {
      online: this.isOnline,
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 0,
      rtt: connection?.rtt || 0,
      saveData: connection?.saveData || false
    };
  }
  
  // Preload critical resources
  async preloadCriticalResources() {
    const criticalUrls = [
      '/api/auth/me',
      '/api/dashboard/metrics',
      '/api/admin/services',
      '/mobile/admin/dashboard',
      '/mobile/employee/dashboard'
    ];
    
    this.postMessage({
      type: 'PRELOAD_RESOURCES',
      urls: criticalUrls
    });
  }
  
  // Update app in background
  async updateApp() {
    if (this.registration?.waiting) {
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }
}

// Global instance
export const offlineServiceWorker = new OfflineServiceWorkerManager();

// Initialize offline service worker
export async function initializeOfflineSupport(): Promise<boolean> {
  const success = await offlineServiceWorker.register();
  
  if (success) {
    // Preload critical resources
    await offlineServiceWorker.preloadCriticalResources();
    
    // Setup global handlers
    setupGlobalOfflineHandlers();
  }
  
  return success;
}

// Setup global handlers for offline functionality
function setupGlobalOfflineHandlers() {
  // Make offline service worker available globally
  (window as any).offlineServiceWorker = offlineServiceWorker;
  
  // Setup global offline detection
  (window as any).isOffline = () => offlineServiceWorker.isOffline();
  (window as any).getNetworkInfo = () => offlineServiceWorker.getNetworkInfo();
  
  // Setup global cache management
  (window as any).clearOfflineCache = () => offlineServiceWorker.clearCaches();
  (window as any).forceSyncOffline = () => offlineServiceWorker.forceSyncFailedRequests();
  
  console.log('[SW] Global offline handlers initialized');
}