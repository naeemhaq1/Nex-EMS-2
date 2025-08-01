import { db } from '../db';
import { announcements, employeeRecords, attendanceRecords, employeeScores } from '@shared/schema';
import { eq, gte, lte, desc, and, count, avg } from 'drizzle-orm';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';

export interface AnnouncementThreshold {
  id: string;
  name: string;
  type: 'warning' | 'celebration' | 'reminder' | 'alert';
  condition: string;
  threshold: number;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  enabled: boolean;
}

export class AnnouncementService {
  // Default thresholds for system-generated announcements
  private defaultThresholds: AnnouncementThreshold[] = [
    {
      id: 'late_streak',
      name: 'Late Arrival Streak',
      type: 'warning',
      condition: 'consecutive_late_days',
      threshold: 3,
      message: 'Multiple late arrivals detected this week. Please ensure timely attendance.',
      priority: 'high',
      enabled: true
    },
    {
      id: 'perfect_attendance',
      name: 'Perfect Attendance',
      type: 'celebration',
      condition: 'consecutive_present_days',
      threshold: 30,
      message: 'Congratulations! You have achieved 30 days of perfect attendance.',
      priority: 'normal',
      enabled: true
    },
    {
      id: 'low_score',
      name: 'Performance Alert',
      type: 'alert',
      condition: 'weekly_score_below',
      threshold: 60,
      message: 'Your performance score is below expectations. Please review attendance policy.',
      priority: 'urgent',
      enabled: true
    },
    {
      id: 'timesheet_reminder',
      name: 'Timesheet Submission',
      type: 'reminder',
      condition: 'monthly_reminder',
      threshold: 25, // Day of month
      message: 'Reminder: Submit your timesheets by end of month.',
      priority: 'normal',
      enabled: true
    },
    {
      id: 'overtime_limit',
      name: 'Overtime Limit Warning',
      type: 'warning',
      condition: 'weekly_overtime_hours',
      threshold: 15,
      message: 'You are approaching weekly overtime limits. Please manage your hours.',
      priority: 'high',
      enabled: true
    },
    {
      id: 'absent_streak',
      name: 'Absence Alert',
      type: 'alert',
      condition: 'consecutive_absent_days',
      threshold: 2,
      message: 'Extended absence detected. Please contact HR if assistance is needed.',
      priority: 'urgent',
      enabled: true
    }
  ];

  async generateSystemAnnouncements(): Promise<void> {
    console.log('[AnnouncementService] Generating system announcements...');
    
    const today = new Date();
    const employees = await db.select().from(employeeRecords);
    
    for (const employee of employees) {
      await this.checkEmployeeThresholds(employee, today);
    }
    
    // Generate time-based reminders
    await this.generateTimeBasedReminders(today);
  }

  private async checkEmployeeThresholds(employee: any, today: Date): Promise<void> {
    const employeeCode = employee.employeeCode;
    
    for (const threshold of this.defaultThresholds) {
      if (!threshold.enabled) continue;
      
      const shouldTrigger = await this.evaluateThreshold(employeeCode, threshold, today);
      
      if (shouldTrigger) {
        await this.createSystemAnnouncement(employee, threshold);
      }
    }
  }

  private async evaluateThreshold(employeeCode: string, threshold: AnnouncementThreshold, today: Date): Promise<boolean> {
    const last30Days = subDays(today, 30);
    const last7Days = subDays(today, 7);
    
    switch (threshold.condition) {
      case 'consecutive_late_days':
        return await this.checkConsecutiveLateArrivals(employeeCode, threshold.threshold, last7Days, today);
      
      case 'consecutive_present_days':
        return await this.checkConsecutivePresent(employeeCode, threshold.threshold, last30Days, today);
      
      case 'weekly_score_below':
        return await this.checkWeeklyScore(employeeCode, threshold.threshold, last7Days, today);
      
      case 'weekly_overtime_hours':
        return await this.checkOvertimeHours(employeeCode, threshold.threshold, last7Days, today);
      
      case 'consecutive_absent_days':
        return await this.checkConsecutiveAbsent(employeeCode, threshold.threshold, last7Days, today);
      
      default:
        return false;
    }
  }

  private async checkConsecutiveLateArrivals(employeeCode: string, threshold: number, startDate: Date, endDate: Date): Promise<boolean> {
    const records = await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeCode, employeeCode),
          gte(attendanceRecords.date, startDate),
          lte(attendanceRecords.date, endDate)
        )
      )
      .orderBy(desc(attendanceRecords.date));
    
    let consecutiveLate = 0;
    for (const record of records) {
      if (record.status === 'late') {
        consecutiveLate++;
        if (consecutiveLate >= threshold) return true;
      } else {
        consecutiveLate = 0;
      }
    }
    
    return false;
  }

  private async checkConsecutivePresent(employeeCode: string, threshold: number, startDate: Date, endDate: Date): Promise<boolean> {
    const records = await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeCode, employeeCode),
          gte(attendanceRecords.date, startDate),
          lte(attendanceRecords.date, endDate)
        )
      )
      .orderBy(desc(attendanceRecords.date));
    
    let consecutivePresent = 0;
    for (const record of records) {
      if (record.status === 'present' || record.status === 'late') {
        consecutivePresent++;
      } else {
        consecutivePresent = 0;
      }
    }
    
    return consecutivePresent >= threshold;
  }

  private async checkWeeklyScore(employeeCode: string, threshold: number, startDate: Date, endDate: Date): Promise<boolean> {
    const scores = await db
      .select()
      .from(employeeScores)
      .where(
        and(
          eq(employeeScores.employeeCode, employeeCode),
          gte(employeeScores.date, startDate),
          lte(employeeScores.date, endDate)
        )
      );
    
    if (scores.length === 0) return false;
    
    const avgScore = scores.reduce((sum, score) => sum + score.totalScore, 0) / scores.length;
    return avgScore < threshold;
  }

  private async checkOvertimeHours(employeeCode: string, threshold: number, startDate: Date, endDate: Date): Promise<boolean> {
    const records = await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeCode, employeeCode),
          gte(attendanceRecords.date, startDate),
          lte(attendanceRecords.date, endDate)
        )
      );
    
    const totalOvertime = records.reduce((sum, record) => {
      return sum + (record.overtimeHours || 0);
    }, 0);
    
    return totalOvertime >= threshold;
  }

  private async checkConsecutiveAbsent(employeeCode: string, threshold: number, startDate: Date, endDate: Date): Promise<boolean> {
    const records = await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeCode, employeeCode),
          gte(attendanceRecords.date, startDate),
          lte(attendanceRecords.date, endDate)
        )
      )
      .orderBy(desc(attendanceRecords.date));
    
    let consecutiveAbsent = 0;
    for (const record of records) {
      if (record.status === 'absent') {
        consecutiveAbsent++;
        if (consecutiveAbsent >= threshold) return true;
      } else {
        consecutiveAbsent = 0;
      }
    }
    
    return false;
  }

  private async createSystemAnnouncement(employee: any, threshold: AnnouncementThreshold): Promise<void> {
    // Check if similar announcement already exists for this employee in last 7 days
    const existingAnnouncement = await db
      .select()
      .from(announcements)
      .where(
        and(
          eq(announcements.targetAudience, 'specific_employees'),
          gte(announcements.createdAt, subDays(new Date(), 7))
        )
      );
    
    // Check if announcement with same threshold already exists
    const isDuplicate = existingAnnouncement.some(ann => 
      ann.targetEmployees && 
      (ann.targetEmployees as any[]).includes(employee.employeeCode) &&
      ann.content.includes(threshold.message)
    );
    
    if (isDuplicate) return;
    
    await db.insert(announcements).values({
      title: `${threshold.name} - ${employee.firstName} ${employee.lastName}`,
      content: threshold.message,
      priority: threshold.priority,
      targetAudience: 'specific_employees',
      targetEmployees: [employee.employeeCode],
      publishedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      isActive: true,
      createdBy: null, // System generated
    });
    
    console.log(`[AnnouncementService] Created system announcement: ${threshold.name} for ${employee.employeeCode}`);
  }

  private async generateTimeBasedReminders(today: Date): Promise<void> {
    const dayOfMonth = today.getDate();
    
    // Monthly timesheet reminder
    if (dayOfMonth === 25) {
      await this.createCompanyWideReminder(
        'Monthly Timesheet Reminder',
        'Submit your timesheets by Friday, end of month.',
        'normal',
        7 // expires in 7 days
      );
    }
    
    // Pay day reminder
    if (dayOfMonth === 28) {
      await this.createCompanyWideReminder(
        'Pay Day Reminder',
        'Salaries will be processed tomorrow. Ensure all attendance records are complete.',
        'high',
        2 // expires in 2 days
      );
    }
  }

  private async createCompanyWideReminder(title: string, message: string, priority: string, expiresInDays: number): Promise<void> {
    await db.insert(announcements).values({
      title,
      content: message,
      priority,
      targetAudience: 'all',
      publishedAt: new Date(),
      expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
      isActive: true,
      createdBy: null, // System generated
    });
    
    console.log(`[AnnouncementService] Created company-wide reminder: ${title}`);
  }

  // Get active announcements for mobile interface
  async getActiveAnnouncementsForEmployee(employeeCode: string, department: string): Promise<any[]> {
    const now = new Date();
    
    const allAnnouncements = await db
      .select()
      .from(announcements)
      .where(
        and(
          eq(announcements.isActive, true),
          lte(announcements.publishedAt, now),
          or(
            eq(announcements.expiresAt, null),
            gte(announcements.expiresAt, now)
          )
        )
      )
      .orderBy(desc(announcements.priority), desc(announcements.createdAt));
    
    // Filter based on target audience
    const relevantAnnouncements = allAnnouncements.filter(announcement => {
      if (announcement.targetAudience === 'all') return true;
      
      if (announcement.targetAudience === 'department') {
        const targetDepts = announcement.targetDepartments as string[] || [];
        return targetDepts.includes(department);
      }
      
      if (announcement.targetAudience === 'specific_employees') {
        const targetEmployees = announcement.targetEmployees as string[] || [];
        return targetEmployees.includes(employeeCode);
      }
      
      return false;
    });
    
    return relevantAnnouncements;
  }
}

export const announcementService = new AnnouncementService();