/**
 * Offline Storage Utilities
 * Handles local storage, IndexedDB, and offline data management
 */

interface CachedData {
  data: any;
  timestamp: number;
  expiry: number;
}

interface OfflineAction {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

class OfflineStorageManager {
  private dbName = 'nexlinx-ems-offline';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDB();
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Store for cached API responses
        if (!db.objectStoreNames.contains('apiCache')) {
          const apiStore = db.createObjectStore('apiCache', { keyPath: 'key' });
          apiStore.createIndex('timestamp', 'timestamp');
        }
        
        // Store for pending offline actions
        if (!db.objectStoreNames.contains('pendingActions')) {
          const actionsStore = db.createObjectStore('pendingActions', { keyPath: 'id' });
          actionsStore.createIndex('type', 'type');
          actionsStore.createIndex('timestamp', 'timestamp');
        }
        
        // Store for employee data
        if (!db.objectStoreNames.contains('employees')) {
          const employeesStore = db.createObjectStore('employees', { keyPath: 'id' });
          employeesStore.createIndex('employeeCode', 'employeeCode');
          employeesStore.createIndex('department', 'department');
        }
        
        // Store for attendance data
        if (!db.objectStoreNames.contains('attendance')) {
          const attendanceStore = db.createObjectStore('attendance', { keyPath: 'id' });
          attendanceStore.createIndex('employeeId', 'employeeId');
          attendanceStore.createIndex('date', 'date');
        }
      };
    });
  }

  // Cache API responses
  async cacheAPIResponse(key: string, data: any, ttlMinutes: number = 60): Promise<void> {
    if (!this.db) await this.initDB();
    
    const transaction = this.db!.transaction(['apiCache'], 'readwrite');
    const store = transaction.objectStore('apiCache');
    
    const cachedData: CachedData = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + (ttlMinutes * 60 * 1000)
    };
    
    await store.put({ key, ...cachedData });
  }

  // Get cached API response
  async getCachedAPIResponse(key: string): Promise<any | null> {
    if (!this.db) await this.initDB();
    
    const transaction = this.db!.transaction(['apiCache'], 'readonly');
    const store = transaction.objectStore('apiCache');
    const result = await store.get(key);
    
    if (!result) return null;
    
    // Check if expired
    if (Date.now() > result.expiry) {
      // Clean up expired data
      this.deleteCachedAPIResponse(key);
      return null;
    }
    
    return result.data;
  }

  // Delete cached API response
  async deleteCachedAPIResponse(key: string): Promise<void> {
    if (!this.db) await this.initDB();
    
    const transaction = this.db!.transaction(['apiCache'], 'readwrite');
    const store = transaction.objectStore('apiCache');
    await store.delete(key);
  }

  // Store offline action for later sync
  async storeOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    if (!this.db) await this.initDB();
    
    const actionId = `${action.type}_${Date.now()}_${Math.random()}`;
    const fullAction: OfflineAction = {
      id: actionId,
      timestamp: Date.now(),
      retryCount: 0,
      ...action
    };
    
    const transaction = this.db!.transaction(['pendingActions'], 'readwrite');
    const store = transaction.objectStore('pendingActions');
    await store.put(fullAction);
    
    return actionId;
  }

  // Get pending offline actions
  async getPendingActions(): Promise<OfflineAction[]> {
    if (!this.db) await this.initDB();
    
    const transaction = this.db!.transaction(['pendingActions'], 'readonly');
    const store = transaction.objectStore('pendingActions');
    const request = store.getAll();
    
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  // Remove completed offline action
  async removeOfflineAction(actionId: string): Promise<void> {
    if (!this.db) await this.initDB();
    
    const transaction = this.db!.transaction(['pendingActions'], 'readwrite');
    const store = transaction.objectStore('pendingActions');
    await store.delete(actionId);
  }

  // Store employee data for offline access
  async storeEmployees(employees: any[]): Promise<void> {
    if (!this.db) await this.initDB();
    
    const transaction = this.db!.transaction(['employees'], 'readwrite');
    const store = transaction.objectStore('employees');
    
    // Clear existing data
    await store.clear();
    
    // Store new data
    for (const employee of employees) {
      await store.put(employee);
    }
  }

  // Get offline employees
  async getOfflineEmployees(): Promise<any[]> {
    if (!this.db) await this.initDB();
    
    const transaction = this.db!.transaction(['employees'], 'readonly');
    const store = transaction.objectStore('employees');
    const request = store.getAll();
    
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  // Store attendance data for offline access
  async storeAttendanceRecords(records: any[]): Promise<void> {
    if (!this.db) await this.initDB();
    
    const transaction = this.db!.transaction(['attendance'], 'readwrite');
    const store = transaction.objectStore('attendance');
    
    for (const record of records) {
      await store.put(record);
    }
  }

  // Get offline attendance records
  async getOfflineAttendanceRecords(employeeId?: string, date?: string): Promise<any[]> {
    if (!this.db) await this.initDB();
    
    const transaction = this.db!.transaction(['attendance'], 'readonly');
    const store = transaction.objectStore('attendance');
    
    if (employeeId) {
      const index = store.index('employeeId');
      const request = index.getAll(employeeId);
      return new Promise((resolve) => {
        request.onsuccess = () => resolve(request.result || []);
      });
    }
    
    if (date) {
      const index = store.index('date');
      const request = index.getAll(date);
      return new Promise((resolve) => {
        request.onsuccess = () => resolve(request.result || []);
      });
    }
    
    const request = store.getAll();
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  // Clear all offline data
  async clearAllData(): Promise<void> {
    if (!this.db) await this.initDB();
    
    const storeNames = ['apiCache', 'pendingActions', 'employees', 'attendance'];
    
    for (const storeName of storeNames) {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      await store.clear();
    }
  }

  // Clean up expired cache entries
  async cleanupExpiredCache(): Promise<void> {
    if (!this.db) await this.initDB();
    
    const transaction = this.db!.transaction(['apiCache'], 'readwrite');
    const store = transaction.objectStore('apiCache');
    const index = store.index('timestamp');
    const request = index.openCursor();
    
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        const record = cursor.value;
        if (Date.now() > record.expiry) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
  }
}

// Local Storage utilities for simpler data
export class LocalStorageManager {
  private prefix = 'nexlinx-ems-';

  set(key: string, value: any, ttlMinutes?: number): void {
    const data = {
      value,
      timestamp: Date.now(),
      expiry: ttlMinutes ? Date.now() + (ttlMinutes * 60 * 1000) : null
    };
    
    localStorage.setItem(this.prefix + key, JSON.stringify(data));
  }

  get(key: string): any | null {
    const stored = localStorage.getItem(this.prefix + key);
    if (!stored) return null;
    
    try {
      const data = JSON.parse(stored);
      
      // Check expiry
      if (data.expiry && Date.now() > data.expiry) {
        this.remove(key);
        return null;
      }
      
      return data.value;
    } catch (error) {
      console.error('Error parsing stored data:', error);
      this.remove(key);
      return null;
    }
  }

  remove(key: string): void {
    localStorage.removeItem(this.prefix + key);
  }

  clear(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }

  // Store user session data
  setUserSession(user: any): void {
    this.set('user-session', user, 1440); // 24 hours
  }

  getUserSession(): any | null {
    return this.get('user-session');
  }

  // Store dashboard preferences
  setDashboardPreferences(prefs: any): void {
    this.set('dashboard-preferences', prefs);
  }

  getDashboardPreferences(): any | null {
    return this.get('dashboard-preferences');
  }

  // Store location data
  setLastKnownLocation(location: any): void {
    this.set('last-location', location, 360); // 6 hours
  }

  getLastKnownLocation(): any | null {
    return this.get('last-location');
  }
}

// Offline sync manager
export class OfflineSyncManager {
  private offlineStorage: OfflineStorageManager;
  private localStorage: LocalStorageManager;
  private isOnline: boolean = navigator.onLine;

  constructor() {
    this.offlineStorage = new OfflineStorageManager();
    this.localStorage = new LocalStorageManager();
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingActions();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // Queue action for offline sync
  async queueAction(type: string, data: any): Promise<string> {
    if (this.isOnline) {
      // Try to execute immediately if online
      try {
        await this.executeAction(type, data);
        return 'executed';
      } catch (error) {
        console.warn('Action failed, queuing for offline sync:', error);
      }
    }
    
    return await this.offlineStorage.storeOfflineAction({ type, data });
  }

  // Sync all pending actions when online
  async syncPendingActions(): Promise<void> {
    if (!this.isOnline) return;
    
    const pendingActions = await this.offlineStorage.getPendingActions();
    console.log(`Syncing ${pendingActions.length} pending actions...`);
    
    for (const action of pendingActions) {
      try {
        await this.executeAction(action.type, action.data);
        await this.offlineStorage.removeOfflineAction(action.id);
        console.log(`Synced action: ${action.type}`);
      } catch (error) {
        console.error(`Failed to sync action ${action.type}:`, error);
        // Could implement retry logic here
      }
    }
  }

  // Execute specific action types
  private async executeAction(type: string, data: any): Promise<void> {
    switch (type) {
      case 'punch-in':
      case 'punch-out':
        await fetch('/api/mobile/punch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        break;
        
      case 'location-update':
        await fetch('/api/location/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        break;
        
      case 'user-preferences':
        await fetch('/api/user/preferences', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        break;
        
      default:
        console.warn('Unknown action type:', type);
    }
  }

  getConnectionStatus(): boolean {
    return this.isOnline;
  }

  // Force sync
  async forcSync(): Promise<void> {
    await this.syncPendingActions();
  }
}

// Export instances
export const offlineStorage = new OfflineStorageManager();
export const localStorage = new LocalStorageManager();
export const offlineSync = new OfflineSyncManager();