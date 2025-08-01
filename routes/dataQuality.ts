
import express from 'express';
import { db } from '../db';
import { attendancePullExt } from '@shared/schema';
import { sql } from 'drizzle-orm';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = express.Router();

interface DataQuality {
  date: string;
  quality: 'good' | 'fair' | 'poor';
  recordCount: number;
  expectedRecords: number;
  qualityPercentage: number;
  gaps: number;
  issues: string[];
}

interface DataStats {
  totalRecords: number;
  goodDays: number;
  fairDays: number;
  poorDays: number;
  averageQuality: number;
  lastUpdated: string;
}

// Get data quality for a specific month
router.get('/data-quality', requireAuth, async (req, res) => {
  try {
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    console.log(`[DataQuality] Fetching data quality for ${year}-${month}`);

    // Get daily attendance data for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const dailyData = await db.execute(sql`
      SELECT 
        DATE(all_fields->>'punch_time') as date,
        COUNT(*) as record_count
      FROM attendance_pull_ext 
      WHERE DATE(all_fields->>'punch_time') >= ${startDate.toISOString().split('T')[0]}
        AND DATE(all_fields->>'punch_time') <= ${endDate.toISOString().split('T')[0]}
        AND all_fields->>'punch_time' IS NOT NULL
      GROUP BY DATE(all_fields->>'punch_time')
      ORDER BY DATE(all_fields->>'punch_time')
    `);

    // Process daily data into quality metrics
    const qualityData: DataQuality[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayData = dailyData.find((d: any) => d.date === dateStr);
      const recordCount = dayData ? parseInt(dayData.record_count) : 0;
      
      // Estimate expected records based on working days (weekdays)
      const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
      const expectedRecords = isWeekend ? 100 : 500; // Rough estimates
      
      const qualityPercentage = expectedRecords > 0 ? Math.min(100, (recordCount / expectedRecords) * 100) : 0;
      
      let quality: 'good' | 'fair' | 'poor';
      let issues: string[] = [];
      
      if (qualityPercentage >= 80) {
        quality = 'good';
      } else if (qualityPercentage >= 50) {
        quality = 'fair';
        issues.push('Lower than expected attendance records');
      } else {
        quality = 'poor';
        issues.push('Significantly low attendance records');
        if (recordCount === 0) {
          issues.push('No attendance data available');
        }
      }
      
      qualityData.push({
        date: dateStr,
        quality,
        recordCount,
        expectedRecords,
        qualityPercentage: Math.round(qualityPercentage),
        gaps: expectedRecords - recordCount,
        issues
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`[DataQuality] Returning ${qualityData.length} days of quality data`);
    res.json(qualityData);

  } catch (error) {
    console.error('[DataQuality] Error fetching data quality:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch data quality information'
    });
  }
});

// Get overall data statistics
router.get('/data-stats', requireAuth, async (req, res) => {
  try {
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    console.log(`[DataStats] Fetching data statistics for ${year}-${month}`);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Get total records for the month
    const totalRecordsResult = await db.execute(sql`
      SELECT COUNT(*) as total
      FROM attendance_pull_ext 
      WHERE DATE(all_fields->>'punch_time') >= ${startDate.toISOString().split('T')[0]}
        AND DATE(all_fields->>'punch_time') <= ${endDate.toISOString().split('T')[0]}
        AND all_fields->>'punch_time' IS NOT NULL
    `);

    const totalRecords = totalRecordsResult[0]?.total || 0;

    // Get daily quality data to calculate stats
    const dailyQualityResult = await db.execute(sql`
      SELECT 
        DATE(all_fields->>'punch_time') as date,
        COUNT(*) as record_count
      FROM attendance_pull_ext 
      WHERE DATE(all_fields->>'punch_time') >= ${startDate.toISOString().split('T')[0]}
        AND DATE(all_fields->>'punch_time') <= ${endDate.toISOString().split('T')[0]}
        AND all_fields->>'punch_time' IS NOT NULL
      GROUP BY DATE(all_fields->>'punch_time')
    `);

    // Calculate quality distribution
    let goodDays = 0;
    let fairDays = 0;
    let poorDays = 0;
    let totalQuality = 0;

    // Process each day in the month
    const currentDate = new Date(startDate);
    let totalDays = 0;
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayData = dailyQualityResult.find((d: any) => d.date === dateStr);
      const recordCount = dayData ? parseInt(dayData.record_count) : 0;
      
      const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
      const expectedRecords = isWeekend ? 100 : 500;
      const qualityPercentage = expectedRecords > 0 ? Math.min(100, (recordCount / expectedRecords) * 100) : 0;
      
      totalQuality += qualityPercentage;
      totalDays++;
      
      if (qualityPercentage >= 80) {
        goodDays++;
      } else if (qualityPercentage >= 50) {
        fairDays++;
      } else {
        poorDays++;
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const averageQuality = totalDays > 0 ? Math.round(totalQuality / totalDays) : 0;

    const stats: DataStats = {
      totalRecords: parseInt(totalRecords.toString()),
      goodDays,
      fairDays,
      poorDays,
      averageQuality,
      lastUpdated: new Date().toISOString()
    };

    console.log(`[DataStats] Returning stats:`, stats);
    res.json(stats);

  } catch (error) {
    console.error('[DataStats] Error fetching data statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch data statistics'
    });
  }
});

// Trigger data quality recalculation
router.post('/recalculate-quality', requireAdmin, async (req, res) => {
  try {
    console.log(`[DataQuality] Manual recalculation triggered by ${req.session.username}`);
    
    // This could trigger background recalculation if needed
    // For now, just return success as the data is calculated on-demand
    
    res.json({
      success: true,
      message: 'Data quality recalculation completed',
      triggeredBy: req.session.username,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[DataQuality] Error during recalculation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to recalculate data quality'
    });
  }
});

export default router;
