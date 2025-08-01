import { db } from '../db';
import { attendancePullExt } from '@shared/schema';
import { and, gte, lte, sql } from 'drizzle-orm';
import { BioTimeService } from './biotimeService';
import { EventEmitter } from 'events';

interface AggregateGap {
  timeSlot: string;
  startTime: Date;
  endTime: Date;
  expectedCount: number;
  actualCount: number;
  missingCount: number;
  gapPercentage: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface OptimalPollingWindow {
  startTime: Date;
  endTime: Date;
  windowMinutes: number;
  reason: string;
  expectedRecords: number;
  priority: 'normal' | 'extended' | 'recovery';
}

export class AggregateDataGapDetector extends EventEmitter {
  private bioTimeService: BioTimeService;
  private isRunning = false;
  private detectionInterval: NodeJS.Timeout | null = null;
  private detectionIntervalMinutes = 10; // Check every 10 minutes
  private cachedBioTimeCounts: Map<string, { count: number; timestamp: Date }> = new Map();
  private cacheValidityMinutes = 5; // Cache BioTime counts for 5 minutes

  constructor() {
    super();
    this.bioTimeService = new BioTimeService();
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  async start() {
    if (this.isRunning) {
      console.log('[AggregateGapDetector] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[AggregateGapDetector] Starting aggregate gap detection...');

    // Initial detection
    await this.detectAggregateGaps();

    // Schedule regular detection
    this.detectionInterval = setInterval(async () => {
      await this.detectAggregateGaps();
    }, this.detectionIntervalMinutes * 60 * 1000);

    console.log(`[AggregateGapDetector] Detection started - checking every ${this.detectionIntervalMinutes} minutes`);
  }

  async stop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }

    console.log('[AggregateGapDetector] Detection stopped');
  }

  async detectAggregateGaps(): Promise<AggregateGap[]> {
    console.log('[AggregateGapDetector] 🔍 Detecting gaps using aggregate counts...');
    
    try {
      const gaps: AggregateGap[] = [];
      
      // Define time slots for aggregate checking
      const timeSlots = [
        { minutes: 15, name: 'Last 15 minutes' },
        { minutes: 30, name: 'Last 30 minutes' },
        { minutes: 60, name: 'Last hour' },
        { minutes: 180, name: 'Last 3 hours' },
        { minutes: 360, name: 'Last 6 hours' },
        { minutes: 720, name: 'Last 12 hours' },
        { minutes: 1440, name: 'Last 24 hours' }
      ];

      // Get counts for each time slot
      const aggregateCounts = await this.getAggregateCountsForTimeSlots(timeSlots);
      
      for (const slot of aggregateCounts) {
        if (slot.expectedCount > 0 && slot.missingCount > 0) {
          const gap: AggregateGap = {
            timeSlot: slot.name,
            startTime: slot.startTime,
            endTime: slot.endTime,
            expectedCount: slot.expectedCount,
            actualCount: slot.actualCount,
            missingCount: slot.missingCount,
            gapPercentage: (slot.missingCount / slot.expectedCount) * 100,
            priority: this.calculateGapPriority(slot.missingCount, slot.expectedCount)
          };
          
          gaps.push(gap);
          console.log(`[AggregateGapDetector] Gap in ${slot.name}: ${slot.missingCount}/${slot.expectedCount} missing (${gap.gapPercentage.toFixed(1)}% - ${gap.priority})`);
        }
      }

      // Emit results
      this.emit('aggregateGapsDetected', gaps);
      
      if (gaps.length > 0) {
        const criticalGaps = gaps.filter(g => g.priority === 'critical');
        const highGaps = gaps.filter(g => g.priority === 'high');
        
        if (criticalGaps.length > 0) {
          console.log(`[AggregateGapDetector] 🔴 ${criticalGaps.length} CRITICAL aggregate gaps`);
          this.emit('criticalAggregateGap', criticalGaps);
        } else if (highGaps.length > 0) {
          console.log(`[AggregateGapDetector] 🟠 ${highGaps.length} HIGH priority aggregate gaps`);
          this.emit('highPriorityAggregateGap', highGaps);
        }
      } else {
        console.log('[AggregateGapDetector] ✅ No aggregate gaps detected');
      }

      return gaps;

    } catch (error) {
      console.error('[AggregateGapDetector] Error detecting aggregate gaps:', error);
      this.emit('aggregateDetectionError', error);
      return [];
    }
  }

  async calculateOptimalPollingWindow(): Promise<OptimalPollingWindow> {
    console.log('[AggregateGapDetector] 🧠 Calculating optimal polling window using aggregates...');
    
    try {
      // Get current gaps
      const gaps = await this.detectAggregateGaps();
      
      if (gaps.length === 0) {
        // No gaps - use minimal polling
        const now = new Date();
        const endTime = new Date(now.getTime() - (1 * 60 * 1000)); // 1 minute ago
        const startTime = new Date(endTime.getTime() - (5 * 60 * 1000)); // 5 minutes back
        
        return {
          startTime,
          endTime,
          windowMinutes: 5,
          reason: 'Normal polling - no gaps detected',
          expectedRecords: 0,
          priority: 'normal'
        };
      }

      // Find the most critical gap that's recent enough to poll
      const recentGaps = gaps.filter(g => {
        const gapAgeMinutes = (Date.now() - g.startTime.getTime()) / (1000 * 60);
        return gapAgeMinutes <= 1440; // Within last 24 hours
      });

      if (recentGaps.length === 0) {
        // No recent gaps - use normal polling
        const now = new Date();
        const endTime = new Date(now.getTime() - (1 * 60 * 1000));
        const startTime = new Date(endTime.getTime() - (10 * 60 * 1000));
        
        return {
          startTime,
          endTime,
          windowMinutes: 10,
          reason: 'Normal polling - gaps too old to recover',
          expectedRecords: 0,
          priority: 'normal'
        };
      }

      // Sort by priority and missing count
      recentGaps.sort((a, b) => {
        const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return b.missingCount - a.missingCount;
      });

      const targetGap = recentGaps[0];
      
      // Calculate optimal window to fill the gap
      const now = new Date();
      const endTime = new Date(now.getTime() - (1 * 60 * 1000)); // 1 minute ago
      
      // Start from the gap start time, but add buffer for overlap
      const bufferMinutes = Math.min(15, Math.max(5, targetGap.missingCount / 10)); // 5-15 minutes buffer
      const startTime = new Date(targetGap.startTime.getTime() - (bufferMinutes * 60 * 1000));
      
      const windowMinutes = Math.ceil((endTime.getTime() - startTime.getTime()) / (60 * 1000));
      
      // Limit window size to prevent excessive API calls
      const maxWindowMinutes = targetGap.priority === 'critical' ? 120 : 60;
      const finalWindowMinutes = Math.min(windowMinutes, maxWindowMinutes);
      const finalStartTime = new Date(endTime.getTime() - (finalWindowMinutes * 60 * 1000));
      
      console.log(`[AggregateGapDetector] Optimal window: ${finalWindowMinutes}min to recover ${targetGap.missingCount} records`);
      
      return {
        startTime: finalStartTime,
        endTime,
        windowMinutes: finalWindowMinutes,
        reason: `Gap recovery: ${targetGap.missingCount} missing records (${targetGap.gapPercentage.toFixed(1)}%) in ${targetGap.timeSlot}`,
        expectedRecords: targetGap.missingCount,
        priority: targetGap.priority === 'critical' ? 'recovery' : 'extended'
      };

    } catch (error) {
      console.error('[AggregateGapDetector] Error calculating optimal window:', error);
      
      // Fallback to extended polling
      const now = new Date();
      const endTime = new Date(now.getTime() - (1 * 60 * 1000));
      const startTime = new Date(endTime.getTime() - (20 * 60 * 1000));
      
      return {
        startTime,
        endTime,
        windowMinutes: 20,
        reason: 'Error fallback - extended polling',
        expectedRecords: 0,
        priority: 'extended'
      };
    }
  }

  private async getAggregateCountsForTimeSlots(timeSlots: { minutes: number; name: string }[]): Promise<Array<{
    name: string;
    startTime: Date;
    endTime: Date;
    expectedCount: number;
    actualCount: number;
    missingCount: number;
  }>> {
    const results = [];
    
    for (const slot of timeSlots) {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - (slot.minutes * 60 * 1000));
      
      // Get our count
      const actualCount = await this.getOurAggregateCount(startTime, endTime);
      
      // Get expected count from BioTime (with caching)
      const expectedCount = await this.getBioTimeAggregateCount(startTime, endTime, slot.name);
      
      results.push({
        name: slot.name,
        startTime,
        endTime,
        expectedCount,
        actualCount,
        missingCount: Math.max(0, expectedCount - actualCount)
      });
    }
    
    return results;
  }

  private async getOurAggregateCount(startTime: Date, endTime: Date): Promise<number> {
    const result = await db
      .select({
        count: sql<number>`COUNT(*)`
      })
      .from(attendancePullExt)
      .where(and(
        gte(sql`(${attendancePullExt.allFields}->>'punch_time')::timestamp`, startTime),
        lte(sql`(${attendancePullExt.allFields}->>'punch_time')::timestamp`, endTime)
      ));
    
    return result[0]?.count || 0;
  }

  private async getBioTimeAggregateCount(startTime: Date, endTime: Date, slotName: string): Promise<number> {
    const cacheKey = `${slotName}-${startTime.toISOString()}-${endTime.toISOString()}`;
    
    // Check cache
    const cached = this.cachedBioTimeCounts.get(cacheKey);
    if (cached) {
      const cacheAge = (Date.now() - cached.timestamp.getTime()) / (1000 * 60);
      if (cacheAge < this.cacheValidityMinutes) {
        return cached.count;
      }
    }

    try {
      // Authenticate if needed
      const authenticated = await this.bioTimeService.authenticate();
      if (!authenticated) {
        console.log('[AggregateGapDetector] BioTime authentication failed');
        return 0;
      }

      // Query BioTime API for aggregate count only
      const axios = require('axios');
      const startStr = startTime.toISOString().replace('T', ' ').replace('Z', '');
      const endStr = endTime.toISOString().replace('T', ' ').replace('Z', '');
      
      const response = await axios.get(
        `${process.env.BIOTIME_API_URL}iclock/api/transactions/`,
        {
          params: {
            start_time: startStr,
            end_time: endStr,
            page_size: 1, // Minimum data transfer - we only need count
            page: 1
          },
          headers: {
            'Authorization': `JWT ${(this.bioTimeService as any).authToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000,
          httpsAgent: new (require('https')).Agent({ rejectUnauthorized: false })
        }
      );

      const count = response.data?.count || 0;
      
      // Cache the result
      this.cachedBioTimeCounts.set(cacheKey, {
        count,
        timestamp: new Date()
      });
      
      // Clean old cache entries
      this.cleanCache();
      
      return count;

    } catch (error) {
      console.error('[AggregateGapDetector] Error getting BioTime aggregate count:', error.message);
      return 0;
    }
  }

  private cleanCache() {
    const now = Date.now();
    const maxAge = this.cacheValidityMinutes * 60 * 1000 * 2; // Keep for 2x validity period
    
    for (const [key, value] of this.cachedBioTimeCounts.entries()) {
      if (now - value.timestamp.getTime() > maxAge) {
        this.cachedBioTimeCounts.delete(key);
      }
    }
  }

  private calculateGapPriority(missingCount: number, expectedCount: number): 'low' | 'medium' | 'high' | 'critical' {
    const missingPercentage = (missingCount / expectedCount) * 100;
    
    // Critical: >50% missing or >100 records missing
    if (missingPercentage > 50 || missingCount > 100) {
      return 'critical';
    }
    
    // High: >25% missing or >50 records missing
    if (missingPercentage > 25 || missingCount > 50) {
      return 'high';
    }
    
    // Medium: >10% missing or >20 records missing
    if (missingPercentage > 10 || missingCount > 20) {
      return 'medium';
    }
    
    return 'low';
  }

  async getGapSummary(): Promise<{
    totalGaps: number;
    criticalGaps: number;
    totalMissingRecords: number;
    oldestGapHours: number;
    recommendedAction: string;
  }> {
    const gaps = await this.detectAggregateGaps();
    
    const criticalGaps = gaps.filter(g => g.priority === 'critical').length;
    const totalMissingRecords = gaps.reduce((sum, g) => sum + g.missingCount, 0);
    
    let oldestGapHours = 0;
    if (gaps.length > 0) {
      const oldestGap = gaps.reduce((oldest, current) => 
        current.startTime < oldest.startTime ? current : oldest
      );
      oldestGapHours = (Date.now() - oldestGap.startTime.getTime()) / (1000 * 60 * 60);
    }
    
    let recommendedAction = 'No action required';
    if (criticalGaps > 0) {
      recommendedAction = 'Immediate recovery polling required';
    } else if (totalMissingRecords > 50) {
      recommendedAction = 'Extended polling recommended';
    } else if (totalMissingRecords > 0) {
      recommendedAction = 'Normal polling with overlap';
    }
    
    return {
      totalGaps: gaps.length,
      criticalGaps,
      totalMissingRecords,
      oldestGapHours,
      recommendedAction
    };
  }
}

// Export singleton instance
export const aggregateDataGapDetector = new AggregateDataGapDetector();