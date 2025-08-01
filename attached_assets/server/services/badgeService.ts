import { storage } from "../storage";
import { startOfDay, endOfDay, subDays, format } from "date-fns";
import { formatInTimezone } from "../utils/timezone";
import type { Badge, InsertBadge, InsertEmployeeBadge, InsertGamificationEvent } from "@shared/schema";

export class BadgeService {
  private static instance: BadgeService;
  
  static getInstance(): BadgeService {
    if (!BadgeService.instance) {
      BadgeService.instance = new BadgeService();
    }
    return BadgeService.instance;
  }

  // Initialize default badges
  async initializeDefaultBadges(): Promise<void> {
    const defaultBadges = [
      // Attendance Badges
      {
        name: "Perfect Week",
        description: "Attend all 5 days in a week",
        category: "attendance",
        points: 50,
        emoji: "🎯",
        criteria: { type: "weekly_attendance", target: 5 },
        isActive: true,
        rarity: "common"
      },
      {
        name: "Monthly Champion",
        description: "Complete 22+ days in a month",
        category: "attendance",
        points: 200,
        emoji: "🏆",
        criteria: { type: "monthly_attendance", target: 22 },
        isActive: true,
        rarity: "rare"
      },
      {
        name: "Streak Master",
        description: "Maintain 30-day attendance streak",
        category: "attendance",
        points: 500,
        emoji: "🔥",
        criteria: { type: "attendance_streak", target: 30 },
        isActive: true,
        rarity: "legendary"
      },
      // Punctuality Badges
      {
        name: "Early Bird",
        description: "Arrive early 5 days in a row",
        category: "punctuality",
        points: 75,
        emoji: "🌅",
        criteria: { type: "early_arrival", target: 5 },
        isActive: true,
        rarity: "common"
      },
      {
        name: "Never Late",
        description: "No late arrivals for 30 days",
        category: "punctuality",
        points: 300,
        emoji: "⏰",
        criteria: { type: "no_late_days", target: 30 },
        isActive: true,
        rarity: "rare"
      },
      // Performance Badges
      {
        name: "Overtime Hero",
        description: "Work 10+ hours in a day",
        category: "performance",
        points: 100,
        emoji: "⚡",
        criteria: { type: "overtime_day", target: 10 },
        isActive: true,
        rarity: "uncommon"
      },
      {
        name: "Consistent Performer",
        description: "8+ hours daily for 20 days",
        category: "performance",
        points: 250,
        emoji: "📈",
        criteria: { type: "consistent_hours", target: 20 },
        isActive: true,
        rarity: "rare"
      },
      // Milestone Badges
      {
        name: "Century Club",
        description: "Complete 100 days of attendance",
        category: "achievement",
        points: 1000,
        emoji: "💯",
        criteria: { type: "total_days", target: 100 },
        isActive: true,
        rarity: "legendary"
      },
      {
        name: "First Timer",
        description: "Complete your first day",
        category: "achievement",
        points: 25,
        emoji: "🎊",
        criteria: { type: "first_day", target: 1 },
        isActive: true,
        rarity: "common"
      },
      {
        name: "Quarter Master",
        description: "Complete 90 days (3 months)",
        category: "achievement",
        points: 750,
        emoji: "⭐",
        criteria: { type: "quarterly_milestone", target: 90 },
        isActive: true,
        rarity: "epic"
      }
    ];

    // Check if badges already exist
    const existingBadges = await storage.getBadges();
    const existingNames = existingBadges.map(b => b.name);

    // Create only new badges
    for (const badge of defaultBadges) {
      if (!existingNames.includes(badge.name)) {
        await storage.createBadge(badge as InsertBadge);
        console.log(`Created default badge: ${badge.name}`);
      }
    }
  }

  // Process badges for a specific employee
  async processEmployeeBadges(employeeId: number): Promise<void> {
    const employee = await storage.getEmployee(employeeId);
    if (!employee) return;

    const badges = await storage.getBadges({ isActive: true });
    const existingBadges = await storage.getEmployeeBadges(employeeId);
    const existingBadgeIds = existingBadges.map(eb => eb.badgeId);

    for (const badge of badges) {
      if (existingBadgeIds.includes(badge.id)) continue;

      const earned = await this.checkBadgeCriteria(employeeId, badge);
      if (earned) {
        await this.awardBadge(employeeId, badge);
      }
    }
  }

  // Check if employee meets badge criteria
  private async checkBadgeCriteria(employeeId: number, badge: Badge): Promise<boolean> {
    if (!badge.criteria) return false;

    const criteria = badge.criteria as any;
    const today = new Date();

    switch (criteria.type) {
      case "first_day":
        return await this.checkFirstDay(employeeId);
      
      case "weekly_attendance":
        return await this.checkWeeklyAttendance(employeeId, criteria.target);
      
      case "monthly_attendance":
        return await this.checkMonthlyAttendance(employeeId, criteria.target);
      
      case "attendance_streak":
        return await this.checkAttendanceStreak(employeeId, criteria.target);
      
      case "early_arrival":
        return await this.checkEarlyArrival(employeeId, criteria.target);
      
      case "no_late_days":
        return await this.checkNoLateDays(employeeId, criteria.target);
      
      case "overtime_day":
        return await this.checkOvertimeDay(employeeId, criteria.target);
      
      case "consistent_hours":
        return await this.checkConsistentHours(employeeId, criteria.target);
      
      case "total_days":
        return await this.checkTotalDays(employeeId, criteria.target);
      
      case "quarterly_milestone":
        return await this.checkQuarterlyMilestone(employeeId, criteria.target);
      
      default:
        return false;
    }
  }

  // Badge criteria check methods
  private async checkFirstDay(employeeId: number): Promise<boolean> {
    const today = startOfDay(new Date());
    const tomorrow = endOfDay(new Date());
    
    const records = await storage.getAttendanceRecords({
      employeeId,
      dateFrom: today,
      dateTo: tomorrow
    });
    
    return records.records.length > 0;
  }

  private async checkWeeklyAttendance(employeeId: number, target: number): Promise<boolean> {
    const today = new Date();
    const weekStart = startOfDay(subDays(today, 6)); // Last 7 days
    const weekEnd = endOfDay(today);
    
    const records = await storage.getAttendanceRecords({
      employeeId,
      dateFrom: weekStart,
      dateTo: weekEnd
    });
    
    // Count unique days with attendance
    const uniqueDays = new Set(
      records.records.map(r => format(new Date(r.punchTime), 'yyyy-MM-dd'))
    );
    
    return uniqueDays.size >= target;
  }

  private async checkMonthlyAttendance(employeeId: number, target: number): Promise<boolean> {
    const today = new Date();
    const monthStart = startOfDay(subDays(today, 29)); // Last 30 days
    const monthEnd = endOfDay(today);
    
    const records = await storage.getAttendanceRecords({
      employeeId,
      dateFrom: monthStart,
      dateTo: monthEnd
    });
    
    // Count unique days with attendance
    const uniqueDays = new Set(
      records.records.map(r => format(new Date(r.punchTime), 'yyyy-MM-dd'))
    );
    
    return uniqueDays.size >= target;
  }

  private async checkAttendanceStreak(employeeId: number, target: number): Promise<boolean> {
    const streak = await storage.getEmployeeStreak(employeeId);
    return streak ? streak.currentStreak >= target : false;
  }

  private async checkEarlyArrival(employeeId: number, target: number): Promise<boolean> {
    const today = new Date();
    const checkStart = startOfDay(subDays(today, target - 1));
    const checkEnd = endOfDay(today);
    
    const records = await storage.getAttendanceRecords({
      employeeId,
      dateFrom: checkStart,
      dateTo: checkEnd
    });
    
    // Group by date and check if first punch is before 9 AM
    const dailyRecords = new Map<string, any[]>();
    records.records.forEach(record => {
      const date = format(new Date(record.punchTime), 'yyyy-MM-dd');
      if (!dailyRecords.has(date)) {
        dailyRecords.set(date, []);
      }
      dailyRecords.get(date)!.push(record);
    });
    
    let earlyDays = 0;
    for (const [date, dayRecords] of dailyRecords) {
      dayRecords.sort((a, b) => new Date(a.punchTime).getTime() - new Date(b.punchTime).getTime());
      const firstPunch = dayRecords[0];
      if (firstPunch && firstPunch.status === 'check_in') {
        const punchHour = new Date(firstPunch.punchTime).getHours();
        if (punchHour < 9) earlyDays++;
      }
    }
    
    return earlyDays >= target;
  }

  private async checkNoLateDays(employeeId: number, target: number): Promise<boolean> {
    const today = new Date();
    const checkStart = startOfDay(subDays(today, target - 1));
    const checkEnd = endOfDay(today);
    
    const records = await storage.getAttendanceRecords({
      employeeId,
      dateFrom: checkStart,
      dateTo: checkEnd
    });
    
    // Group by date and check if any late arrivals
    const dailyRecords = new Map<string, any[]>();
    records.records.forEach(record => {
      const date = format(new Date(record.punchTime), 'yyyy-MM-dd');
      if (!dailyRecords.has(date)) {
        dailyRecords.set(date, []);
      }
      dailyRecords.get(date)!.push(record);
    });
    
    let lateDays = 0;
    for (const [date, dayRecords] of dailyRecords) {
      dayRecords.sort((a, b) => new Date(a.punchTime).getTime() - new Date(b.punchTime).getTime());
      const firstPunch = dayRecords[0];
      if (firstPunch && firstPunch.status === 'check_in') {
        const punchHour = new Date(firstPunch.punchTime).getHours();
        if (punchHour >= 9) lateDays++; // Late if after 9 AM
      }
    }
    
    return lateDays === 0 && dailyRecords.size >= target;
  }

  private async checkOvertimeDay(employeeId: number, target: number): Promise<boolean> {
    const today = startOfDay(new Date());
    const tomorrow = endOfDay(new Date());
    
    const records = await storage.getAttendanceRecords({
      employeeId,
      dateFrom: today,
      dateTo: tomorrow
    });
    
    if (records.records.length < 2) return false;
    
    // Calculate hours worked today
    const checkIns = records.records.filter(r => r.status === 'check_in');
    const checkOuts = records.records.filter(r => r.status === 'check_out');
    
    if (checkIns.length === 0 || checkOuts.length === 0) return false;
    
    const firstIn = new Date(checkIns[0].punchTime);
    const lastOut = new Date(checkOuts[checkOuts.length - 1].punchTime);
    
    const hoursWorked = (lastOut.getTime() - firstIn.getTime()) / (1000 * 60 * 60);
    
    return hoursWorked >= target;
  }

  private async checkConsistentHours(employeeId: number, target: number): Promise<boolean> {
    const today = new Date();
    const checkStart = startOfDay(subDays(today, target - 1));
    const checkEnd = endOfDay(today);
    
    const records = await storage.getAttendanceRecords({
      employeeId,
      dateFrom: checkStart,
      dateTo: checkEnd
    });
    
    // Group by date and calculate daily hours
    const dailyRecords = new Map<string, any[]>();
    records.records.forEach(record => {
      const date = format(new Date(record.punchTime), 'yyyy-MM-dd');
      if (!dailyRecords.has(date)) {
        dailyRecords.set(date, []);
      }
      dailyRecords.get(date)!.push(record);
    });
    
    let consistentDays = 0;
    for (const [date, dayRecords] of dailyRecords) {
      const checkIns = dayRecords.filter(r => r.status === 'check_in');
      const checkOuts = dayRecords.filter(r => r.status === 'check_out');
      
      if (checkIns.length > 0 && checkOuts.length > 0) {
        const firstIn = new Date(checkIns[0].punchTime);
        const lastOut = new Date(checkOuts[checkOuts.length - 1].punchTime);
        const hoursWorked = (lastOut.getTime() - firstIn.getTime()) / (1000 * 60 * 60);
        
        if (hoursWorked >= 8) consistentDays++;
      }
    }
    
    return consistentDays >= target;
  }

  private async checkTotalDays(employeeId: number, target: number): Promise<boolean> {
    const records = await storage.getAttendanceRecords({ employeeId });
    
    // Count unique attendance days
    const uniqueDays = new Set(
      records.records.map(r => format(new Date(r.punchTime), 'yyyy-MM-dd'))
    );
    
    return uniqueDays.size >= target;
  }

  private async checkQuarterlyMilestone(employeeId: number, target: number): Promise<boolean> {
    return await this.checkTotalDays(employeeId, target);
  }

  // Award badge to employee
  private async awardBadge(employeeId: number, badge: Badge): Promise<void> {
    try {
      // Award the badge
      await storage.awardBadge(employeeId, badge.id);
      
      // Create gamification event
      await storage.createGamificationEvent({
        employeeId,
        eventType: 'badge_earned',
        points: badge.points,
        description: `Earned "${badge.name}" badge - ${badge.description}`,
        metadata: { 
          badgeId: badge.id,
          badgeName: badge.name,
          badgeCategory: badge.category,
          badgeRarity: badge.rarity
        }
      });
      
      console.log(`Badge "${badge.name}" awarded to employee ${employeeId}`);
    } catch (error) {
      console.error(`Error awarding badge ${badge.name} to employee ${employeeId}:`, error);
    }
  }

  // Process all employees for badges (batch processing)
  async processAllEmployeesBadges(): Promise<void> {
    const employees = await storage.getAllEmployees();
    
    for (const employee of employees) {
      if (employee.isActive && employee.firstName.toLowerCase() !== 'noc') {
        await this.processEmployeeBadges(employee.id);
      }
    }
  }

  // Get employee leaderboard
  async getLeaderboard(limit: number = 10): Promise<any[]> {
    const employees = await storage.getAllEmployees();
    const leaderboard = [];
    
    for (const employee of employees) {
      if (employee.isActive && employee.firstName.toLowerCase() !== 'noc') {
        const badges = await storage.getEmployeeBadges(employee.id);
        const totalPoints = badges.reduce((sum, badge) => sum + badge.points, 0);
        const streak = await storage.getEmployeeStreak(employee.id);
        
        leaderboard.push({
          employeeId: employee.id,
          employeeCode: employee.employeeCode,
          name: `${employee.firstName} ${employee.lastName}`,
          department: employee.department,
          totalPoints,
          badgeCount: badges.length,
          currentStreak: streak?.currentStreak || 0,
          level: Math.floor(totalPoints / 100) + 1
        });
      }
    }
    
    return leaderboard
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, limit);
  }
}

export const badgeService = BadgeService.getInstance();