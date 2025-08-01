import { db } from '../db';
import { attendanceRecords, employees, shifts } from '@shared/schema';
import { eq, and, gte, lte, sql, desc, asc, count } from 'drizzle-orm';
import { formatPKTDateTime } from './timezoneService';

interface EmployeeScoringData {
  currentPoints: number;
  monthlyGoal: number;
  rank: number;
  totalEmployees: number;
  monthlyAverage: number;
  yearlyAverage: number;
  streakDays: number;
  badges: Array<{
    name: string;
    icon: string;
    earned: boolean;
    points: number;
  }>;
  weeklyProgress: Array<{
    day: string;
    points: number;
    target: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    points: number;
  }>;
  pointsBreakdown: Array<{
    category: string;
    points: number;
    color: string;
  }>;
}

export class EmployeeScoringService {
  private static readonly PUNCTUALITY_POINTS = 10; // Points for being on time
  private static readonly LATE_PENALTY = 2; // Points deducted per minute late
  private static readonly EARLY_BONUS = 1; // Points for being early
  private static readonly OVERTIME_BONUS = 5; // Points per hour overtime
  private static readonly STREAK_BONUS = 10; // Daily streak bonus
  private static readonly LOCATION_BONUS = 5; // Points for correct location

  static async calculateEmployeeScoring(employeeCode: string): Promise<EmployeeScoringData> {
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    // Get employee data
    const employee = await db.query.employees.findFirst({
      where: eq(employees.empCode, employeeCode),
      with: {
        assignedShift: true
      }
    });

    if (!employee) {
      throw new Error('Employee not found');
    }

    // Calculate monthly scoring
    const monthlyScoring = await this.calculateMonthlyScoring(employeeCode, startOfMonth, endOfMonth);
    
    // Calculate yearly scoring
    const yearlyScoring = await this.calculateYearlyScoring(employeeCode);
    
    // Calculate rank
    const rank = await this.calculateEmployeeRank(employeeCode);
    
    // Calculate streak
    const streakDays = await this.calculateStreakDays(employeeCode);
    
    // Calculate badges
    const badges = await this.calculateBadges(employeeCode);
    
    // Calculate weekly progress
    const weeklyProgress = await this.calculateWeeklyProgress(employeeCode);
    
    // Calculate monthly trend
    const monthlyTrend = await this.calculateMonthlyTrend(employeeCode);
    
    // Calculate points breakdown
    const pointsBreakdown = await this.calculatePointsBreakdown(employeeCode, startOfMonth, endOfMonth);

    // Get total employees for ranking
    const totalEmployees = await db.select({ count: count() }).from(employees);

    return {
      currentPoints: monthlyScoring,
      monthlyGoal: 800, // Standard monthly goal
      rank,
      totalEmployees: totalEmployees[0].count,
      monthlyAverage: await this.calculateSystemAverage('monthly'),
      yearlyAverage: await this.calculateSystemAverage('yearly'),
      streakDays,
      badges,
      weeklyProgress,
      monthlyTrend,
      pointsBreakdown
    };
  }

  private static async calculateMonthlyScoring(
    employeeCode: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const records = await db.query.attendanceRecords.findMany({
      where: and(
        eq(attendanceRecords.employeeCode, employeeCode),
        gte(attendanceRecords.date, startDate),
        lte(attendanceRecords.date, endDate)
      ),
      with: {
        employee: {
          with: {
            assignedShift: true
          }
        }
      }
    });

    let totalPoints = 0;

    for (const record of records) {
      const points = await this.calculateDailyPoints(record);
      totalPoints += points;
    }

    return totalPoints;
  }

  private static async calculateDailyPoints(record: any): Promise<number> {
    let points = 0;

    // Base attendance points
    if (record.status === 'complete' || record.status === 'incomplete') {
      points += 50; // Base points for attendance
    }

    // Punctuality points
    if (record.checkInTime && record.employee?.assignedShift) {
      const shift = record.employee.assignedShift;
      const checkInTime = new Date(record.checkInTime);
      const shiftStart = new Date(checkInTime.toDateString() + ' ' + shift.startTime);
      
      const timeDiff = (checkInTime.getTime() - shiftStart.getTime()) / (1000 * 60); // minutes
      
      if (timeDiff <= 0) {
        // Early or on time
        points += this.PUNCTUALITY_POINTS + Math.abs(timeDiff) * this.EARLY_BONUS;
      } else if (timeDiff <= 15) {
        // Grace period
        points += this.PUNCTUALITY_POINTS * 0.5;
      } else {
        // Late
        points -= timeDiff * this.LATE_PENALTY;
      }
    }

    // Location points
    if (record.punchSource === 'biometric') {
      points += this.LOCATION_BONUS; // Biometric punch = correct location
    }

    // Overtime points
    if (record.overtimeHours > 0) {
      points += record.overtimeHours * this.OVERTIME_BONUS;
    }

    // Ensure minimum points
    return Math.max(points, 0);
  }

  private static async calculateYearlyScoring(employeeCode: string): Promise<number> {
    const currentDate = new Date();
    const startOfYear = new Date(currentDate.getFullYear(), 0, 1);

    return await this.calculateMonthlyScoring(employeeCode, startOfYear, currentDate);
  }

  private static async calculateEmployeeRank(employeeCode: string): Promise<number> {
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    // Get all employees with their scores
    const allEmployees = await db.query.employees.findMany({
      where: eq(employees.status, 'active')
    });

    const employeeScores = await Promise.all(
      allEmployees.map(async (emp) => ({
        empCode: emp.empCode,
        score: await this.calculateMonthlyScoring(emp.empCode, startOfMonth, endOfMonth)
      }))
    );

    // Sort by score descending
    employeeScores.sort((a, b) => b.score - a.score);

    // Find rank
    const rank = employeeScores.findIndex(emp => emp.empCode === employeeCode) + 1;
    return rank;
  }

  private static async calculateStreakDays(employeeCode: string): Promise<number> {
    const currentDate = new Date();
    let streak = 0;
    let checkDate = new Date(currentDate);
    checkDate.setDate(checkDate.getDate() - 1); // Start from yesterday

    while (true) {
      const attendance = await db.query.attendanceRecords.findFirst({
        where: and(
          eq(attendanceRecords.employeeCode, employeeCode),
          eq(attendanceRecords.date, checkDate)
        )
      });

      if (attendance && (attendance.status === 'complete' || attendance.status === 'incomplete')) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }

      // Limit streak calculation to 30 days
      if (streak >= 30) break;
    }

    return streak;
  }

  private static async calculateBadges(employeeCode: string): Promise<Array<{
    name: string;
    icon: string;
    earned: boolean;
    points: number;
  }>> {
    const currentDate = new Date();
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    // Check Perfect Week badge
    const weeklyRecords = await db.query.attendanceRecords.findMany({
      where: and(
        eq(attendanceRecords.employeeCode, employeeCode),
        gte(attendanceRecords.date, startOfWeek),
        lte(attendanceRecords.date, currentDate)
      )
    });

    const perfectWeek = weeklyRecords.length >= 5 && 
      weeklyRecords.every(record => record.status === 'complete');

    // Check Early Bird badge
    const earlyRecords = weeklyRecords.filter(record => {
      // Check if consistently early this week
      return record.checkInTime; // Simplified check
    });

    const earlyBird = earlyRecords.length >= 3;

    // Check Overtime Hero badge
    const overtimeRecords = await db.query.attendanceRecords.findMany({
      where: and(
        eq(attendanceRecords.employeeCode, employeeCode),
        gte(attendanceRecords.date, startOfMonth),
        lte(attendanceRecords.date, endOfMonth)
      )
    });

    const overtimeHero = overtimeRecords.some(record => record.overtimeHours > 2);

    // Check Location Master badge
    const biometricRecords = await db.query.attendanceRecords.findMany({
      where: and(
        eq(attendanceRecords.employeeCode, employeeCode),
        gte(attendanceRecords.date, startOfMonth),
        lte(attendanceRecords.date, endOfMonth),
        eq(attendanceRecords.punchSource, 'biometric')
      )
    });

    const locationMaster = biometricRecords.length >= 15;

    return [
      { name: "Perfect Week", icon: "🏆", earned: perfectWeek, points: 50 },
      { name: "Early Bird", icon: "🌅", earned: earlyBird, points: 25 },
      { name: "Overtime Hero", icon: "⏰", earned: overtimeHero, points: 40 },
      { name: "Location Master", icon: "📍", earned: locationMaster, points: 30 },
    ];
  }

  private static async calculateWeeklyProgress(employeeCode: string): Promise<Array<{
    day: string;
    points: number;
    target: number;
  }>> {
    const currentDate = new Date();
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyProgress = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);

      const record = await db.query.attendanceRecords.findFirst({
        where: and(
          eq(attendanceRecords.employeeCode, employeeCode),
          eq(attendanceRecords.date, date)
        )
      });

      const points = record ? await this.calculateDailyPoints(record) : 0;

      weeklyProgress.push({
        day: days[i],
        points,
        target: 80 // Daily target
      });
    }

    return weeklyProgress;
  }

  private static async calculateMonthlyTrend(employeeCode: string): Promise<Array<{
    month: string;
    points: number;
  }>> {
    const currentDate = new Date();
    const monthlyTrend = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 0);
      
      const points = await this.calculateMonthlyScoring(employeeCode, date, endDate);
      
      monthlyTrend.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        points
      });
    }

    return monthlyTrend;
  }

  private static async calculatePointsBreakdown(
    employeeCode: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{
    category: string;
    points: number;
    color: string;
  }>> {
    const records = await db.query.attendanceRecords.findMany({
      where: and(
        eq(attendanceRecords.employeeCode, employeeCode),
        gte(attendanceRecords.date, startDate),
        lte(attendanceRecords.date, endDate)
      ),
      with: {
        employee: {
          with: {
            assignedShift: true
          }
        }
      }
    });

    let punctualityPoints = 0;
    let locationPoints = 0;
    let overtimePoints = 0;
    let streakPoints = 0;

    for (const record of records) {
      // Punctuality calculation
      if (record.checkInTime && record.employee?.assignedShift) {
        const shift = record.employee.assignedShift;
        const checkInTime = new Date(record.checkInTime);
        const shiftStart = new Date(checkInTime.toDateString() + ' ' + shift.startTime);
        
        const timeDiff = (checkInTime.getTime() - shiftStart.getTime()) / (1000 * 60);
        
        if (timeDiff <= 0) {
          punctualityPoints += this.PUNCTUALITY_POINTS + Math.abs(timeDiff) * this.EARLY_BONUS;
        } else if (timeDiff <= 15) {
          punctualityPoints += this.PUNCTUALITY_POINTS * 0.5;
        }
      }

      // Location points
      if (record.punchSource === 'biometric') {
        locationPoints += this.LOCATION_BONUS;
      }

      // Overtime points
      if (record.overtimeHours > 0) {
        overtimePoints += record.overtimeHours * this.OVERTIME_BONUS;
      }
    }

    // Streak bonus
    const streakDays = await this.calculateStreakDays(employeeCode);
    streakPoints = streakDays * this.STREAK_BONUS;

    return [
      { category: "Punctuality", points: punctualityPoints, color: "#10B981" },
      { category: "Location", points: locationPoints, color: "#8B5CF6" },
      { category: "Overtime", points: overtimePoints, color: "#F59E0B" },
      { category: "Streak Bonus", points: streakPoints, color: "#EF4444" },
    ];
  }

  private static async calculateSystemAverage(period: 'monthly' | 'yearly'): Promise<number> {
    const currentDate = new Date();
    const startDate = period === 'monthly' 
      ? new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      : new Date(currentDate.getFullYear(), 0, 1);

    const allEmployees = await db.query.employees.findMany({
      where: eq(employees.status, 'active')
    });

    const scores = await Promise.all(
      allEmployees.map(emp => this.calculateMonthlyScoring(emp.empCode, startDate, currentDate))
    );

    const total = scores.reduce((sum, score) => sum + score, 0);
    return Math.round(total / scores.length);
  }
}