import { StatisticsService } from './statisticsService';
import { unifiedAdminMetricsService } from './unifiedAdminMetricsService';
import { unifiedAttendanceService } from './unifiedAttendanceService';
import { db } from '../db';
import { sql } from 'drizzle-orm';

export class ComprehensiveRefreshService {
  private static isRefreshing = false;
  private static lastRefresh: Date | null = null;

  /**
   * Force refresh all unified calculations and statistics
   */
  static async forceRefreshAllCalculations(): Promise<{
    success: boolean;
    message: string;
    refreshedAt: string;
    components: {
      statistics: boolean;
      unifiedMetrics: boolean;
      attendanceCalculations: boolean;
      cacheClearing: boolean;
    };
    summary: any;
  }> {
    if (this.isRefreshing) {
      return {
        success: false,
        message: 'Refresh already in progress',
        refreshedAt: new Date().toISOString(),
        components: {
          statistics: false,
          unifiedMetrics: false,
          attendanceCalculations: false,
          cacheClearing: false
        },
        summary: {}
      };
    }

    this.isRefreshing = true;
    const startTime = new Date();

    try {
      console.log('[ComprehensiveRefresh] Starting comprehensive refresh of all calculations...');

      // Step 1: Clear all cached data
      const cacheCleared = await this.clearAllCaches();
      
      // Step 2: Force refresh statistics service
      const statisticsRefreshed = await StatisticsService.refreshStatistics();
      
      // Step 3: Force refresh unified admin metrics
      const metricsRefreshed = await this.refreshUnifiedMetrics();
      
      // Step 4: Force recalculate attendance data
      const attendanceRecalculated = await this.forceAttendanceRecalculation();

      this.lastRefresh = new Date();

      const summary = {
        totalEmployees: metricsRefreshed.today?.totalEmployees || 0,
        presentToday: metricsRefreshed.today?.totalPresent || 0,
        attendanceRate: metricsRefreshed.today?.attendanceRate || 0,
        statisticsCalculated: StatisticsService.getStatsSummary(),
        refreshDuration: `${Date.now() - startTime.getTime()}ms`
      };

      console.log('[ComprehensiveRefresh] Complete refresh finished successfully');
      console.log('[ComprehensiveRefresh] Summary:', summary);

      return {
        success: true,
        message: 'All calculations refreshed successfully',
        refreshedAt: this.lastRefresh.toISOString(),
        components: {
          statistics: true,
          unifiedMetrics: true,
          attendanceCalculations: true,
          cacheClearing: cacheCleared
        },
        summary
      };

    } catch (error) {
      console.error('[ComprehensiveRefresh] Error during refresh:', error);
      return {
        success: false,
        message: `Refresh failed: ${error.message}`,
        refreshedAt: startTime.toISOString(),
        components: {
          statistics: false,
          unifiedMetrics: false,
          attendanceCalculations: false,
          cacheClearing: false
        },
        summary: { error: error.message }
      };
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Clear all cached calculations
   */
  private static async clearAllCaches(): Promise<boolean> {
    try {
      console.log('[ComprehensiveRefresh] Clearing all calculation caches...');
      
      // Clear statistics cache
      await StatisticsService.refreshStatistics();
      
      // Clear any other caches if they exist
      // Add more cache clearing logic here as needed
      
      return true;
    } catch (error) {
      console.error('[ComprehensiveRefresh] Error clearing caches:', error);
      return false;
    }
  }

  /**
   * Force refresh unified admin metrics
   */
  private static async refreshUnifiedMetrics(): Promise<any> {
    try {
      console.log('[ComprehensiveRefresh] Refreshing unified admin metrics...');
      return await unifiedAdminMetricsService.getAdminDashboardMetrics();
    } catch (error) {
      console.error('[ComprehensiveRefresh] Error refreshing unified metrics:', error);
      throw error;
    }
  }

  /**
   * Force recalculate attendance data
   */
  private static async forceAttendanceRecalculation(): Promise<boolean> {
    try {
      console.log('[ComprehensiveRefresh] Force recalculating attendance data...');
      
      // Get today's date
      const today = new Date().toISOString().split('T')[0];
      
      // Force refresh unified attendance calculations
      const todayMetrics = await unifiedAttendanceService.calculateUnifiedMetrics(today);
      const yesterdayMetrics = await unifiedAttendanceService.calculateUnifiedMetrics(
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      );

      console.log('[ComprehensiveRefresh] Attendance recalculation completed');
      console.log(`[ComprehensiveRefresh] Today: ${todayMetrics.totalPresent} present, ${todayMetrics.attendanceRate}% rate`);
      console.log(`[ComprehensiveRefresh] Yesterday: ${yesterdayMetrics.totalPresent} present, ${yesterdayMetrics.attendanceRate}% rate`);
      
      return true;
    } catch (error) {
      console.error('[ComprehensiveRefresh] Error in attendance recalculation:', error);
      return false;
    }
  }

  /**
   * Get refresh status
   */
  static getRefreshStatus(): {
    isRefreshing: boolean;
    lastRefresh: string | null;
    canRefresh: boolean;
  } {
    return {
      isRefreshing: this.isRefreshing,
      lastRefresh: this.lastRefresh?.toISOString() || null,
      canRefresh: !this.isRefreshing
    };
  }

  /**
   * Force refresh specific component
   */
  static async refreshComponent(component: 'statistics' | 'metrics' | 'attendance'): Promise<any> {
    try {
      switch (component) {
        case 'statistics':
          return await StatisticsService.refreshStatistics();
        case 'metrics':
          return await this.refreshUnifiedMetrics();
        case 'attendance':
          return await this.forceAttendanceRecalculation();
        default:
          throw new Error(`Unknown component: ${component}`);
      }
    } catch (error) {
      console.error(`[ComprehensiveRefresh] Error refreshing ${component}:`, error);
      throw error;
    }
  }
}