import { db } from '../db';
import { attendancePullExt } from '@shared/schema';
import { and, gte, lte, sql } from 'drizzle-orm';
import { BioTimeService } from './biotimeService';

interface GapFillResult {
  dateRange: string;
  gapsBefore: number;
  gapsAfter: number;
  recordsAdded: number;
  contiguityImprovement: number;
}

export class TargetedGapFiller {
  private bioTimeService: BioTimeService;
  
  constructor() {
    this.bioTimeService = new BioTimeService();
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  async fillGapsFromJune1st(): Promise<GapFillResult> {
    console.log('[TargetedGapFiller] 🚀 Starting targeted gap filling from June 1st...');
    
    // Get initial contiguity assessment
    const initialAnalysis = await this.getContiguityAnalysis();
    console.log(`[TargetedGapFiller] Initial contiguity: ${initialAnalysis.contiguity}%`);
    
    let totalRecordsAdded = 0;
    const june1st = new Date('2025-06-01T00:00:00.000Z');
    const today = new Date();
    
    // Fill gaps day by day from June 1st to today
    const currentDate = new Date(june1st);
    
    while (currentDate <= today) {
      const dayStart = new Date(currentDate);
      const dayEnd = new Date(currentDate);
      dayEnd.setDate(dayEnd.getDate() + 1);
      
      console.log(`[TargetedGapFiller] 📅 Processing: ${dayStart.toISOString().split('T')[0]}`);
      
      // Check if this day has sufficient data
      const dayRecords = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM attendance_pull_ext
        WHERE punch_time >= ${dayStart.toISOString()} 
        AND punch_time < ${dayEnd.toISOString()}
      `);
      
      const recordCount = parseInt(dayRecords.rows[0]?.count || '0');
      const expectedMinimum = 50; // Minimum expected records per day
      
      if (recordCount < expectedMinimum) {
        console.log(`[TargetedGapFiller] 🔧 Gap detected: ${recordCount} records (expected min: ${expectedMinimum})`);
        
        try {
          // Pull data from BioTime for this specific day
          const retrievedData = await this.bioTimeService.pullAttendanceByTimeRange(
            dayStart.toISOString(),
            dayEnd.toISOString()
          );
          
          if (retrievedData && retrievedData.length > 0) {
            await this.bioTimeService.storeAttendanceData(retrievedData);
            totalRecordsAdded += retrievedData.length;
            console.log(`[TargetedGapFiller] ✅ Added ${retrievedData.length} records for ${dayStart.toISOString().split('T')[0]}`);
          } else {
            console.log(`[TargetedGapFiller] ⚠️ No additional data found for ${dayStart.toISOString().split('T')[0]}`);
          }
          
        } catch (error) {
          console.error(`[TargetedGapFiller] ❌ Error processing ${dayStart.toISOString().split('T')[0]}:`, error);
        }
      } else {
        console.log(`[TargetedGapFiller] ✅ Day complete: ${recordCount} records`);
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
      
      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Get final contiguity assessment
    const finalAnalysis = await this.getContiguityAnalysis();
    const improvement = finalAnalysis.contiguity - initialAnalysis.contiguity;
    
    console.log(`[TargetedGapFiller] 🎉 Gap filling completed!`);
    console.log(`[TargetedGapFiller] 📊 Final contiguity: ${finalAnalysis.contiguity}%`);
    console.log(`[TargetedGapFiller] 📈 Improvement: +${improvement.toFixed(1)}%`);
    console.log(`[TargetedGapFiller] 📥 Total records added: ${totalRecordsAdded}`);
    
    return {
      dateRange: `${june1st.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}`,
      gapsBefore: initialAnalysis.gaps,
      gapsAfter: finalAnalysis.gaps,
      recordsAdded: totalRecordsAdded,
      contiguityImprovement: improvement
    };
  }

  private async getContiguityAnalysis(): Promise<{contiguity: number, gaps: number, totalRecords: number}> {
    try {
      const result = await db.execute(sql`
        WITH numbered_records AS (
          SELECT 
            punch_time,
            biotime_id,
            LAG(biotime_id) OVER (ORDER BY biotime_id) as prev_id
          FROM attendance_pull_ext
          WHERE punch_time >= '2025-06-01'
          ORDER BY biotime_id
        ),
        gaps AS (
          SELECT COUNT(*) as gap_count
          FROM numbered_records
          WHERE biotime_id - prev_id > 1
        ),
        total AS (
          SELECT COUNT(*) as total_records
          FROM attendance_pull_ext
          WHERE punch_time >= '2025-06-01'
        )
        SELECT 
          total.total_records,
          gaps.gap_count,
          CASE 
            WHEN total.total_records > 0 THEN 
              ROUND(((total.total_records - gaps.gap_count) * 100.0 / total.total_records), 1)
            ELSE 0 
          END as contiguity_percentage
        FROM total, gaps
      `);
      
      const row = result.rows[0];
      return {
        contiguity: parseFloat(row?.contiguity_percentage || '0'),
        gaps: parseInt(row?.gap_count || '0'),
        totalRecords: parseInt(row?.total_records || '0')
      };
    } catch (error) {
      console.error('[TargetedGapFiller] Error calculating contiguity:', error);
      return { contiguity: 0, gaps: 0, totalRecords: 0 };
    }
  }

  async getGapAnalysis(): Promise<{
    totalRecords: number;
    totalGaps: number;
    contiguity: number;
    dateRange: string;
  }> {
    const analysis = await this.getContiguityAnalysis();
    return {
      totalRecords: analysis.totalRecords,
      totalGaps: analysis.gaps,
      contiguity: analysis.contiguity,
      dateRange: 'June 1st 2025 onwards'
    };
  }
}

export const targetedGapFiller = new TargetedGapFiller();