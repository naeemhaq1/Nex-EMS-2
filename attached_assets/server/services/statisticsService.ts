import { db } from '../db';
import { sql } from 'drizzle-orm';
import { format } from 'date-fns';

interface DailyStatistics {
  date: string;
  punctualityBreakdown: {
    onTime: { count: number; percentage: number };
    grace: { count: number; percentage: number };
    late: { count: number; percentage: number };
  };
  weeklyHours: {
    day: string;
    hours: number;
  }[];
  performanceTrends: {
    week: string;
    punctuality: number;
    consistency: number;
    efficiency: number;
  }[];
  todaysActivity: {
    firstPunchIn: string;
    activeEmployees: number;
    totalEmployees: number;
    completedShifts: number;
    averageHours: number;
    totalHours: number;
    activityStatus: string;
    mobilePunches: number;
    terminalPunches: number;
  };
  lastCalculated: string;
}

export class StatisticsService {
  private static cachedStats: DailyStatistics | null = null;

  /**
   * Calculate comprehensive daily statistics and cache them
   */
  static async calculateDailyStatistics(): Promise<DailyStatistics> {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      console.log('[StatisticsService] Calculating daily statistics...');
      
      // Calculate punctuality breakdown
      const punctualityStats = await this.calculatePunctualityBreakdown(today);
      
      // Calculate weekly hours
      const weeklyHours = await this.calculateWeeklyHours();
      
      // Calculate performance trends
      const performanceTrends = await this.calculatePerformanceTrends();
      
      // Calculate today's activity
      const todaysActivity = await this.calculateTodaysActivity(today);
      
      const statistics: DailyStatistics = {
        date: today,
        punctualityBreakdown: punctualityStats,
        weeklyHours,
        performanceTrends,
        todaysActivity,
        lastCalculated: new Date().toISOString()
      };
      
      // Cache the results
      this.cachedStats = statistics;
      
      console.log('[StatisticsService] Daily statistics calculated and cached');
      return statistics;
      
    } catch (error) {
      console.error('[StatisticsService] Error calculating daily statistics:', error);
      throw error;
    }
  }

  /**
   * Get cached statistics or calculate if not available
   */
  static async getDailyStatistics(): Promise<DailyStatistics> {
    if (this.cachedStats && this.isStatsCurrent()) {
      return this.cachedStats;
    }
    
    return await this.calculateDailyStatistics();
  }

  /**
   * Force refresh statistics (clear cache and recalculate)
   */
  static async refreshStatistics(): Promise<DailyStatistics> {
    console.log('[StatisticsService] Force refreshing statistics...');
    this.cachedStats = null;
    return await this.calculateDailyStatistics();
  }

  /**
   * Check if cached stats are current (same day)
   */
  private static isStatsCurrent(): boolean {
    if (!this.cachedStats) return false;
    
    const today = new Date().toISOString().split('T')[0];
    return this.cachedStats.date === today;
  }

  /**
   * Calculate punctuality breakdown for today
   */
  private static async calculatePunctualityBreakdown(date: string) {
    const punctualityStats = await db.execute(sql`
      WITH attendance_data AS (
        SELECT 
          ar.employee_code,
          ar.check_in,
          CASE 
            WHEN ar.check_in IS NULL THEN 'absent'
            WHEN EXTRACT(HOUR FROM ar.check_in) * 60 + EXTRACT(MINUTE FROM ar.check_in) <= 540 THEN 'on_time'
            WHEN EXTRACT(HOUR FROM ar.check_in) * 60 + EXTRACT(MINUTE FROM ar.check_in) <= 570 THEN 'grace'
            ELSE 'late'
          END as punctuality_status
        FROM attendance_records ar
        WHERE ar.date >= ${date}::date
        AND ar.date < ${date}::date + INTERVAL '1 day'
        AND ar.check_in IS NOT NULL
      )
      SELECT 
        punctuality_status,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as percentage
      FROM attendance_data
      GROUP BY punctuality_status
      ORDER BY 
        CASE punctuality_status 
          WHEN 'on_time' THEN 1 
          WHEN 'grace' THEN 2 
          WHEN 'late' THEN 3 
        END
    `);

    const result = {
      onTime: { count: 0, percentage: 0 },
      grace: { count: 0, percentage: 0 },
      late: { count: 0, percentage: 0 }
    };

    punctualityStats.forEach(stat => {
      const count = Number(stat.count) || 0;
      const percentage = Number(stat.percentage) || 0;
      
      switch (stat.punctuality_status) {
        case 'on_time':
          result.onTime = { count, percentage };
          break;
        case 'grace':
          result.grace = { count, percentage };
          break;
        case 'late':
          result.late = { count, percentage };
          break;
      }
    });

    return result;
  }

  /**
   * Calculate weekly hours
   */
  private static async calculateWeeklyHours() {
    const weeklyHours = await db.execute(sql`
      WITH daily_hours AS (
        SELECT 
          EXTRACT(DOW FROM ar.date) as day_of_week,
          TO_CHAR(ar.date, 'Dy') as day_name,
          SUM(COALESCE(ar.total_hours, 0)) as total_hours
        FROM attendance_records ar
        WHERE ar.date >= CURRENT_DATE - INTERVAL '7 days'
        AND ar.date < CURRENT_DATE
        GROUP BY EXTRACT(DOW FROM ar.date), TO_CHAR(ar.date, 'Dy')
      ),
      all_days AS (
        SELECT unnest(ARRAY[1,2,3,4,5,6,0]) as day_of_week,
               unnest(ARRAY['Mon','Tue','Wed','Thu','Fri','Sat','Sun']) as day_name
      )
      SELECT 
        ad.day_name as day,
        COALESCE(dh.total_hours, 0) as hours
      FROM all_days ad
      LEFT JOIN daily_hours dh ON ad.day_of_week = dh.day_of_week
      ORDER BY 
        CASE ad.day_of_week 
          WHEN 1 THEN 1 WHEN 2 THEN 2 WHEN 3 THEN 3 WHEN 4 THEN 4 
          WHEN 5 THEN 5 WHEN 6 THEN 6 WHEN 0 THEN 7 
        END
    `);

    return weeklyHours.map(day => ({
      day: day.day,
      hours: Math.round(Number(day.hours) * 10) / 10
    }));
  }

  /**
   * Calculate performance trends (last 4 weeks)
   */
  private static async calculatePerformanceTrends() {
    const performanceTrends = await db.execute(sql`
      WITH weekly_data AS (
        SELECT 
          DATE_TRUNC('week', ar.date) as week_start,
          'W' || EXTRACT(WEEK FROM ar.date) - EXTRACT(WEEK FROM DATE_TRUNC('month', ar.date)) + 1 as week_label,
          COUNT(DISTINCT ar.employee_code) as total_employees,
          COUNT(CASE WHEN EXTRACT(HOUR FROM ar.check_in) * 60 + EXTRACT(MINUTE FROM ar.check_in) <= 540 THEN 1 END) as on_time_count,
          COUNT(ar.employee_code) as total_attendance,
          AVG(COALESCE(ar.total_hours, 0)) as avg_hours
        FROM attendance_records ar
        WHERE ar.date >= CURRENT_DATE - INTERVAL '4 weeks'
        AND ar.date < CURRENT_DATE
        AND ar.check_in IS NOT NULL
        GROUP BY DATE_TRUNC('week', ar.date), week_label
        ORDER BY week_start
      )
      SELECT 
        week_label as week,
        ROUND(COALESCE(on_time_count * 100.0 / NULLIF(total_attendance, 0), 0), 1) as punctuality,
        ROUND(COALESCE(total_employees * 100.0 / 317.0, 0), 1) as consistency,
        ROUND(COALESCE(avg_hours * 100.0 / 8.0, 0), 1) as efficiency
      FROM weekly_data
      LIMIT 4
    `);

    return performanceTrends.map((week, index) => ({
      week: `W${index + 1}`,
      punctuality: Math.min(100, Number(week.punctuality) || 0),
      consistency: Math.min(100, Number(week.consistency) || 0),
      efficiency: Math.min(100, Number(week.efficiency) || 0)
    }));
  }

  /**
   * Calculate today's activity
   */
  private static async calculateTodaysActivity(date: string) {
    const activityStats = await db.execute(sql`
      WITH activity_data AS (
        SELECT 
          MIN(ar.check_in) as first_punch_in,
          COUNT(DISTINCT ar.employee_code) as active_employees,
          COUNT(CASE WHEN ar.check_in IS NOT NULL AND ar.check_out IS NOT NULL THEN 1 END) as completed_shifts,
          AVG(CASE WHEN ar.total_hours > 0 THEN ar.total_hours END) as avg_hours,
          SUM(COALESCE(ar.total_hours, 0)) as total_hours,
          COUNT(CASE WHEN ar.punch_source = 'mobile' THEN 1 END) as mobile_punches,
          COUNT(CASE WHEN ar.punch_source IS NULL OR ar.punch_source = 'terminal' THEN 1 END) as terminal_punches
        FROM attendance_records ar
        WHERE ar.date >= ${date}::date
        AND ar.date < ${date}::date + INTERVAL '1 day'
      ),
      employee_count AS (
        SELECT COUNT(*) as total_active
        FROM employee_records er
        WHERE er.is_active = true
        AND er.system_account = false
        AND er.department != 'EX-EMPLOYEES'
      )
      SELECT 
        ad.*,
        ec.total_active,
        CASE 
          WHEN ad.active_employees > 100 THEN 'High Activity'
          WHEN ad.active_employees > 50 THEN 'Moderate Activity'
          ELSE 'Low Activity'
        END as activity_status
      FROM activity_data ad, employee_count ec
    `);

    const stats = activityStats[0];
    
    return {
      firstPunchIn: stats?.first_punch_in ? 
        new Date(stats.first_punch_in).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }) : '--:--',
      activeEmployees: Number(stats?.active_employees) || 0,
      totalEmployees: Number(stats?.total_active) || 0,
      completedShifts: Number(stats?.completed_shifts) || 0,
      averageHours: Math.round((Number(stats?.avg_hours) || 0) * 10) / 10,
      totalHours: Math.round((Number(stats?.total_hours) || 0) * 10) / 10,
      activityStatus: stats?.activity_status || 'No Activity',
      mobilePunches: Number(stats?.mobile_punches) || 0,
      terminalPunches: Number(stats?.terminal_punches) || 0
    };
  }

  /**
   * Get statistics summary for logging/debugging
   */
  static getStatsSummary(): string {
    if (!this.cachedStats) return 'No cached statistics';
    
    const stats = this.cachedStats;
    return `Stats for ${stats.date}: ${stats.todaysActivity.activeEmployees} active employees, ` +
           `${stats.punctualityBreakdown.onTime.count} on-time, calculated at ${format(new Date(stats.lastCalculated), 'HH:mm:ss')}`;
  }
}