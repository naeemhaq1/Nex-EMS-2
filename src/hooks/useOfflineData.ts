/**
 * useOfflineData Hook
 * Provides offline-first data fetching with caching and sync capabilities
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { offlineStorage, localStorage, offlineSync } from '../utils/offlineStorage';

interface OfflineDataOptions {
  endpoint: string;
  cacheKey: string;
  cacheDuration?: number; // minutes
  fallbackData?: any;
  enableOfflineSync?: boolean;
}

interface OfflineDataResult<T> {
  data: T | null;
  isLoading: boolean;
  isOffline: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  invalidate: () => void;
}

export function useOfflineData<T>(options: OfflineDataOptions): OfflineDataResult<T> {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [error, setError] = useState<Error | null>(null);
  const queryClient = useQueryClient();

  const {
    endpoint,
    cacheKey,
    cacheDuration = 60,
    fallbackData = null,
    enableOfflineSync = false
  } = options;

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Enhanced query with offline support
  const { data, isLoading, refetch: queryRefetch } = useQuery({
    queryKey: [cacheKey],
    queryFn: async () => {
      try {
        // Try network first if online
        if (navigator.onLine) {
          const response = await fetch(endpoint);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const networkData = await response.json();
          
          // Cache the successful response
          await offlineStorage.cacheAPIResponse(cacheKey, networkData, cacheDuration);
          setError(null);
          
          return networkData;
        }
        
        // If offline, try cache
        const cachedData = await offlineStorage.getCachedAPIResponse(cacheKey);
        if (cachedData) {
          setError(null);
          return cachedData;
        }
        
        // If no cache and offline, use fallback
        if (fallbackData) {
          setError(new Error('Using fallback data - offline mode'));
          return fallbackData;
        }
        
        throw new Error('No data available offline');
        
      } catch (err) {
        // On error, try cache as fallback
        const cachedData = await offlineStorage.getCachedAPIResponse(cacheKey);
        if (cachedData) {
          setError(new Error(`Network error, using cached data: ${err.message}`));
          return cachedData;
        }
        
        // Use fallback data if available
        if (fallbackData) {
          const errorMessage = err instanceof Error ? err.message : String(err);
        setError(new Error(`Network and cache failed, using fallback: ${errorMessage}`));
          return fallbackData;
        }
        
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      }
    },
    staleTime: isOffline ? Infinity : (cacheDuration * 60 * 1000) / 2, // Half cache duration when online
    gcTime: cacheDuration * 60 * 1000, // Full cache duration
    retry: (failureCount, error) => {
      // Don't retry if offline
      if (!navigator.onLine) return false;
      // Retry up to 3 times for network errors
      return failureCount < 3;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const refetch = useCallback(async () => {
    try {
      await queryRefetch();
    } catch (err) {
      console.warn('Refetch failed:', err);
    }
  }, [queryRefetch]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [cacheKey] });
    offlineStorage.deleteCachedAPIResponse(cacheKey);
  }, [queryClient, cacheKey]);

  // Auto-refetch when coming back online
  useEffect(() => {
    if (!isOffline && enableOfflineSync) {
      const timer = setTimeout(() => {
        refetch();
      }, 1000); // Small delay to ensure connection is stable

      return () => clearTimeout(timer);
    }
  }, [isOffline, refetch, enableOfflineSync]);

  return {
    data: data || null,
    isLoading,
    isOffline,
    error,
    refetch,
    invalidate
  };
}

// Hook for offline mutations
export function useOfflineMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
    enableOfflineQueue?: boolean;
    actionType?: string;
  }
) {
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  const mutation = useMutation({
    mutationFn: async (variables: TVariables) => {
      setIsPending(true);
      
      try {
        // If online, execute immediately
        if (navigator.onLine) {
          const result = await mutationFn(variables);
          options?.onSuccess?.(result, variables);
          return result;
        }
        
        // If offline and queue enabled, queue the action
        if (options?.enableOfflineQueue && options?.actionType) {
          const actionId = await offlineSync.queueAction(options.actionType, variables);
          console.log(`Queued offline action: ${options.actionType}`, actionId);
          
          // Return a placeholder result
          const placeholderResult = { success: true, queued: true, actionId } as TData;
          options?.onSuccess?.(placeholderResult, variables);
          return placeholderResult;
        }
        
        throw new Error('Cannot perform action while offline');
        
      } catch (error) {
        options?.onError?.(error as Error, variables);
        throw error;
      } finally {
        setIsPending(false);
      }
    }
  });

  return {
    ...mutation,
    isPending: isPending || mutation.isPending
  };
}

// Hook for managing offline user preferences
export function useOfflinePreferences<T>(key: string, defaultValue: T) {
  const [preferences, setPreferences] = useState<T>(() => {
    return localStorage.get(`preferences-${key}`) || defaultValue;
  });

  const updatePreferences = useCallback((newPrefs: Partial<T>) => {
    const updated = { ...preferences, ...newPrefs };
    setPreferences(updated);
    localStorage.set(`preferences-${key}`, updated);
    
    // Also try to sync to server if online
    if (navigator.onLine && typeof window !== 'undefined') {
      fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: updated })
      }).catch(err => {
        console.warn('Failed to sync preferences to server:', err);
        // Queue for offline sync
        offlineSync.queueAction('user-preferences', { [key]: updated });
      });
    }
  }, [preferences, key]);

  return [preferences, updatePreferences] as const;
}

// Hook for connection status
export function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastOnline, setLastOnline] = useState<Date | null>(
    isOnline ? new Date() : null
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastOnline(new Date());
      
      // Trigger sync when coming back online
      offlineSync.forcSync().catch(err => {
        console.warn('Failed to sync pending actions:', err);
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    lastOnline,
    connectionStatus: isOnline ? 'online' : 'offline'
  };
}

// Hook for offline employee data
export function useOfflineEmployees() {
  return useOfflineData<any[]>({
    endpoint: '/api/employees',
    cacheKey: 'employees-list',
    cacheDuration: 1440, // 24 hours
    fallbackData: [],
    enableOfflineSync: true
  });
}

// Hook for offline attendance data
export function useOfflineAttendance(employeeId?: string, date?: string) {
  const cacheKey = `attendance-${employeeId || 'all'}-${date || 'latest'}`;
  const endpoint = `/api/attendance/records${employeeId ? `?employeeId=${employeeId}` : ''}${date ? `&date=${date}` : ''}`;
  
  return useOfflineData<any[]>({
    endpoint,
    cacheKey,
    cacheDuration: 60, // 1 hour
    fallbackData: [],
    enableOfflineSync: true
  });
}

// Hook for offline dashboard metrics
export function useOfflineDashboardMetrics() {
  return useOfflineData<any>({
    endpoint: '/api/dashboard/metrics',
    cacheKey: 'dashboard-metrics',
    cacheDuration: 30, // 30 minutes
    fallbackData: {
      totalActiveUsers: 0,
      totalSystemUsers: 0,
      todayAttendance: 0,
      presentToday: 0,
      absentToday: 0,
      lateArrivals: 0,
      attendanceRate: 0,
      systemHealth: 'unknown'
    },
    enableOfflineSync: true
  });
}