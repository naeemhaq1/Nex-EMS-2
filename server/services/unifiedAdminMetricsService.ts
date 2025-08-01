import { db } from '../db';
import { sql } from 'drizzle-orm';
import { attendanceRecords, employeeRecords } from '@shared/schema';
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

interface DailyMetrics {
  date: string;
  totalEmployees: number;
  totalPresent: number;
  totalAbsent: number;
  lateArrivals: number;
  gracePeriodUsage: number;
  nonBioAttendance: number;
  totalPunchIn: number;
  totalPunchOut: number;
  totalHours: number;
  attendanceRate: number;
  punctualityRate: number;
  completedShifts: number;
}

interface WeeklyMetrics {
  weekStart: string;
  weekEnd: string;
  averageDaily: DailyMetrics;
  totalWeeklyHours: number;
  averageAttendanceRate: number;
  averagePunctualityRate: number;
  bestDay: { date: string; attendanceRate: number };
  worstDay: { date: string; attendanceRate: number };
}

interface MonthlyMetrics {
  monthStart: string;
  monthEnd: string;
  averageDaily: DailyMetrics;
  totalMonthlyHours: number;
  averageAttendanceRate: number;
  averagePunctualityRate: number;
  topPerformingWeek: { weekStart: string; attendanceRate: number };
  bottomPerformingWeek: { weekStart: string; attendanceRate: number };
  trendDirection: 'improving' | 'declining' | 'stable';
}

export class UnifiedAdminMetricsService {
  private static readonly MAX_BIOMETRIC_CAPACITY = 228;

  /**
   * Calculate comprehensive daily metrics
   */
  async getDailyMetrics(date: Date = new Date()): Promise<DailyMetrics> {
    const startDate = startOfDay(date);
    const endDate = endOfDay(date);
    const dateStr = format(date, 'yyyy-MM-dd');

    try {
      // Get total active employees
      const activeEmployeesResult = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM employee_records er
        WHERE er.is_active = true 
        AND er.system_account = false
      `);
      const totalEmployees = Number(activeEmployeesResult[0]?.count) || 0;

      // Get attendance statistics for the day using correct schema
      const attendanceStats = await db.execute(sql`
        SELECT 
          COUNT(DISTINCT ar.employee_code) as unique_employees,
          COUNT(CASE WHEN ar.check_in IS NOT NULL THEN 1 END) as total_punch_in,
          COUNT(CASE WHEN ar.check_out IS NOT NULL THEN 1 END) as total_punch_out,
          COUNT(CASE WHEN ar.check_in IS NOT NULL AND EXTRACT(HOUR FROM ar.check_in) * 60 + EXTRACT(MINUTE FROM ar.check_in) > 570 THEN 1 END) as late_arrivals,
          COUNT(CASE WHEN ar.check_in IS NOT NULL AND EXTRACT(HOUR FROM ar.check_in) * 60 + EXTRACT(MINUTE FROM ar.check_in) BETWEEN 540 AND 570 THEN 1 END) as grace_period,
          SUM(CASE WHEN ar.total_hours IS NOT NULL THEN ar.total_hours ELSE 0 END) as total_hours,
          COUNT(CASE WHEN ar.punch_source = 'terminal' OR ar.punch_source = 'biometric' OR ar.punch_source IS NULL THEN 1 END) as biometric_records,
          COUNT(CASE WHEN ar.punch_source = 'mobile' THEN 1 END) as mobile_records
        FROM attendance_records ar
        WHERE ar.date >= ${dateStr}::date
        AND ar.date < ${dateStr}::date + INTERVAL '1 day'
      `);

      const stats = attendanceStats[0] || {};
      const uniqueEmployees = Number(stats.unique_employees) || 0;
      const totalPunchIn = Number(stats.total_punch_in) || 0;
      const totalPunchOut = Number(stats.total_punch_out) || 0;
      const lateArrivals = Number(stats.late_arrivals) || 0;
      const gracePeriodUsage = Number(stats.grace_period) || 0;
      const totalHours = Number(stats.total_hours) || 0;
      const biometricRecords = Number(stats.biometric_records) || 0;
      const mobileRecords = Number(stats.mobile_records) || 0;

      // Calculate NonBio using biometric exemptions from database
      const biometricExemptionsResult = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM biometric_exemptions 
        WHERE is_active = true
      `);
      const nonBioAttendance = Number(biometricExemptionsResult[0]?.count) || 0;
      
      // Calculate present employees (employees who punched in)
      const totalPresent = uniqueEmployees;
      const totalAbsent = Math.max(0, totalEmployees - uniqueEmployees);
      
      // Calculate rates
      const attendanceRate = totalEmployees > 0 ? 
        ((uniqueEmployees + nonBioAttendance) / totalEmployees) * 100 : 0;
      
      const punctualityRate = uniqueEmployees > 0 ? 
        ((uniqueEmployees - lateArrivals) / uniqueEmployees) * 100 : 0;

      // Estimate completed shifts (employees with both punch-in and punch-out)
      const completedShifts = Math.min(totalPunchIn, totalPunchOut);

      return {
        date: dateStr,
        totalEmployees,
        totalPresent,
        totalAbsent,
        lateArrivals,
        gracePeriodUsage,
        nonBioAttendance,
        totalPunchIn,
        totalPunchOut,
        totalHours: Math.round(totalHours * 100) / 100,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
        punctualityRate: Math.round(punctualityRate * 100) / 100,
        completedShifts
      };
    } catch (error) {
      console.error(`Error calculating daily metrics for ${dateStr}:`, error);
      return this.getDefaultDailyMetrics(dateStr);
    }
  }

  /**
   * Calculate weekly metrics with averages and trends
   */
  async getWeeklyMetrics(date: Date = new Date()): Promise<WeeklyMetrics> {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 }); // Sunday

    try {
      const dailyMetrics: DailyMetrics[] = [];
      
      // Get metrics for each day of the week
      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(weekStart);
        currentDate.setDate(weekStart.getDate() + i);
        
        if (currentDate <= new Date()) { // Only get metrics for past/current days
          const dayMetrics = await this.getDailyMetrics(currentDate);
          dailyMetrics.push(dayMetrics);
        }
      }

      if (dailyMetrics.length === 0) {
        return this.getDefaultWeeklyMetrics(weekStart, weekEnd);
      }

      // Calculate averages
      const averageDaily = this.calculateAverageDailyMetrics(dailyMetrics);
      const totalWeeklyHours = dailyMetrics.reduce((sum, day) => sum + day.totalHours, 0);
      const averageAttendanceRate = dailyMetrics.reduce((sum, day) => sum + day.attendanceRate, 0) / dailyMetrics.length;
      const averagePunctualityRate = dailyMetrics.reduce((sum, day) => sum + day.punctualityRate, 0) / dailyMetrics.length;

      // Find best and worst days
      const bestDay = dailyMetrics.reduce((best, current) => 
        current.attendanceRate > best.attendanceRate ? current : best
      );
      const worstDay = dailyMetrics.reduce((worst, current) => 
        current.attendanceRate < worst.attendanceRate ? current : worst
      );

      return {
        weekStart: format(weekStart, 'yyyy-MM-dd'),
        weekEnd: format(weekEnd, 'yyyy-MM-dd'),
        averageDaily,
        totalWeeklyHours: Math.round(totalWeeklyHours * 100) / 100,
        averageAttendanceRate: Math.round(averageAttendanceRate * 100) / 100,
        averagePunctualityRate: Math.round(averagePunctualityRate * 100) / 100,
        bestDay: { date: bestDay.date, attendanceRate: bestDay.attendanceRate },
        worstDay: { date: worstDay.date, attendanceRate: worstDay.attendanceRate }
      };
    } catch (error) {
      console.error(`Error calculating weekly metrics:`, error);
      return this.getDefaultWeeklyMetrics(weekStart, weekEnd);
    }
  }

  /**
   * Calculate monthly metrics with trends
   */
  async getMonthlyMetrics(date: Date = new Date()): Promise<MonthlyMetrics> {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);

    try {
      const weeklyMetrics: WeeklyMetrics[] = [];
      
      // Get metrics for each week in the month
      let currentWeek = startOfWeek(monthStart, { weekStartsOn: 1 });
      while (currentWeek <= monthEnd) {
        if (currentWeek <= new Date()) {
          const weekMetrics = await this.getWeeklyMetrics(currentWeek);
          weeklyMetrics.push(weekMetrics);
        }
        currentWeek = new Date(currentWeek);
        currentWeek.setDate(currentWeek.getDate() + 7);
      }

      if (weeklyMetrics.length === 0) {
        return this.getDefaultMonthlyMetrics(monthStart, monthEnd);
      }

      // Calculate monthly averages from weekly data
      const totalMonthlyHours = weeklyMetrics.reduce((sum, week) => sum + week.totalWeeklyHours, 0);
      const averageAttendanceRate = weeklyMetrics.reduce((sum, week) => sum + week.averageAttendanceRate, 0) / weeklyMetrics.length;
      const averagePunctualityRate = weeklyMetrics.reduce((sum, week) => sum + week.averagePunctualityRate, 0) / weeklyMetrics.length;

      // Find top and bottom performing weeks
      const topPerformingWeek = weeklyMetrics.reduce((best, current) => 
        current.averageAttendanceRate > best.averageAttendanceRate ? current : best
      );
      const bottomPerformingWeek = weeklyMetrics.reduce((worst, current) => 
        current.averageAttendanceRate < worst.averageAttendanceRate ? current : worst
      );

      // Calculate trend direction
      let trendDirection: 'improving' | 'declining' | 'stable' = 'stable';
      if (weeklyMetrics.length >= 2) {
        const firstHalf = weeklyMetrics.slice(0, Math.ceil(weeklyMetrics.length / 2));
        const secondHalf = weeklyMetrics.slice(Math.floor(weeklyMetrics.length / 2));
        
        const firstHalfAvg = firstHalf.reduce((sum, week) => sum + week.averageAttendanceRate, 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((sum, week) => sum + week.averageAttendanceRate, 0) / secondHalf.length;
        
        const difference = secondHalfAvg - firstHalfAvg;
        if (difference > 2) trendDirection = 'improving';
        else if (difference < -2) trendDirection = 'declining';
      }

      // Create average daily metrics from weekly data
      const averageDaily = this.calculateAverageDailyFromWeekly(weeklyMetrics);

      return {
        monthStart: format(monthStart, 'yyyy-MM-dd'),
        monthEnd: format(monthEnd, 'yyyy-MM-dd'),
        averageDaily,
        totalMonthlyHours: Math.round(totalMonthlyHours * 100) / 100,
        averageAttendanceRate: Math.round(averageAttendanceRate * 100) / 100,
        averagePunctualityRate: Math.round(averagePunctualityRate * 100) / 100,
        topPerformingWeek: { weekStart: topPerformingWeek.weekStart, attendanceRate: topPerformingWeek.averageAttendanceRate },
        bottomPerformingWeek: { weekStart: bottomPerformingWeek.weekStart, attendanceRate: bottomPerformingWeek.averageAttendanceRate },
        trendDirection
      };
    } catch (error) {
      console.error(`Error calculating monthly metrics:`, error);
      return this.getDefaultMonthlyMetrics(monthStart, monthEnd);
    }
  }

  /**
   * Get comprehensive admin dashboard metrics
   */
  async getAdminDashboardMetrics(): Promise<{
    today: DailyMetrics;
    yesterday: DailyMetrics;
    thisWeek: WeeklyMetrics;
    thisMonth: MonthlyMetrics;
    systemHealth: {
      dataQuality: number;
      systemUptime: number;
      apiResponseTime: number;
      overallHealth: 'excellent' | 'good' | 'warning' | 'critical';
    };
  }> {
    const now = new Date();
    const yesterday = subDays(now, 1);

    try {
      const [todayMetrics, yesterdayMetrics, weeklyMetrics, monthlyMetrics] = await Promise.all([
        this.getDailyMetrics(now),
        this.getDailyMetrics(yesterday),
        this.getWeeklyMetrics(now),
        this.getMonthlyMetrics(now)
      ]);

      // Calculate system health metrics
      const dataQuality = this.calculateDataQuality(todayMetrics);
      const systemUptime = 99.5; // Mock system uptime
      const apiResponseTime = 150; // Mock API response time in ms

      let overallHealth: 'excellent' | 'good' | 'warning' | 'critical' = 'excellent';
      if (dataQuality < 80 || systemUptime < 95 || apiResponseTime > 1000) {
        overallHealth = 'critical';
      } else if (dataQuality < 90 || systemUptime < 98 || apiResponseTime > 500) {
        overallHealth = 'warning';
      } else if (dataQuality < 95 || systemUptime < 99 || apiResponseTime > 200) {
        overallHealth = 'good';
      }

      return {
        today: todayMetrics,
        yesterday: yesterdayMetrics,
        thisWeek: weeklyMetrics,
        thisMonth: monthlyMetrics,
        systemHealth: {
          dataQuality,
          systemUptime,
          apiResponseTime,
          overallHealth
        }
      };
    } catch (error) {
      console.error('Error getting admin dashboard metrics:', error);
      throw error;
    }
  }

  private calculateAverageDailyMetrics(dailyMetrics: DailyMetrics[]): DailyMetrics {
    const count = dailyMetrics.length;
    if (count === 0) return this.getDefaultDailyMetrics('');

    return {
      date: 'average',
      totalEmployees: Math.round(dailyMetrics.reduce((sum, day) => sum + day.totalEmployees, 0) / count),
      totalPresent: Math.round(dailyMetrics.reduce((sum, day) => sum + day.totalPresent, 0) / count),
      totalAbsent: Math.round(dailyMetrics.reduce((sum, day) => sum + day.totalAbsent, 0) / count),
      lateArrivals: Math.round(dailyMetrics.reduce((sum, day) => sum + day.lateArrivals, 0) / count),
      gracePeriodUsage: Math.round(dailyMetrics.reduce((sum, day) => sum + day.gracePeriodUsage, 0) / count),
      nonBioAttendance: Math.round(dailyMetrics.reduce((sum, day) => sum + day.nonBioAttendance, 0) / count),
      totalPunchIn: Math.round(dailyMetrics.reduce((sum, day) => sum + day.totalPunchIn, 0) / count),
      totalPunchOut: Math.round(dailyMetrics.reduce((sum, day) => sum + day.totalPunchOut, 0) / count),
      totalHours: Math.round((dailyMetrics.reduce((sum, day) => sum + day.totalHours, 0) / count) * 100) / 100,
      attendanceRate: Math.round((dailyMetrics.reduce((sum, day) => sum + day.attendanceRate, 0) / count) * 100) / 100,
      punctualityRate: Math.round((dailyMetrics.reduce((sum, day) => sum + day.punctualityRate, 0) / count) * 100) / 100,
      completedShifts: Math.round(dailyMetrics.reduce((sum, day) => sum + day.completedShifts, 0) / count)
    };
  }

  private calculateAverageDailyFromWeekly(weeklyMetrics: WeeklyMetrics[]): DailyMetrics {
    const count = weeklyMetrics.length;
    if (count === 0) return this.getDefaultDailyMetrics('');

    return {
      date: 'monthly_average',
      totalEmployees: Math.round(weeklyMetrics.reduce((sum, week) => sum + week.averageDaily.totalEmployees, 0) / count),
      totalPresent: Math.round(weeklyMetrics.reduce((sum, week) => sum + week.averageDaily.totalPresent, 0) / count),
      totalAbsent: Math.round(weeklyMetrics.reduce((sum, week) => sum + week.averageDaily.totalAbsent, 0) / count),
      lateArrivals: Math.round(weeklyMetrics.reduce((sum, week) => sum + week.averageDaily.lateArrivals, 0) / count),
      gracePeriodUsage: Math.round(weeklyMetrics.reduce((sum, week) => sum + week.averageDaily.gracePeriodUsage, 0) / count),
      nonBioAttendance: Math.round(weeklyMetrics.reduce((sum, week) => sum + week.averageDaily.nonBioAttendance, 0) / count),
      totalPunchIn: Math.round(weeklyMetrics.reduce((sum, week) => sum + week.averageDaily.totalPunchIn, 0) / count),
      totalPunchOut: Math.round(weeklyMetrics.reduce((sum, week) => sum + week.averageDaily.totalPunchOut, 0) / count),
      totalHours: Math.round((weeklyMetrics.reduce((sum, week) => sum + week.averageDaily.totalHours, 0) / count) * 100) / 100,
      attendanceRate: Math.round((weeklyMetrics.reduce((sum, week) => sum + week.averageAttendanceRate, 0) / count) * 100) / 100,
      punctualityRate: Math.round((weeklyMetrics.reduce((sum, week) => sum + week.averagePunctualityRate, 0) / count) * 100) / 100,
      completedShifts: Math.round(weeklyMetrics.reduce((sum, week) => sum + week.averageDaily.completedShifts, 0) / count)
    };
  }

  private calculateDataQuality(todayMetrics: DailyMetrics): number {
    let qualityScore = 100;
    
    // Deduct points for data inconsistencies
    if (todayMetrics.totalPunchIn < todayMetrics.totalPresent) qualityScore -= 10;
    if (todayMetrics.lateArrivals > todayMetrics.totalPresent) qualityScore -= 15;
    if (todayMetrics.attendanceRate > 100) qualityScore -= 20;
    if (todayMetrics.totalEmployees === 0) qualityScore -= 50;
    
    return Math.max(0, Math.min(100, qualityScore));
  }

  private getDefaultDailyMetrics(date: string): DailyMetrics {
    return {
      date,
      totalEmployees: 0,
      totalPresent: 0,
      totalAbsent: 0,
      lateArrivals: 0,
      gracePeriodUsage: 0,
      nonBioAttendance: 0,
      totalPunchIn: 0,
      totalPunchOut: 0,
      totalHours: 0,
      attendanceRate: 0,
      punctualityRate: 0,
      completedShifts: 0
    };
  }

  private getDefaultWeeklyMetrics(weekStart: Date, weekEnd: Date): WeeklyMetrics {
    return {
      weekStart: format(weekStart, 'yyyy-MM-dd'),
      weekEnd: format(weekEnd, 'yyyy-MM-dd'),
      averageDaily: this.getDefaultDailyMetrics('average'),
      totalWeeklyHours: 0,
      averageAttendanceRate: 0,
      averagePunctualityRate: 0,
      bestDay: { date: '', attendanceRate: 0 },
      worstDay: { date: '', attendanceRate: 0 }
    };
  }

  private getDefaultMonthlyMetrics(monthStart: Date, monthEnd: Date): MonthlyMetrics {
    return {
      monthStart: format(monthStart, 'yyyy-MM-dd'),
      monthEnd: format(monthEnd, 'yyyy-MM-dd'),
      averageDaily: this.getDefaultDailyMetrics('monthly_average'),
      totalMonthlyHours: 0,
      averageAttendanceRate: 0,
      averagePunctualityRate: 0,
      topPerformingWeek: { weekStart: '', attendanceRate: 0 },
      bottomPerformingWeek: { weekStart: '', attendanceRate: 0 },
      trendDirection: 'stable'
    };
  }
}

// Export singleton instance
export const unifiedAdminMetricsService = new UnifiedAdminMetricsService();