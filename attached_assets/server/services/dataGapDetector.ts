import { db } from '../db';
import { attendancePullExt } from '@shared/schema';
import { and, gte, lte, sql } from 'drizzle-orm';
import { BioTimeService } from './biotimeService';
import { EventEmitter } from 'events';

interface DataGap {
  startTime: Date;
  endTime: Date;
  expectedRecords: number;
  actualRecords: number;
  missingRecords: number;
  gapSizeHours: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface PollingWindow {
  startTime: Date;
  endTime: Date;
  windowMinutes: number;
  reason: string;
  priority: 'normal' | 'extended' | 'recovery';
}

export class DataGapDetector extends EventEmitter {
  private bioTimeService: BioTimeService;
  private isRunning = false;
  private detectionInterval: NodeJS.Timeout | null = null;
  private detectionIntervalMinutes = 15; // Check for gaps every 15 minutes
  private maxLookbackHours = 24; // Don't look back more than 24 hours normally
  private emergencyLookbackHours = 72; // Emergency lookback for severe gaps

  constructor() {
    super();
    this.bioTimeService = new BioTimeService();
    // Fix SSL certificate issue
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  async start() {
    if (this.isRunning) {
      console.log('[DataGapDetector] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[DataGapDetector] Starting data gap detection...');

    // Initial gap detection
    await this.detectDataGaps();

    // Schedule regular gap detection
    this.detectionInterval = setInterval(async () => {
      await this.detectDataGaps();
    }, this.detectionIntervalMinutes * 60 * 1000);

    console.log(`[DataGapDetector] Gap detection started - checking every ${this.detectionIntervalMinutes} minutes`);
  }

  async stop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }

    console.log('[DataGapDetector] Gap detection stopped');
  }

  async detectDataGaps(): Promise<DataGap[]> {
    console.log('[DataGapDetector] 🔍 Detecting data gaps...');
    
    try {
      const gaps: DataGap[] = [];
      
      // Check different time periods
      const timeSlots = [
        { hours: 1, name: 'Last Hour' },
        { hours: 3, name: 'Last 3 Hours' },
        { hours: 6, name: 'Last 6 Hours' },
        { hours: 12, name: 'Last 12 Hours' },
        { hours: 24, name: 'Last 24 Hours' }
      ];

      for (const slot of timeSlots) {
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - (slot.hours * 60 * 60 * 1000));
        
        // Get our records for this time slot
        const ourRecords = await this.getOurRecords(startTime, endTime);
        
        // Get BioTime records for this time slot
        const biotimeRecords = await this.getBioTimeRecords(startTime, endTime);
        
        if (biotimeRecords > 0) {
          const missingRecords = biotimeRecords - ourRecords;
          
          if (missingRecords > 0) {
            const gap: DataGap = {
              startTime,
              endTime,
              expectedRecords: biotimeRecords,
              actualRecords: ourRecords,
              missingRecords,
              gapSizeHours: slot.hours,
              priority: this.calculateGapPriority(missingRecords, biotimeRecords, slot.hours)
            };
            
            gaps.push(gap);
            console.log(`[DataGapDetector] Gap detected in ${slot.name}: ${missingRecords}/${biotimeRecords} records missing (${gap.priority})`);
          }
        }
      }

      // Emit gap detection results
      this.emit('gapsDetected', gaps);
      
      if (gaps.length > 0) {
        console.log(`[DataGapDetector] 🚨 Found ${gaps.length} data gaps`);
        
        // Find the most critical gap
        const criticalGaps = gaps.filter(g => g.priority === 'critical');
        const highGaps = gaps.filter(g => g.priority === 'high');
        
        if (criticalGaps.length > 0) {
          console.log(`[DataGapDetector] 🔴 ${criticalGaps.length} CRITICAL gaps detected`);
          this.emit('criticalGap', criticalGaps);
        } else if (highGaps.length > 0) {
          console.log(`[DataGapDetector] 🟠 ${highGaps.length} HIGH priority gaps detected`);
          this.emit('highPriorityGap', highGaps);
        }
      } else {
        console.log('[DataGapDetector] ✅ No data gaps detected');
      }

      return gaps;

    } catch (error) {
      console.error('[DataGapDetector] Error detecting gaps:', error);
      this.emit('detectionError', error);
      return [];
    }
  }

  async calculateOptimalPollingWindow(): Promise<PollingWindow> {
    console.log('[DataGapDetector] 🧠 Calculating optimal polling window...');
    
    try {
      // Detect current gaps
      const gaps = await this.detectDataGaps();
      
      if (gaps.length === 0) {
        // No gaps - use normal polling
        const now = new Date();
        const endTime = new Date(now.getTime() - (1 * 60 * 1000)); // 1 minute ago
        const startTime = new Date(endTime.getTime() - (7 * 60 * 1000)); // 7 minutes back
        
        return {
          startTime,
          endTime,
          windowMinutes: 7,
          reason: 'Normal polling - no gaps detected',
          priority: 'normal'
        };
      }

      // Find the most critical gap
      const criticalGaps = gaps.filter(g => g.priority === 'critical');
      const highGaps = gaps.filter(g => g.priority === 'high');
      
      let targetGap: DataGap;
      
      if (criticalGaps.length > 0) {
        targetGap = criticalGaps[0]; // Most recent critical gap
      } else if (highGaps.length > 0) {
        targetGap = highGaps[0]; // Most recent high priority gap
      } else {
        targetGap = gaps[0]; // Most recent gap
      }

      // Calculate polling window to cover the gap
      const now = new Date();
      const gapStartTime = new Date(targetGap.startTime);
      const gapEndTime = new Date(now.getTime() - (1 * 60 * 1000)); // 1 minute ago
      
      // Add buffer to ensure we get all data
      const bufferMinutes = Math.min(30, targetGap.gapSizeHours * 5); // 5 minutes per hour of gap, max 30 minutes
      const startTime = new Date(gapStartTime.getTime() - (bufferMinutes * 60 * 1000));
      
      const windowMinutes = Math.ceil((gapEndTime.getTime() - startTime.getTime()) / (60 * 1000));
      
      console.log(`[DataGapDetector] Gap-based polling: ${targetGap.missingRecords} missing records, ${windowMinutes} minute window`);
      
      return {
        startTime,
        endTime: gapEndTime,
        windowMinutes,
        reason: `Gap recovery - ${targetGap.missingRecords} missing records in ${targetGap.gapSizeHours}h period`,
        priority: targetGap.priority === 'critical' ? 'recovery' : 'extended'
      };

    } catch (error) {
      console.error('[DataGapDetector] Error calculating polling window:', error);
      
      // Fallback to extended polling on error
      const now = new Date();
      const endTime = new Date(now.getTime() - (1 * 60 * 1000));
      const startTime = new Date(endTime.getTime() - (30 * 60 * 1000)); // 30 minutes back
      
      return {
        startTime,
        endTime,
        windowMinutes: 30,
        reason: 'Error fallback - extended polling',
        priority: 'extended'
      };
    }
  }

  private async getOurRecords(startTime: Date, endTime: Date): Promise<number> {
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

  private async getBioTimeRecords(startTime: Date, endTime: Date): Promise<number> {
    try {
      // Authenticate if needed
      const authenticated = await this.bioTimeService.authenticate();
      if (!authenticated) {
        console.log('[DataGapDetector] BioTime authentication failed');
        return 0;
      }

      // Query BioTime API for record count
      const axios = require('axios');
      const startStr = startTime.toISOString().replace('T', ' ').replace('Z', '');
      const endStr = endTime.toISOString().replace('T', ' ').replace('Z', '');
      
      const response = await axios.get(
        `${process.env.BIOTIME_API_URL}iclock/api/transactions/`,
        {
          params: {
            start_time: startStr,
            end_time: endStr,
            page_size: 1, // We only need the count
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

      if (response.data && response.data.count !== undefined) {
        return response.data.count;
      }

      return 0;

    } catch (error) {
      console.error('[DataGapDetector] Error querying BioTime:', error.message);
      return 0;
    }
  }

  private calculateGapPriority(missingRecords: number, totalRecords: number, gapHours: number): 'low' | 'medium' | 'high' | 'critical' {
    const missingPercentage = (missingRecords / totalRecords) * 100;
    
    // Critical: >50% missing or >100 records missing
    if (missingPercentage > 50 || missingRecords > 100) {
      return 'critical';
    }
    
    // High: >25% missing or >50 records missing
    if (missingPercentage > 25 || missingRecords > 50) {
      return 'high';
    }
    
    // Medium: >10% missing or >20 records missing
    if (missingPercentage > 10 || missingRecords > 20) {
      return 'medium';
    }
    
    // Low: anything else
    return 'low';
  }

  async getStatus(): Promise<{
    isRunning: boolean;
    detectionIntervalMinutes: number;
    lastDetectionTime: Date | null;
    currentGaps: DataGap[];
  }> {
    const currentGaps = await this.detectDataGaps();
    
    return {
      isRunning: this.isRunning,
      detectionIntervalMinutes: this.detectionIntervalMinutes,
      lastDetectionTime: new Date(),
      currentGaps
    };
  }

  updateConfig(config: {
    detectionIntervalMinutes?: number;
    maxLookbackHours?: number;
  }) {
    if (config.detectionIntervalMinutes) {
      this.detectionIntervalMinutes = config.detectionIntervalMinutes;
      
      // Restart detection with new interval
      if (this.isRunning) {
        this.stop();
        this.start();
      }
    }

    if (config.maxLookbackHours) {
      this.maxLookbackHours = config.maxLookbackHours;
    }

    console.log('[DataGapDetector] Configuration updated:', {
      detectionIntervalMinutes: this.detectionIntervalMinutes,
      maxLookbackHours: this.maxLookbackHours
    });
  }
}

// Export singleton instance
export const dataGapDetector = new DataGapDetector();