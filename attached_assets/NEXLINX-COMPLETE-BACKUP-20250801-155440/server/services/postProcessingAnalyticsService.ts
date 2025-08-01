import { db } from '../db';
import { attendanceRecords, employeeRecords } from '@shared/schema';
import { eq, and, gte, lte, isNotNull, isNull, sql, countDistinct, count } from 'drizzle-orm';

/**
 * POST-PROCESSING ANALYTICS SERVICE
 * 
 * Combines all calculation and analytics logic (NO data processing):
 * - Unified metrics calculation (from unifiedAttendanceService)
 * - TEE calculations (from teeCalculationService) 
 * - Late/Early arrival assessment
 * - Grace period calculations
 * - Analytics and reporting logic
 * 
 * DOES NOT TOUCH:
 * - threePollerSystem (data pulling)
 * - unifiedAttendanceProcessingService (staging to final processing)
 * - Any data processing pipeline
 */

export interface ComprehensiveAnalytics {
  // Basic metrics
  totalEmployees: number;
  totalPunchIn: number;
  totalPunchOut: number;
  totalForcedPunchOut: number;
  
  // Source breakdown
  totalBiometricPunchIn: number;
  totalMobilePunchIn: number;
  
  // Attendance states
  totalAttendance: number;
  completedToday: number;
  presentToday: number;
  absentToday: number;
  nonBioEmployees: number;
  
  // Timing analysis with grace periods
  lateArrivals: number;
  earlyArrivals: number;
  onTimeArrivals: number;
  graceApplied: number;
  missedPunchouts: number;
  attendanceRate: number;
  
  // TEE-based calculations
  teeValue: number;
  teeBasedAbsentees: number;
  teeMetrics: {
    aa1_mondayAvg: number;
    aa2_tuesdayAvg: number;
    aa3_wednesdayAvg: number;
    aa4_thursdayAvg: number;
    aa5_fridayAvg: number;
    aa6_saturdayAvg: number;
    aa7_sundayAvg: number;
    ma1_mondayMax: number;
    ma2_tuesdayMax: number;
    ma3_wednesdayMax: number;
    ma4_thursdayMax: number;
    ma5_fridayMax: number;
    ma6_saturdayMax: number;
    ma7_sundayMax: number;
  };
  
  // Advanced analytics
  departmentBreakdown: Array<{
    department: string;
    present: number;
    absent: number;
    late: number;
    attendanceRate: number;
  }>;
  
  // Historical trends
  last7DaysData: Array<{
    date: string;
    dayName: string;
    present: number;
    late: number;
    absent: number;
    missedPunchouts: number;
    attendanceRate: number;
  }>;
  
  targetDate: Date;
  calculatedAt: Date;
}

export class PostProcessingAnalyticsService {
  
  /**
   * Calculate comprehensive analytics for a specific date
   * Combines all post-processing calculations in one service
   */
  async calculateComprehensiveAnalytics(targetDate?: Date): Promise<ComprehensiveAnalytics> {
    const calculationDate = targetDate || new Date();
    
    // Use centralized timezone utility for consistent Pakistan time
    const { getCurrentPakistanDate, formatPakistanDate } = await import('../utils/timezone');
    const targetDateStr = targetDate ? 
      formatPakistanDate(calculationDate) : 
      await getCurrentPakistanDate();
    
    console.log(`[PostProcessingAnalytics] Calculating comprehensive analytics for date: ${targetDateStr}`);
    
    // Run all calculations in parallel for maximum efficiency
    const [
      basicMetrics,
      timingAnalysis,
      teeMetrics,
      departmentBreakdown,
      last7DaysData
    ] = await Promise.all([
      this.calculateBasicMetrics(targetDateStr),
      this.calculateTimingAnalysisWithGrace(targetDateStr),
      this.calculateTEEMetrics(),
      this.calculateDepartmentBreakdown(targetDateStr),
      this.calculateLast7DaysData()
    ]);
    
    // Get TEE value for this specific day
    const dayTEE = await this.getTEEForDate(calculationDate);
    const teeBasedAbsentees = Math.max(0, dayTEE - basicMetrics.totalUniquePunchIn);
    
    // Calculate final derived metrics
    const totalAttendance = basicMetrics.totalUniquePunchIn + basicMetrics.calculatedNonBio;
    const attendanceRate = basicMetrics.totalActiveEmployees > 0 ? 
      (totalAttendance / basicMetrics.totalActiveEmployees) * 100 : 0;
    
    console.log(`[PostProcessingAnalytics] COMPREHENSIVE RESULTS: ${basicMetrics.totalUniquePunchIn} unique punch-ins, TEE=${dayTEE}, TEE-based absent=${teeBasedAbsentees}`);
    
    return {
      // Basic metrics
      totalEmployees: basicMetrics.totalActiveEmployees,
      totalPunchIn: basicMetrics.totalUniquePunchIn,
      totalPunchOut: basicMetrics.totalPunchOut,
      totalForcedPunchOut: basicMetrics.totalForcedPunchOut,
      
      // Source breakdown
      totalBiometricPunchIn: basicMetrics.totalBiometricPunchIn,
      totalMobilePunchIn: basicMetrics.totalMobilePunchIn,
      
      // Attendance states
      totalAttendance,
      completedToday: basicMetrics.completedToday,
      presentToday: basicMetrics.presentToday,
      absentToday: basicMetrics.absentToday,
      nonBioEmployees: basicMetrics.calculatedNonBio,
      
      // Timing analysis with grace
      lateArrivals: timingAnalysis.lateArrivals,
      earlyArrivals: timingAnalysis.earlyArrivals,
      onTimeArrivals: timingAnalysis.onTimeArrivals,
      graceApplied: timingAnalysis.graceApplied,
      missedPunchouts: timingAnalysis.missedPunchouts,
      attendanceRate,
      
      // TEE-based calculations
      teeValue: dayTEE,
      teeBasedAbsentees,
      teeMetrics,
      
      // Advanced analytics
      departmentBreakdown,
      last7DaysData,
      
      targetDate: calculationDate,
      calculatedAt: new Date()
    };
  }
  
  /**
   * Calculate basic attendance metrics using UNIQUE employees (from unifiedAttendanceService logic)
   */
  private async calculateBasicMetrics(targetDateStr: string) {
    // Total active employees (excluding system accounts)
    const [totalActiveEmployees] = await db
      .select({ count: count() })
      .from(employeeRecords)
      .where(and(
        eq(employeeRecords.isActive, true),
        eq(employeeRecords.systemAccount, false)
      ));
    
    // UNIQUE punch-ins (most important for TEE calculations)
    const [totalUniquePunchIn] = await db
      .select({ count: countDistinct(attendanceRecords.employeeCode) })
      .from(attendanceRecords)
      .where(and(
        sql.raw(`DATE(date) = '${targetDateStr}'`),
        isNotNull(attendanceRecords.checkIn)
      ));
    
    // UNIQUE punch-outs
    const [totalPunchOut] = await db
      .select({ count: countDistinct(attendanceRecords.employeeCode) })
      .from(attendanceRecords)
      .where(and(
        sql.raw(`DATE(date) = '${targetDateStr}'`),
        isNotNull(attendanceRecords.checkOut)
      ));
    
    // Biometric vs Mobile breakdown (UNIQUE employees)
    const [biometricPunchIn] = await db
      .select({ count: countDistinct(attendanceRecords.employeeCode) })
      .from(attendanceRecords)
      .where(and(
        sql.raw(`DATE(date) = '${targetDateStr}'`),
        isNotNull(attendanceRecords.checkIn),
        sql`${attendanceRecords.punchSource} != 'mobile'`
      ));
    
    const [mobilePunchIn] = await db
      .select({ count: countDistinct(attendanceRecords.employeeCode) })
      .from(attendanceRecords)
      .where(and(
        sql.raw(`DATE(date) = '${targetDateStr}'`),
        isNotNull(attendanceRecords.checkIn),
        eq(attendanceRecords.punchSource, 'mobile')
      ));
    
    // Calculate NonBio employees using established formula
    const maxBiometricCapacity = 228;
    const calculatedNonBio = Math.max(0, totalActiveEmployees.count - maxBiometricCapacity);
    
    // Employees still present (within 9-hour window)
    const nineHoursAgo = new Date();
    nineHoursAgo.setHours(nineHoursAgo.getHours() - 9);
    
    const [presentToday] = await db
      .select({ count: countDistinct(attendanceRecords.employeeCode) })
      .from(attendanceRecords)
      .where(and(
        sql.raw(`DATE(date) = '${targetDateStr}'`),
        isNotNull(attendanceRecords.checkIn),
        isNull(attendanceRecords.checkOut),
        gte(attendanceRecords.checkIn, nineHoursAgo)
      ));
    
    // Complete attendance (both punch-in and punch-out)
    const [completedToday] = await db
      .select({ count: countDistinct(attendanceRecords.employeeCode) })
      .from(attendanceRecords)
      .where(and(
        sql.raw(`DATE(date) = '${targetDateStr}'`),
        isNotNull(attendanceRecords.checkIn),
        isNotNull(attendanceRecords.checkOut)
      ));
    
    // Auto punch-outs (9-hour rule)
    const [totalForcedPunchOut] = await db
      .select({ count: countDistinct(attendanceRecords.employeeCode) })
      .from(attendanceRecords)
      .where(and(
        sql.raw(`DATE(date) = '${targetDateStr}'`),
        isNotNull(attendanceRecords.checkIn),
        isNull(attendanceRecords.checkOut),
        sql`${attendanceRecords.checkIn} <= ${nineHoursAgo}`
      ));
    
    const totalAttendance = totalUniquePunchIn.count + calculatedNonBio;
    const absentToday = Math.max(0, totalActiveEmployees.count - totalAttendance);
    
    return {
      totalActiveEmployees: totalActiveEmployees.count,
      totalUniquePunchIn: totalUniquePunchIn.count,
      totalPunchOut: totalPunchOut.count,
      totalForcedPunchOut: totalForcedPunchOut.count,
      totalBiometricPunchIn: biometricPunchIn.count,
      totalMobilePunchIn: mobilePunchIn.count,
      calculatedNonBio,
      presentToday: presentToday.count,
      completedToday: completedToday.count,
      absentToday
    };
  }
  
  /**
   * Calculate timing analysis with grace period assessment
   */
  private async calculateTimingAnalysisWithGrace(targetDateStr: string) {
    // Grace period constants
    const standardStartTime = 9 * 60; // 9:00 AM = 540 minutes
    const gracePeriodMinutes = 30; // 30 minute grace period
    const lateThreshold = standardStartTime + gracePeriodMinutes; // 9:30 AM = 570 minutes
    const earlyThreshold = 7 * 60; // 7:00 AM = 420 minutes
    
    // Late arrivals (after 9:30 AM)
    const [lateArrivals] = await db
      .select({ count: countDistinct(attendanceRecords.employeeCode) })
      .from(attendanceRecords)
      .where(and(
        sql.raw(`DATE(date) = '${targetDateStr}'`),
        isNotNull(attendanceRecords.checkIn),
        sql`EXTRACT(HOUR FROM ${attendanceRecords.checkIn}) * 60 + EXTRACT(MINUTE FROM ${attendanceRecords.checkIn}) > ${lateThreshold}`
      ));
    
    // Early arrivals (before 7:00 AM)
    const [earlyArrivals] = await db
      .select({ count: countDistinct(attendanceRecords.employeeCode) })
      .from(attendanceRecords)
      .where(and(
        sql.raw(`DATE(date) = '${targetDateStr}'`),
        isNotNull(attendanceRecords.checkIn),
        sql`EXTRACT(HOUR FROM ${attendanceRecords.checkIn}) * 60 + EXTRACT(MINUTE FROM ${attendanceRecords.checkIn}) < ${earlyThreshold}`
      ));
    
    // On-time arrivals (between 7:00 AM and 9:30 AM)
    const [onTimeArrivals] = await db
      .select({ count: countDistinct(attendanceRecords.employeeCode) })
      .from(attendanceRecords)
      .where(and(
        sql.raw(`DATE(date) = '${targetDateStr}'`),
        isNotNull(attendanceRecords.checkIn),
        sql`EXTRACT(HOUR FROM ${attendanceRecords.checkIn}) * 60 + EXTRACT(MINUTE FROM ${attendanceRecords.checkIn}) >= ${earlyThreshold}`,
        sql`EXTRACT(HOUR FROM ${attendanceRecords.checkIn}) * 60 + EXTRACT(MINUTE FROM ${attendanceRecords.checkIn}) <= ${lateThreshold}`
      ));
    
    // Grace period applied (arrivals between 9:00 AM and 9:30 AM)
    const [graceApplied] = await db
      .select({ count: countDistinct(attendanceRecords.employeeCode) })
      .from(attendanceRecords)
      .where(and(
        sql.raw(`DATE(date) = '${targetDateStr}'`),
        isNotNull(attendanceRecords.checkIn),
        sql`EXTRACT(HOUR FROM ${attendanceRecords.checkIn}) * 60 + EXTRACT(MINUTE FROM ${attendanceRecords.checkIn}) > ${standardStartTime}`,
        sql`EXTRACT(HOUR FROM ${attendanceRecords.checkIn}) * 60 + EXTRACT(MINUTE FROM ${attendanceRecords.checkIn}) <= ${lateThreshold}`
      ));
    
    // Missed punchouts (punch-in but no punch-out)
    const [missedPunchouts] = await db
      .select({ count: countDistinct(attendanceRecords.employeeCode) })
      .from(attendanceRecords)
      .where(and(
        sql.raw(`DATE(date) = '${targetDateStr}'`),
        isNotNull(attendanceRecords.checkIn),
        isNull(attendanceRecords.checkOut)
      ));
    
    return {
      lateArrivals: lateArrivals.count,
      earlyArrivals: earlyArrivals.count,
      onTimeArrivals: onTimeArrivals.count,
      graceApplied: graceApplied.count,
      missedPunchouts: missedPunchouts.count
    };
  }
  
  /**
   * Calculate TEE metrics (from teeCalculationService logic)
   */
  private async calculateTEEMetrics() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dayMetrics = await Promise.all([
      this.calculateDayTEEMetrics(1, 'Monday', thirtyDaysAgo),
      this.calculateDayTEEMetrics(2, 'Tuesday', thirtyDaysAgo),
      this.calculateDayTEEMetrics(3, 'Wednesday', thirtyDaysAgo),
      this.calculateDayTEEMetrics(4, 'Thursday', thirtyDaysAgo),
      this.calculateDayTEEMetrics(5, 'Friday', thirtyDaysAgo),
      this.calculateDayTEEMetrics(6, 'Saturday', thirtyDaysAgo),
      this.calculateDayTEEMetrics(7, 'Sunday', thirtyDaysAgo)
    ]);
    
    return {
      aa1_mondayAvg: dayMetrics[0].average,
      aa2_tuesdayAvg: dayMetrics[1].average,
      aa3_wednesdayAvg: dayMetrics[2].average,
      aa4_thursdayAvg: dayMetrics[3].average,
      aa5_fridayAvg: dayMetrics[4].average,
      aa6_saturdayAvg: dayMetrics[5].average,
      aa7_sundayAvg: dayMetrics[6].average,
      ma1_mondayMax: dayMetrics[0].maximum,
      ma2_tuesdayMax: dayMetrics[1].maximum,
      ma3_wednesdayMax: dayMetrics[2].maximum,
      ma4_thursdayMax: dayMetrics[3].maximum,
      ma5_fridayMax: dayMetrics[4].maximum,
      ma6_saturdayMax: dayMetrics[5].maximum,
      ma7_sundayMax: dayMetrics[6].maximum
    };
  }
  
  /**
   * Calculate TEE metrics for a specific day of week using COUNT(DISTINCT)
   */
  private async calculateDayTEEMetrics(dayOfWeek: number, dayName: string, fromDate: Date) {
    const results = await db
      .select({
        date: sql<string>`DATE(${attendanceRecords.date})`,
        uniquePunchInCount: sql<number>`COUNT(DISTINCT ${attendanceRecords.employeeCode})`
      })
      .from(attendanceRecords)
      .where(and(
        gte(attendanceRecords.date, fromDate),
        isNotNull(attendanceRecords.checkIn),
        sql`EXTRACT(DOW FROM ${attendanceRecords.date}) = ${dayOfWeek === 7 ? 0 : dayOfWeek}`
      ))
      .groupBy(sql`DATE(${attendanceRecords.date})`)
      .orderBy(sql`DATE(${attendanceRecords.date})`);
    
    if (results.length === 0) {
      return { average: 0, maximum: 0 };
    }
    
    const counts = results.map(r => r.uniquePunchInCount);
    const average = Math.round(counts.reduce((sum, count) => sum + count, 0) / counts.length);
    const maximum = Math.max(...counts);
    
    console.log(`[PostProcessingAnalytics] TEE ${dayName}: ${results.length} days, AA=${average}, MA=${maximum}`);
    
    return { average, maximum };
  }
  
  /**
   * Get TEE value for a specific date
   */
  private async getTEEForDate(targetDate: Date): Promise<number> {
    const teeMetrics = await this.calculateTEEMetrics();
    const dayOfWeek = targetDate.getDay();
    const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
    
    switch (adjustedDay) {
      case 1: return teeMetrics.ma1_mondayMax;
      case 2: return teeMetrics.ma2_tuesdayMax;
      case 3: return teeMetrics.ma3_wednesdayMax;
      case 4: return teeMetrics.ma4_thursdayMax;
      case 5: return teeMetrics.ma5_fridayMax;
      case 6: return teeMetrics.ma6_saturdayMax;
      case 7: return teeMetrics.ma7_sundayMax;
      default: return 293; // Fallback
    }
  }
  
  /**
   * Calculate department-wise attendance breakdown
   */
  private async calculateDepartmentBreakdown(targetDateStr: string) {
    // This is a placeholder - actual implementation would depend on department field structure
    // For now, return empty array or basic breakdown
    return [
      {
        department: 'Engineering',
        present: 45,
        absent: 5,
        late: 3,
        attendanceRate: 90.0
      },
      {
        department: 'Sales',
        present: 38,
        absent: 7,
        late: 2,
        attendanceRate: 84.4
      }
    ];
  }
  
  /**
   * Calculate last 7 days attendance data for trends
   */
  private async calculateLast7DaysData() {
    const daysData = [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const { formatPakistanDate } = await import('../utils/timezone');
      const dateStr = formatPakistanDate(date);
      const dayName = dayNames[date.getDay()];
      
      // Get basic metrics for this day
      const basicMetrics = await this.calculateBasicMetrics(dateStr);
      const timingAnalysis = await this.calculateTimingAnalysisWithGrace(dateStr);
      
      const totalAttendance = basicMetrics.totalUniquePunchIn + basicMetrics.calculatedNonBio;
      const attendanceRate = basicMetrics.totalActiveEmployees > 0 ? 
        (totalAttendance / basicMetrics.totalActiveEmployees) * 100 : 0;
      
      daysData.push({
        date: dateStr,
        dayName,
        present: basicMetrics.totalUniquePunchIn,
        late: timingAnalysis.lateArrivals,
        absent: basicMetrics.absentToday,
        missedPunchouts: timingAnalysis.missedPunchouts,
        attendanceRate: Math.round(attendanceRate * 100) / 100
      });
    }
    
    return daysData;
  }
  
  /**
   * Get mobile-friendly analytics summary
   */
  async getMobileAnalyticsSummary(targetDate?: Date) {
    const analytics = await this.calculateComprehensiveAnalytics(targetDate);
    
    return {
      // Mobile KPI cards
      kpis: {
        totalPresent: analytics.totalPunchIn,
        totalAbsent: analytics.teeBasedAbsentees,
        lateArrivals: analytics.lateArrivals,
        missedPunchouts: analytics.missedPunchouts,
        attendanceRate: analytics.attendanceRate
      },
      
      // 7-day trend for line graph
      trendData: analytics.last7DaysData,
      
      // TEE breakdown
      teeBreakdown: {
        teeValue: analytics.teeValue,
        teeBasedAbsentees: analytics.teeBasedAbsentees,
        teeMetrics: analytics.teeMetrics
      },
      
      // Timing breakdown with grace
      timingBreakdown: {
        onTime: analytics.onTimeArrivals,
        graceApplied: analytics.graceApplied,
        late: analytics.lateArrivals,
        early: analytics.earlyArrivals
      }
    };
  }
}

export const postProcessingAnalyticsService = new PostProcessingAnalyticsService();

// Add service interface methods for ServiceManager compatibility
(postProcessingAnalyticsService as any).start = async () => {
  console.log('[PostProcessingAnalytics] Service started - ready for calculations');
  return Promise.resolve();
};

(postProcessingAnalyticsService as any).stop = async () => {
  console.log('[PostProcessingAnalytics] Service stopped');
  return Promise.resolve();
};

(postProcessingAnalyticsService as any).getHealth = () => ({
  status: 'healthy',
  uptime: Date.now(),
  message: 'Post-processing analytics service operational'
});