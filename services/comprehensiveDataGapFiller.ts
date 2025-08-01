import { db } from '../db';
import { attendancePullExt, attendanceRecords } from '@shared/schema';
import { and, gte, lte, sql, desc, asc } from 'drizzle-orm';
import { BioTimeService } from './biotimeService';
import { EventEmitter } from 'events';

interface DataGapAnalysis {
  totalRecords: number;
  totalGaps: number;
  contiguityPercentage: number;
  gapsByDate: Map<string, number>;
  criticalGaps: GapPeriod[];
  fillableGaps: GapPeriod[];
}

interface GapPeriod {
  startTime: Date;
  endTime: Date;
  expectedRecords: number;
  actualRecords: number;
  missingRecords: number;
  gapSizeHours: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  fillable: boolean;
}

export class ComprehensiveDataGapFiller extends EventEmitter {
  private bioTimeService: BioTimeService;
  private isRunning = false;
  private fillProgress = 0;
  private totalGapsToFill = 0;
  private filledGaps = 0;

  constructor() {
    super();
    this.bioTimeService = new BioTimeService();
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  async analyzeDataGaps(): Promise<DataGapAnalysis> {
    console.log('[ComprehensiveGapFiller] 🔍 Analyzing data gaps...');
    
    try {
      // Get current data range
      const dataRange = await db.execute(sql`
        SELECT 
          COUNT(*) as total_records,
          MIN(punch_time) as earliest_record,
          MAX(punch_time) as latest_record,
          COUNT(DISTINCT emp_code) as unique_employees
        FROM attendance_pull_ext
        WHERE punch_time IS NOT NULL
      `);

      const totalRecords = parseInt(dataRange.rows[0]?.total_records || '0');
      const earliestRecord = dataRange.rows[0]?.earliest_record;
      const latestRecord = dataRange.rows[0]?.latest_record;

      if (totalRecords === 0) {
        console.log('[ComprehensiveGapFiller] ⚠️ No data found in attendance_pull_ext');
        return {
          totalRecords: 0,
          totalGaps: 0,
          contiguityPercentage: 0,
          gapsByDate: new Map(),
          criticalGaps: [],
          fillableGaps: []
        };
      }

      // Analyze gaps by finding missing sequences
      const gapAnalysis = await this.identifyDataGaps(new Date(earliestRecord), new Date(latestRecord));
      
      const contiguityPercentage = Math.round((totalRecords / (totalRecords + gapAnalysis.totalGaps)) * 100);

      console.log('[ComprehensiveGapFiller] 📊 Gap Analysis Complete:');
      console.log(`  Total Records: ${totalRecords}`);
      console.log(`  Total Gaps: ${gapAnalysis.totalGaps}`);
      console.log(`  Contiguity: ${contiguityPercentage}%`);
      console.log(`  Fillable Gaps: ${gapAnalysis.fillableGaps.length}`);
      console.log(`  Critical Gaps: ${gapAnalysis.criticalGaps.length}`);

      return {
        totalRecords,
        totalGaps: gapAnalysis.totalGaps,
        contiguityPercentage,
        gapsByDate: gapAnalysis.gapsByDate,
        criticalGaps: gapAnalysis.criticalGaps,
        fillableGaps: gapAnalysis.fillableGaps
      };

    } catch (error) {
      console.error('[ComprehensiveGapFiller] Error analyzing gaps:', error);
      throw error;
    }
  }

  private async identifyDataGaps(startDate: Date, endDate: Date): Promise<{
    totalGaps: number;
    gapsByDate: Map<string, number>;
    criticalGaps: GapPeriod[];
    fillableGaps: GapPeriod[];
  }> {
    const gapsByDate = new Map<string, number>();
    const criticalGaps: GapPeriod[] = [];
    const fillableGaps: GapPeriod[] = [];
    let totalGaps = 0;

    // Check for gaps in 6-hour windows
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current < end) {
      const windowStart = new Date(current);
      const windowEnd = new Date(current.getTime() + 6 * 60 * 60 * 1000); // 6 hours

      const recordsInWindow = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM attendance_pull_ext
        WHERE punch_time >= ${windowStart.toISOString()} 
        AND punch_time < ${windowEnd.toISOString()}
      `);

      const recordCount = parseInt(recordsInWindow.rows[0]?.count || '0');
      const expectedRecords = this.calculateExpectedRecords(windowStart, windowEnd);
      const missingRecords = Math.max(0, expectedRecords - recordCount);

      if (missingRecords > 0) {
        const dateKey = windowStart.toISOString().split('T')[0];
        gapsByDate.set(dateKey, (gapsByDate.get(dateKey) || 0) + missingRecords);
        totalGaps += missingRecords;

        const gapPeriod: GapPeriod = {
          startTime: windowStart,
          endTime: windowEnd,
          expectedRecords,
          actualRecords: recordCount,
          missingRecords,
          gapSizeHours: 6,
          priority: this.calculateGapPriority(missingRecords, expectedRecords),
          fillable: await this.isGapFillable(windowStart, windowEnd)
        };

        if (gapPeriod.priority === 'critical') {
          criticalGaps.push(gapPeriod);
        }

        if (gapPeriod.fillable) {
          fillableGaps.push(gapPeriod);
        }
      }

      current.setTime(current.getTime() + 6 * 60 * 60 * 1000); // Move to next 6-hour window
    }

    return { totalGaps, gapsByDate, criticalGaps, fillableGaps };
  }

  private calculateExpectedRecords(startTime: Date, endTime: Date): number {
    // During business hours (6 AM - 10 PM), expect ~1 record per minute per 100 employees
    // During off-hours, expect ~1 record per 10 minutes per 100 employees
    const hour = startTime.getHours();
    const isBusinessHours = hour >= 6 && hour <= 22;
    const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
    
    return Math.round(isBusinessHours ? durationMinutes * 3 : durationMinutes * 0.3);
  }

  private calculateGapPriority(missingRecords: number, expectedRecords: number): 'low' | 'medium' | 'high' | 'critical' {
    const missingPercentage = (missingRecords / expectedRecords) * 100;
    
    if (missingPercentage >= 80) return 'critical';
    if (missingPercentage >= 50) return 'high';
    if (missingPercentage >= 25) return 'medium';
    return 'low';
  }

  private async isGapFillable(startTime: Date, endTime: Date): Promise<boolean> {
    // Check if this time period is recent enough that BioTime might have the data
    const now = new Date();
    const daysSinceGap = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24);
    
    // Only try to fill gaps from the last 30 days
    return daysSinceGap <= 30;
  }

  async startComprehensiveGapFilling(): Promise<void> {
    if (this.isRunning) {
      console.log('[ComprehensiveGapFiller] Gap filling already in progress');
      return;
    }

    this.isRunning = true;
    this.fillProgress = 0;
    this.filledGaps = 0;

    try {
      console.log('[ComprehensiveGapFiller] 🚀 Starting comprehensive gap filling...');
      
      // First, analyze gaps
      const analysis = await this.analyzeDataGaps();
      
      if (analysis.fillableGaps.length === 0) {
        console.log('[ComprehensiveGapFiller] ✅ No fillable gaps found');
        this.isRunning = false;
        return;
      }

      this.totalGapsToFill = analysis.fillableGaps.length;
      console.log(`[ComprehensiveGapFiller] 📋 Found ${this.totalGapsToFill} fillable gaps`);

      // Sort gaps by priority (critical first)
      const sortedGaps = analysis.fillableGaps.sort((a, b) => {
        const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      // Fill gaps one by one
      for (const gap of sortedGaps) {
        await this.fillDataGap(gap);
        this.filledGaps++;
        this.fillProgress = Math.round((this.filledGaps / this.totalGapsToFill) * 100);
        
        console.log(`[ComprehensiveGapFiller] 📈 Progress: ${this.fillProgress}% (${this.filledGaps}/${this.totalGapsToFill})`);
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log('[ComprehensiveGapFiller] 🎉 Gap filling completed!');
      console.log(`[ComprehensiveGapFiller] 📊 Filled ${this.filledGaps} gaps`);

    } catch (error) {
      console.error('[ComprehensiveGapFiller] Error during gap filling:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private async fillDataGap(gap: GapPeriod): Promise<void> {
    try {
      console.log(`[ComprehensiveGapFiller] 🔧 Filling gap: ${gap.startTime.toISOString()} to ${gap.endTime.toISOString()}`);
      
      // Use BioTime API to pull data for this specific time period
      const gapData = await this.bioTimeService.pullAttendanceByTimeRange(
        gap.startTime.toISOString(),
        gap.endTime.toISOString()
      );

      if (gapData && gapData.length > 0) {
        console.log(`[ComprehensiveGapFiller] 📥 Retrieved ${gapData.length} records for gap`);
        
        // Store the retrieved data
        await this.bioTimeService.storeAttendanceData(gapData);
        
        console.log(`[ComprehensiveGapFiller] ✅ Successfully filled gap (${gapData.length} records)`);
      } else {
        console.log(`[ComprehensiveGapFiller] ⚠️ No data available for gap period`);
      }

    } catch (error) {
      console.error(`[ComprehensiveGapFiller] ❌ Error filling gap:`, error);
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      progress: this.fillProgress,
      totalGaps: this.totalGapsToFill,
      filledGaps: this.filledGaps,
      remainingGaps: this.totalGapsToFill - this.filledGaps
    };
  }

  async stop() {
    this.isRunning = false;
    console.log('[ComprehensiveGapFiller] Gap filling stopped');
  }
}

export const comprehensiveDataGapFiller = new ComprehensiveDataGapFiller();