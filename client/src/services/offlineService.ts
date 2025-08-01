/**
 * Offline Service for Mobile EMS
 * Handles data storage and synchronization when offline
 */

import { apiRequest } from '@/lib/queryClient';

interface OfflineRecord {
  id: string;
  employeeId: string;
  punchType: 'in' | 'out';
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  isOnline: boolean;
  synced: boolean;
  retryCount?: number;
  lastAttempt?: string;
}

interface SyncQueue {
  records: OfflineRecord[];
  lastSync: string;
  totalRecords: number;
}

class OfflineService {
  private dbName = 'NexlinxEMS';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create offline records store
        if (!db.objectStoreNames.contains('offlineRecords')) {
          const store = db.createObjectStore('offlineRecords', { keyPath: 'id' });
          store.createIndex('employeeId', 'employeeId');
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('synced', 'synced');
        }

        // Create sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id' });
        }
      };
    });
  }

  async storeOfflineRecord(record: Omit<OfflineRecord, 'id'>): Promise<string> {
    await this.initialize();
    
    const id = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullRecord: OfflineRecord = {
      ...record,
      id,
      synced: false,
      retryCount: 0,
      lastAttempt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineRecords'], 'readwrite');
      const store = transaction.objectStore('offlineRecords');
      
      const request = store.add(fullRecord);
      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingRecords(): Promise<OfflineRecord[]> {
    await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineRecords'], 'readonly');
      const store = transaction.objectStore('offlineRecords');
      const index = store.index('synced');
      
      const request = index.getAll(false);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async syncRecord(record: OfflineRecord): Promise<void> {
    try {
      // Transform record for API
      const punchData = {
        employeeId: record.employeeId,
        punchType: record.punchType,
        timestamp: record.timestamp,
        location: record.location,
        source: 'mobile_offline'
      };

      // Send to server
      await apiRequest('/api/mobile/punch', {
        method: 'POST',
        body: JSON.stringify(punchData)
      });

      // Mark as synced
      await this.markAsSynced(record.id);
    } catch (error) {
      // Update retry count
      await this.updateRetryCount(record.id);
      throw error;
    }
  }

  async syncAllRecords(): Promise<number> {
    const pendingRecords = await this.getPendingRecords();
    let syncedCount = 0;

    for (const record of pendingRecords) {
      try {
        await this.syncRecord(record);
        syncedCount++;
      } catch (error) {
        console.error(`Failed to sync record ${record.id}:`, error);
        // Continue with other records
      }
    }

    return syncedCount;
  }

  async markAsSynced(recordId: string): Promise<void> {
    await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineRecords'], 'readwrite');
      const store = transaction.objectStore('offlineRecords');
      
      const getRequest = store.get(recordId);
      getRequest.onsuccess = () => {
        const record = getRequest.result;
        if (record) {
          record.synced = true;
          record.lastAttempt = new Date().toISOString();
          
          const updateRequest = store.put(record);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async updateRetryCount(recordId: string): Promise<void> {
    await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineRecords'], 'readwrite');
      const store = transaction.objectStore('offlineRecords');
      
      const getRequest = store.get(recordId);
      getRequest.onsuccess = () => {
        const record = getRequest.result;
        if (record) {
          record.retryCount = (record.retryCount || 0) + 1;
          record.lastAttempt = new Date().toISOString();
          
          const updateRequest = store.put(record);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async clearSyncedRecords(): Promise<void> {
    await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineRecords'], 'readwrite');
      const store = transaction.objectStore('offlineRecords');
      const index = store.index('synced');
      
      const request = index.openCursor(IDBKeyRange.only(true));
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

  async getStorageStats(): Promise<{
    totalRecords: number;
    pendingRecords: number;
    syncedRecords: number;
    oldestRecord: string | null;
  }> {
    await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineRecords'], 'readonly');
      const store = transaction.objectStore('offlineRecords');
      
      const countRequest = store.count();
      countRequest.onsuccess = () => {
        const totalRecords = countRequest.result;
        
        const pendingRequest = store.index('synced').count(false);
        pendingRequest.onsuccess = () => {
          const pendingRecords = pendingRequest.result;
          const syncedRecords = totalRecords - pendingRecords;
          
          // Get oldest record
          const oldestRequest = store.index('timestamp').openCursor();
          oldestRequest.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            const oldestRecord = cursor ? cursor.value.timestamp : null;
            
            resolve({
              totalRecords,
              pendingRecords,
              syncedRecords,
              oldestRecord
            });
          };
          oldestRequest.onerror = () => reject(oldestRequest.error);
        };
        pendingRequest.onerror = () => reject(pendingRequest.error);
      };
      countRequest.onerror = () => reject(countRequest.error);
    });
  }

  async setupAutoSync(): Promise<void> {
    // Auto-sync when coming back online
    window.addEventListener('online', () => {
      this.syncAllRecords().catch(console.error);
    });

    // Periodic sync attempt (every 5 minutes)
    setInterval(() => {
      if (navigator.onLine) {
        this.syncAllRecords().catch(console.error);
      }
    }, 5 * 60 * 1000);
  }
}

export const offlineService = new OfflineService();