/**
 * React Hook for Sync Manager Integration
 * Provides easy access to sync functionality and real-time status updates
 */

import { useState, useEffect, useCallback } from 'react';
import { syncManager } from '../utils/syncManager';

interface SyncStats {
  totalPending: number;
  totalCompleted: number;
  totalFailed: number;
  lastSyncTime?: number;
  nextSyncTime?: number;
}

interface SyncManagerHook {
  stats: SyncStats;
  isOnline: boolean;
  isSyncing: boolean;
  queueAttendancePunch: (data: any) => Promise<void>;
  queueLocationUpdate: (data: any) => Promise<void>;
  queuePerformanceData: (data: any) => Promise<void>;
  queueUserAction: (data: any) => Promise<void>;
  triggerSync: () => Promise<void>;
  clearFailedItems: () => Promise<void>;
  retryFailedItems: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

export const useSyncManager = (): SyncManagerHook => {
  const [stats, setStats] = useState<SyncStats>({
    totalPending: 0,
    totalCompleted: 0,
    totalFailed: 0
  });
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  // Update stats from sync manager
  const updateStats = useCallback((newStats: SyncStats) => {
    setStats(newStats);
  }, []);

  // Initialize sync manager listener
  useEffect(() => {
    syncManager.addSyncListener(updateStats);
    
    // Initial stats load
    syncManager.getSyncStats().then(setStats);

    // Network status listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      syncManager.removeSyncListener(updateStats);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updateStats]);

  // Queue attendance punch data
  const queueAttendancePunch = useCallback(async (punchData: {
    employeeId: string;
    action: 'in' | 'out';
    timestamp: number;
    location?: { latitude: number; longitude: number; source: string };
    deviceInfo?: any;
  }) => {
    await syncManager.queueAttendancePunch(punchData);
  }, []);

  // Queue location update
  const queueLocationUpdate = useCallback(async (locationData: {
    employeeId: string;
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
    source: string;
  }) => {
    await syncManager.queueLocationUpdate(locationData);
  }, []);

  // Queue performance data
  const queuePerformanceData = useCallback(async (performanceData: {
    employeeId: string;
    metrics: any;
    timestamp: number;
  }) => {
    await syncManager.queuePerformanceData(performanceData);
  }, []);

  // Queue user action
  const queueUserAction = useCallback(async (actionData: {
    employeeId: string;
    action: string;
    data: any;
    timestamp: number;
  }) => {
    await syncManager.queueUserAction(actionData);
  }, []);

  // Trigger immediate sync
  const triggerSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      await syncManager.triggerSync();
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Clear failed items
  const clearFailedItems = useCallback(async () => {
    await syncManager.clearFailedItems();
    await refreshStats();
  }, []);

  // Retry failed items
  const retryFailedItems = useCallback(async () => {
    await syncManager.retryFailedItems();
    await refreshStats();
  }, []);

  // Refresh stats manually
  const refreshStats = useCallback(async () => {
    const newStats = await syncManager.getSyncStats();
    setStats(newStats);
  }, []);

  return {
    stats,
    isOnline,
    isSyncing,
    queueAttendancePunch,
    queueLocationUpdate,
    queuePerformanceData,
    queueUserAction,
    triggerSync,
    clearFailedItems,
    retryFailedItems,
    refreshStats
  };
};

export default useSyncManager;