/**
 * Fast Dashboard Cache Service
 * Provides sub-500ms dashboard metrics by caching heavy calculations
 * Updates cache every 30 seconds to ensure fresh data with fast delivery
 */

import { storage } from '../storage';

interface CachedMetrics {
  totalEmployees: number;
  totalPunchIn: number;
  totalPunchOut: number;
  presentToday: number;
  absentToday: number;
  completedToday: number;
  lateArrivals: number;
  attendanceRate: number;
  averageWorkingHours: number;
  overtimeHours: number;
  totalHoursWorked: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  calculatedAt: string;
  targetDate: string;
  cacheTimestamp: number;
}

class FastDashboardCache {
  private cache: CachedMetrics | null = null;
  private lastUpdate: number = 0;
  private readonly CACHE_DURATION = 30000; // 30 seconds - optimized for performance vs freshness
  private isUpdating = false;

  async getFastMetrics(): Promise<CachedMetrics> {
    const now = Date.now();
    
    // Return cached data immediately if available and fresh
    if (this.cache && (now - this.lastUpdate) < this.CACHE_DURATION) {
      console.log(`[FastCache] Returning cached metrics (${Math.round((now - this.lastUpdate) / 1000)}s old)`);
      return this.cache;
    }

    // If cache is stale but exists, return it while updating in background
    if (this.cache && !this.isUpdating) {
      console.log(`[FastCache] Returning stale cache while updating in background`);
      this.updateCacheAsync(); // Update in background
      return this.cache;
    }

    // No cache available, must wait for fresh data
    console.log(`[FastCache] No cache available, fetching fresh data`);
    return await this.updateCache();
  }

  private async updateCacheAsync(): Promise<void> {
    if (this.isUpdating) return;
    
    try {
      await this.updateCache();
    } catch (error) {
      console.error('[FastCache] Background update failed:', error);
    }
  }

  private async updateCache(): Promise<CachedMetrics> {
    if (this.isUpdating) {
      // If already updating, wait for it to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      return this.cache || this.getDefaultMetrics();
    }

    this.isUpdating = true;
    console.log(`[FastCache] Updating cache with fresh data`);

    try {
      // Use the unified attendance service for consistent, optimized metrics
      const { unifiedAttendanceService } = await import('./unifiedAttendanceService');
      const todayPKT = new Date().toISOString().split('T')[0];
      const todayMetrics = await unifiedAttendanceService.calculateMetrics(new Date(todayPKT));

      // Determine system health
      let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (todayMetrics.attendanceRate < 50) {
        systemHealth = 'critical';
      } else if (todayMetrics.attendanceRate < 80) {
        systemHealth = 'warning';
      }

      this.cache = {
        totalEmployees: todayMetrics.totalEmployees,
        totalPunchIn: todayMetrics.totalPunchIn,
        totalPunchOut: todayMetrics.totalPunchOut,
        presentToday: todayMetrics.presentToday,
        absentToday: todayMetrics.absentToday,
        completedToday: todayMetrics.completedToday,
        lateArrivals: todayMetrics.lateArrivals,
        attendanceRate: parseFloat(todayMetrics.attendanceRate.toFixed(1)),
        averageWorkingHours: Math.round(todayMetrics.averageWorkingHours * 10) / 10,
        overtimeHours: todayMetrics.overtimeHours,
        totalHoursWorked: todayMetrics.totalHoursWorked,
        systemHealth,
        calculatedAt: todayMetrics.calculatedAt,
        targetDate: todayPKT,
        cacheTimestamp: Date.now()
      };

      this.lastUpdate = Date.now();
      console.log(`[FastCache] Cache updated successfully: ${this.cache.presentToday} present, ${this.cache.attendanceRate}% rate`);
      
      return this.cache;
    } catch (error) {
      console.error('[FastCache] Failed to update cache:', error);
      
      // Return stale cache if available, otherwise default metrics
      if (this.cache) {
        console.log('[FastCache] Returning stale cache due to update error');
        return this.cache;
      }
      
      return this.getDefaultMetrics();
    } finally {
      this.isUpdating = false;
    }
  }

  private getDefaultMetrics(): CachedMetrics {
    const now = new Date();
    return {
      totalEmployees: 0,
      totalPunchIn: 0,
      totalPunchOut: 0,
      presentToday: 0,
      absentToday: 0,
      completedToday: 0,
      lateArrivals: 0,
      attendanceRate: 0,
      averageWorkingHours: 0,
      overtimeHours: 0,
      totalHoursWorked: 0,
      systemHealth: 'warning',
      calculatedAt: now.toISOString(),
      targetDate: now.toISOString().split('T')[0],
      cacheTimestamp: Date.now()
    };
  }

  // Initialize cache on startup
  async initializeCache(): Promise<void> {
    console.log('[FastCache] Initializing dashboard cache on startup');
    try {
      await this.updateCache();
      console.log('[FastCache] Initial cache populated successfully');
    } catch (error) {
      console.error('[FastCache] Failed to initialize cache:', error);
    }
  }

  // Force cache refresh (useful for manual updates)
  async refreshCache(): Promise<CachedMetrics> {
    console.log('[FastCache] Force refreshing cache');
    this.lastUpdate = 0; // Force refresh
    return await this.updateCache();
  }
}

export const fastDashboardCache = new FastDashboardCache();

// Initialize cache on module load
fastDashboardCache.initializeCache().catch(error => {
  console.error('[FastCache] Startup initialization failed:', error);
});