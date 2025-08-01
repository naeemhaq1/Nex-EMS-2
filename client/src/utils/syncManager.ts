/**
 * Comprehensive Sync Manager for Mobile App
 * Handles offline data collection and transmission when internet is restored
 */

interface SyncableData {
  id: string;
  type: 'attendance_punch' | 'location_update' | 'performance_data' | 'user_action' | 'system_event';
  timestamp: number;
  data: any;
  priority: 'high' | 'medium' | 'low';
  retryCount: number;
  lastAttempt?: number;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
}

interface SyncStats {
  totalPending: number;
  totalCompleted: number;
  totalFailed: number;
  lastSyncTime?: number;
  nextSyncTime?: number;
}

class SyncManager {
  private db: IDBDatabase | null = null;
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private listeners: Array<(stats: SyncStats) => void> = [];
  private maxRetries = 3;
  private syncIntervalMs = 300000; // 5 minutes - reduced from 30 seconds
  private batchSize = 10;

  constructor() {
    this.initializeDB();
    this.setupEventListeners();
    this.startSyncLoop();
  }

  /**
   * Initialize IndexedDB for offline data storage
   */
  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('NexlinxSyncDB', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        console.log('🔄 Sync Manager: Database initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const store = db.createObjectStore('syncQueue', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('type', 'type');
          store.createIndex('priority', 'priority');
          store.createIndex('status', 'status');
        }

        // Create sync stats store
        if (!db.objectStoreNames.contains('syncStats')) {
          db.createObjectStore('syncStats', { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Setup network and visibility event listeners
   */
  private setupEventListeners(): void {
    // Network status changes
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('🔄 Sync Manager: Network restored, initiating sync');
      this.triggerSync();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('🔄 Sync Manager: Network lost, entering offline mode');
    });

    // App visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline) {
        this.triggerSync();
      }
    });
  }

  /**
   * Start the sync loop that runs periodically
   */
  private startSyncLoop(): void {
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.performSync();
      }
    }, this.syncIntervalMs);
  }

  /**
   * Queue data for offline sync
   */
  async queueForSync(type: SyncableData['type'], data: any, priority: SyncableData['priority'] = 'medium'): Promise<void> {
    if (!this.db) await this.initializeDB();

    const syncItem: SyncableData = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: Date.now(),
      data,
      priority,
      retryCount: 0,
      status: 'pending'
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.add(syncItem);

      request.onsuccess = () => {
        console.log(`🔄 Sync Manager: Queued ${type} for sync`);
        this.notifyListeners();
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Queue attendance punch data
   */
  async queueAttendancePunch(punchData: {
    employeeId: string;
    action: 'in' | 'out';
    timestamp: number;
    location?: { latitude: number; longitude: number; source: string };
    deviceInfo?: any;
  }): Promise<void> {
    await this.queueForSync('attendance_punch', punchData, 'high');
  }

  /**
   * Queue location update
   */
  async queueLocationUpdate(locationData: {
    employeeId: string;
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
    source: string;
  }): Promise<void> {
    await this.queueForSync('location_update', locationData, 'medium');
  }

  /**
   * Queue performance data
   */
  async queuePerformanceData(performanceData: {
    employeeId: string;
    metrics: any;
    timestamp: number;
  }): Promise<void> {
    await this.queueForSync('performance_data', performanceData, 'low');
  }

  /**
   * Queue user action
   */
  async queueUserAction(actionData: {
    employeeId: string;
    action: string;
    data: any;
    timestamp: number;
  }): Promise<void> {
    await this.queueForSync('user_action', actionData, 'medium');
  }

  /**
   * Trigger immediate sync
   */
  async triggerSync(): Promise<void> {
    if (!this.isOnline || this.syncInProgress) return;
    await this.performSync();
  }

  /**
   * Perform the actual sync operation
   */
  private async performSync(): Promise<void> {
    if (!this.db || this.syncInProgress) return;

    this.syncInProgress = true;

    try {
      const pendingItems = await this.getPendingItems();

      if (pendingItems.length === 0) {
        // Only log every 10th empty sync to reduce console spam
        if (Math.random() < 0.1) {
          console.log('🔄 Sync Manager: No pending items to sync');
        }
        return;
      }

      console.log(`🔄 Sync Manager: Starting sync operation with ${pendingItems.length} items`);

      // Sort by priority and timestamp
      const sortedItems = pendingItems.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return a.timestamp - b.timestamp;
      });

      // Process in batches
      const batches = this.chunkArray(sortedItems, this.batchSize);

      for (const batch of batches) {
        await this.processBatch(batch);
      }

      await this.updateSyncStats();
      this.notifyListeners();

      console.log('🔄 Sync Manager: Sync operation completed');

    } catch (error) {
      console.error('🔄 Sync Manager: Sync operation failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Get pending items from IndexedDB
   */
  private async getPendingItems(): Promise<SyncableData[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const index = store.index('status');
      const request = index.getAll('pending');

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Process a batch of sync items
   */
  private async processBatch(batch: SyncableData[]): Promise<void> {
    const promises = batch.map(item => this.syncItem(item));
    await Promise.allSettled(promises);
  }

  /**
   * Sync individual item
   */
  private async syncItem(item: SyncableData): Promise<void> {
    try {
      // Mark as syncing
      await this.updateItemStatus(item.id, 'syncing');

      let endpoint = '';
      let payload = item.data;

      // Determine API endpoint based on data type
      switch (item.type) {
        case 'attendance_punch':
          endpoint = '/api/mobile-attendance/punch';
          break;
        case 'location_update':
          endpoint = '/api/location/update';
          break;
        case 'performance_data':
          endpoint = '/api/performance/submit';
          break;
        case 'user_action':
          endpoint = '/api/user-actions/log';
          break;
        case 'system_event':
          endpoint = '/api/system/events';
          break;
      }

      // Make API request
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        // Success - mark as completed and remove from queue
        await this.removeItem(item.id);
        console.log(`🔄 Sync Manager: Successfully synced ${item.type}`);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      console.error(`🔄 Sync Manager: Failed to sync ${item.type}:`, error);

      // Handle retry logic
      const newRetryCount = item.retryCount + 1;

      if (newRetryCount >= this.maxRetries) {
        // Max retries reached - mark as failed
        await this.updateItemStatus(item.id, 'failed', newRetryCount);
      } else {
        // Retry later - mark as pending with increased retry count
        await this.updateItemStatus(item.id, 'pending', newRetryCount);
      }
    }
  }

  /**
   * Update item status in IndexedDB
   */
  private async updateItemStatus(id: string, status: SyncableData['status'], retryCount?: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.get(id);

      request.onsuccess = () => {
        const item = request.result;
        if (item) {
          item.status = status;
          item.lastAttempt = Date.now();
          if (retryCount !== undefined) {
            item.retryCount = retryCount;
          }

          const updateRequest = store.put(item);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Remove item from sync queue
   */
  private async removeItem(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<SyncStats> {
    if (!this.db) await this.initializeDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result;
        const stats: SyncStats = {
          totalPending: items.filter(item => item.status === 'pending').length,
          totalCompleted: 0, // This would be tracked separately
          totalFailed: items.filter(item => item.status === 'failed').length,
          lastSyncTime: Date.now()
        };
        resolve(stats);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update sync statistics
   */
  private async updateSyncStats(): Promise<void> {
    const stats = await this.getSyncStats();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncStats'], 'readwrite');
      const store = transaction.objectStore('syncStats');
      const request = store.put({ key: 'latest', ...stats, lastSyncTime: Date.now() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Add sync status listener
   */
  addSyncListener(callback: (stats: SyncStats) => void): void {
    this.listeners.push(callback);
  }

  /**
   * Remove sync status listener
   */
  removeSyncListener(callback: (stats: SyncStats) => void): void {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  /**
   * Notify all listeners of sync status changes
   */
  private async notifyListeners(): Promise<void> {
    const stats = await this.getSyncStats();
    this.listeners.forEach(listener => listener(stats));
  }

  /**
   * Utility function to chunk array
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Clear failed items
   */
  async clearFailedItems(): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const index = store.index('status');
      const request = index.openCursor(IDBKeyRange.only('failed'));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Retry failed items
   */
  async retryFailedItems(): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const index = store.index('status');
      const request = index.openCursor(IDBKeyRange.only('failed'));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const item = cursor.value;
          item.status = 'pending';
          item.retryCount = 0;
          cursor.update(item);
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Cleanup old completed items
   */
  async cleanup(olderThanDays: number = 7): Promise<void> {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const index = store.index('timestamp');
      const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const item = cursor.value;
          if (item.status === 'completed') {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Destroy sync manager and cleanup
   */
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    if (this.db) {
      this.db.close();
      this.db = null;
    }

    this.listeners = [];
    console.log('🔄 Sync Manager: Destroyed');
  }
}

// Increase sync interval to prevent excessive logging
const SYNC_INTERVAL = 120000; // 30 seconds - reduced frequency

// Set up automatic sync interval (every 2 minutes to reduce interference)
setInterval(() => {
  syncManager.triggerSync();
}, 120000);

// Create singleton instance
export const syncManager = new SyncManager();
export default syncManager;