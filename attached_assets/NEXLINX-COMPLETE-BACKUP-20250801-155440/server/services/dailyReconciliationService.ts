import { db } from '../db';
import { attendancePullExt } from '@shared/schema';
import { and, gte, lte, sql } from 'drizzle-orm';
import { BioTimeService } from './biotimeService';
import { EventEmitter } from 'events';

interface DailyReconciliation {
  date: string;
  dateObj: Date;
  biotimeCount: number;
  ourCount: number;
  missingCount: number;
  isComplete: boolean;
  needsFullDayPoll: boolean;
  lastChecked: Date;
}

interface ReconciliationSummary {
  totalDaysChecked: number;
  incompleteDays: number;
  totalMissingRecords: number;
  oldestIncompleteDay: string | null;
  recommendedAction: 'none' | 'poll_recent' | 'poll_multiple_days' | 'full_recovery';
}

export class DailyReconciliationService extends EventEmitter {
  private bioTimeService: BioTimeService;
  private isRunning = false;
  private reconciliationInterval: NodeJS.Timeout | null = null;
  private checkIntervalHours = 1; // Check every hour
  private maxDaysToCheck = 7; // Check last 7 days
  private dailyReconciliations: Map<string, DailyReconciliation> = new Map();
  private completenessThreshold = 0.95; // 95% or higher is considered complete

  constructor() {
    super();
    this.bioTimeService = new BioTimeService();
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  async start() {
    if (this.isRunning) {
      console.log('[DailyReconciliation] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[DailyReconciliation] Starting daily reconciliation service...');

    // Initial reconciliation
    await this.performDailyReconciliation();

    // Schedule regular reconciliation
    this.reconciliationInterval = setInterval(async () => {
      await this.performDailyReconciliation();
    }, this.checkIntervalHours * 60 * 60 * 1000);

    console.log(`[DailyReconciliation] Service started - checking every ${this.checkIntervalHours} hours`);
  }

  async stop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.reconciliationInterval) {
      clearInterval(this.reconciliationInterval);
      this.reconciliationInterval = null;
    }

    console.log('[DailyReconciliation] Service stopped');
  }

  async performDailyReconciliation(): Promise<DailyReconciliation[]> {
    console.log('[DailyReconciliation] 🔍 Performing daily reconciliation...');
    
    try {
      const reconciliations: DailyReconciliation[] = [];
      
      // Check each day for the last N days
      for (let i = 0; i < this.maxDaysToCheck; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        // Convert to Pakistan timezone
        const pakistanDate = new Date(date.toLocaleString("en-US", {timeZone: "Asia/Karachi"}));
        
        const startOfDay = new Date(pakistanDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(pakistanDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        const dateStr = pakistanDate.toISOString().split('T')[0];
        
        // Get counts for this day
        const reconciliation = await this.reconcileDay(dateStr, startOfDay, endOfDay);
        reconciliations.push(reconciliation);
        
        // Cache the result
        this.dailyReconciliations.set(dateStr, reconciliation);
        
        if (!reconciliation.isComplete) {
          console.log(`[DailyReconciliation] Day ${dateStr}: ${reconciliation.missingCount}/${reconciliation.biotimeCount} records missing`);
        }
      }

      // Emit reconciliation results
      this.emit('dailyReconciliationComplete', reconciliations);
      
      // Check for incomplete days
      const incompleteDays = reconciliations.filter(r => !r.isComplete);
      if (incompleteDays.length > 0) {
        console.log(`[DailyReconciliation] 🚨 Found ${incompleteDays.length} incomplete days`);
        this.emit('incompleteDaysDetected', incompleteDays);
        
        // Trigger full day polling for incomplete days
        for (const incompleteDay of incompleteDays) {
          if (incompleteDay.needsFullDayPoll) {
            console.log(`[DailyReconciliation] 🔄 Triggering full day poll for ${incompleteDay.date}`);
            this.emit('fullDayPollRequested', incompleteDay);
          }
        }
      } else {
        console.log('[DailyReconciliation] ✅ All days complete');
      }

      return reconciliations;

    } catch (error) {
      console.error('[DailyReconciliation] Error during reconciliation:', error);
      this.emit('reconciliationError', error);
      return [];
    }
  }

  private async reconcileDay(dateStr: string, startOfDay: Date, endOfDay: Date): Promise<DailyReconciliation> {
    // Get our count for this day
    const ourCount = await this.getOurDailyCount(startOfDay, endOfDay);
    
    // Get BioTime count for this day
    const biotimeCount = await this.getBioTimeDailyCount(startOfDay, endOfDay);
    
    const missingCount = Math.max(0, biotimeCount - ourCount);
    const completenessRatio = biotimeCount > 0 ? ourCount / biotimeCount : 1;
    const isComplete = completenessRatio >= this.completenessThreshold;
    
    // Determine if full day poll is needed
    const needsFullDayPoll = missingCount > 0 && (
      missingCount > 50 || // More than 50 records missing
      completenessRatio < 0.8 || // Less than 80% complete
      biotimeCount > 0 && ourCount === 0 // We have no records but BioTime has some
    );
    
    return {
      date: dateStr,
      dateObj: startOfDay,
      biotimeCount,
      ourCount,
      missingCount,
      isComplete,
      needsFullDayPoll,
      lastChecked: new Date()
    };
  }

  private async getOurDailyCount(startOfDay: Date, endOfDay: Date): Promise<number> {
    const result = await db
      .select({
        count: sql<number>`COUNT(*)`
      })
      .from(attendancePullExt)
      .where(and(
        gte(sql`(${attendancePullExt.allFields}->>'punch_time')::timestamp`, startOfDay),
        lte(sql`(${attendancePullExt.allFields}->>'punch_time')::timestamp`, endOfDay)
      ));
    
    return result[0]?.count || 0;
  }

  private async getBioTimeDailyCount(startOfDay: Date, endOfDay: Date): Promise<number> {
    try {
      // Authenticate if needed
      const authenticated = await this.bioTimeService.authenticate();
      if (!authenticated) {
        console.log('[DailyReconciliation] BioTime authentication failed');
        return 0;
      }

      // Query BioTime API for daily count
      const axios = require('axios');
      const startStr = startOfDay.toISOString().replace('T', ' ').replace('Z', '');
      const endStr = endOfDay.toISOString().replace('T', ' ').replace('Z', '');
      
      const response = await axios.get(
        `${process.env.BIOTIME_API_URL}iclock/api/transactions/`,
        {
          params: {
            start_time: startStr,
            end_time: endStr,
            page_size: 1, // Minimum transfer - we only need count
            page: 1
          },
          headers: {
            'Authorization': `JWT ${(this.bioTimeService as any).authToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000,
          httpsAgent: new (require('https')).Agent({ rejectUnauthorized: false })
        }
      );

      return response.data?.count || 0;

    } catch (error) {
      console.error('[DailyReconciliation] Error getting BioTime daily count:', error.message);
      return 0;
    }
  }

  async getOptimalPollingStrategy(): Promise<{
    strategy: 'normal' | 'full_day' | 'multi_day_recovery';
    targetDates: string[];
    windowStart: Date;
    windowEnd: Date;
    expectedRecords: number;
    reason: string;
  }> {
    console.log('[DailyReconciliation] 🧠 Calculating optimal polling strategy...');
    
    // Get current reconciliation status
    const reconciliations = await this.performDailyReconciliation();
    const incompleteDays = reconciliations.filter(r => !r.isComplete);
    
    if (incompleteDays.length === 0) {
      // No incomplete days - use normal polling
      const now = new Date();
      const endTime = new Date(now.getTime() - (1 * 60 * 1000));
      const startTime = new Date(endTime.getTime() - (5 * 60 * 1000));
      
      return {
        strategy: 'normal',
        targetDates: [],
        windowStart: startTime,
        windowEnd: endTime,
        expectedRecords: 0,
        reason: 'All days complete - normal polling'
      };
    }

    // Sort incomplete days by priority (most recent first, then by missing count)
    incompleteDays.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      
      // Prioritize recent days
      if (dateA.getTime() !== dateB.getTime()) {
        return dateB.getTime() - dateA.getTime();
      }
      
      // Then by missing count
      return b.missingCount - a.missingCount;
    });

    const criticalDays = incompleteDays.filter(d => d.needsFullDayPoll);
    
    if (criticalDays.length > 0) {
      if (criticalDays.length === 1) {
        // Single day recovery
        const targetDay = criticalDays[0];
        const startOfDay = new Date(targetDay.dateObj);
        const endOfDay = new Date(targetDay.dateObj);
        endOfDay.setHours(23, 59, 59, 999);
        
        return {
          strategy: 'full_day',
          targetDates: [targetDay.date],
          windowStart: startOfDay,
          windowEnd: endOfDay,
          expectedRecords: targetDay.missingCount,
          reason: `Full day recovery for ${targetDay.date} - ${targetDay.missingCount} records missing`
        };
      } else {
        // Multiple day recovery
        const targetDates = criticalDays.slice(0, 3).map(d => d.date); // Max 3 days at once
        const earliestDay = criticalDays[criticalDays.length - 1];
        const latestDay = criticalDays[0];
        
        const startOfEarliest = new Date(earliestDay.dateObj);
        const endOfLatest = new Date(latestDay.dateObj);
        endOfLatest.setHours(23, 59, 59, 999);
        
        const totalMissing = criticalDays.slice(0, 3).reduce((sum, d) => sum + d.missingCount, 0);
        
        return {
          strategy: 'multi_day_recovery',
          targetDates,
          windowStart: startOfEarliest,
          windowEnd: endOfLatest,
          expectedRecords: totalMissing,
          reason: `Multi-day recovery for ${targetDates.length} days - ${totalMissing} total records missing`
        };
      }
    }

    // No critical days but some incomplete - use extended polling for most recent
    const recentIncomplete = incompleteDays[0];
    const now = new Date();
    const endTime = new Date(now.getTime() - (1 * 60 * 1000));
    const startTime = new Date(recentIncomplete.dateObj);
    
    return {
      strategy: 'normal',
      targetDates: [recentIncomplete.date],
      windowStart: startTime,
      windowEnd: endTime,
      expectedRecords: recentIncomplete.missingCount,
      reason: `Extended polling for ${recentIncomplete.date} - ${recentIncomplete.missingCount} records missing`
    };
  }

  async getReconciliationSummary(): Promise<ReconciliationSummary> {
    const reconciliations = Array.from(this.dailyReconciliations.values());
    const incompleteDays = reconciliations.filter(r => !r.isComplete);
    
    let oldestIncompleteDay: string | null = null;
    if (incompleteDays.length > 0) {
      const oldest = incompleteDays.reduce((oldest, current) => 
        new Date(current.date) < new Date(oldest.date) ? current : oldest
      );
      oldestIncompleteDay = oldest.date;
    }
    
    const totalMissingRecords = incompleteDays.reduce((sum, d) => sum + d.missingCount, 0);
    
    let recommendedAction: 'none' | 'poll_recent' | 'poll_multiple_days' | 'full_recovery' = 'none';
    
    if (totalMissingRecords > 500) {
      recommendedAction = 'full_recovery';
    } else if (incompleteDays.length > 2) {
      recommendedAction = 'poll_multiple_days';
    } else if (incompleteDays.length > 0) {
      recommendedAction = 'poll_recent';
    }
    
    return {
      totalDaysChecked: reconciliations.length,
      incompleteDays: incompleteDays.length,
      totalMissingRecords,
      oldestIncompleteDay,
      recommendedAction
    };
  }

  async triggerFullDayPoll(dateStr: string): Promise<boolean> {
    console.log(`[DailyReconciliation] 🚀 Triggering full day poll for ${dateStr}`);
    
    const reconciliation = this.dailyReconciliations.get(dateStr);
    if (!reconciliation) {
      console.log(`[DailyReconciliation] No reconciliation data for ${dateStr}`);
      return false;
    }
    
    try {
      const startOfDay = new Date(reconciliation.dateObj);
      const endOfDay = new Date(reconciliation.dateObj);
      endOfDay.setHours(23, 59, 59, 999);
      
      console.log(`[DailyReconciliation] Pulling full day: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);
      console.log(`[DailyReconciliation] Expected to recover: ${reconciliation.missingCount} records`);
      
      // Trigger the BioTime pull for the full day
      const pullResult = await this.bioTimeService.pullAttendanceData(startOfDay, endOfDay);
      
      if (pullResult.success) {
        console.log(`[DailyReconciliation] ✅ Full day poll successful: ${pullResult.recordsPulled} records pulled`);
        
        // Update reconciliation
        await this.reconcileDay(dateStr, startOfDay, endOfDay);
        
        this.emit('fullDayPollComplete', {
          date: dateStr,
          recordsPulled: pullResult.recordsPulled,
          success: true
        });
        
        return true;
      } else {
        console.log(`[DailyReconciliation] ❌ Full day poll failed: ${pullResult.error}`);
        
        this.emit('fullDayPollComplete', {
          date: dateStr,
          recordsPulled: 0,
          success: false,
          error: pullResult.error
        });
        
        return false;
      }
      
    } catch (error) {
      console.error(`[DailyReconciliation] Error during full day poll for ${dateStr}:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const dailyReconciliationService = new DailyReconciliationService();