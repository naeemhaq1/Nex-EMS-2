import express from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { subDays, format, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';
import { bioTimeService } from '../services/biotimeService';

const router = express.Router();

// Schema for heatmap query parameters
const heatmapQuerySchema = z.object({
  days: z.string().transform(Number).default('7'),
});

// Schema for targeted poll request
const targetedPollSchema = z.object({
  dates: z.array(z.string()),
});

// Get heatmap data for specified number of days
router.get('/heatmap', async (req, res) => {
  try {
    const { days } = heatmapQuerySchema.parse(req.query);
    
    // Work directly in Pakistan timezone since BioTime data is stored in Pakistan time
    const endDate = new Date();
    const startDate = subDays(endDate, days - 1);
    
    // Generate all dates in the range
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
    
    // Get data for each date
    const cells = await Promise.all(
      dateRange.map(async (date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        
        // Work directly with Pakistan timezone day boundaries (no conversion needed)
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
        const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
        
        // Get records for this date
        const records = await storage.getAttendancePullExtByDateRange(dayStart, dayEnd);
        
        if (records.length === 0) {
          return {
            date: dateStr,
            startBiotimeId: 0,
            endBiotimeId: 0,
            recordCount: 0,
            hasGaps: true,
            gapCount: 1,
            completeness: 0,
          };
        }
        
        // Calculate biotime ID range
        const biotimeIds = records.map(r => r.biotimeId).filter(id => id != null).sort((a, b) => a - b);
        const startBiotimeId = biotimeIds[0] || 0;
        const endBiotimeId = biotimeIds[biotimeIds.length - 1] || 0;
        
        // Check for full timestamp continuity from 00:01 to 23:59
        const dayStartTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 1); // 00:01
        const dayEndTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59); // 23:59
        
        // Get all punch timestamps for this date and sort them
        const punchTimes = records
          .map(r => new Date(r.punchTime))
          .sort((a, b) => a.getTime() - b.getTime());
        
        // Check if we have records spanning the full day (00:01 to 23:59)
        const hasFullContinuity = punchTimes.length > 0 && 
          punchTimes[0] <= dayStartTime && 
          punchTimes[punchTimes.length - 1] >= dayEndTime;
        
        // Calculate biotime ID gaps for legacy compatibility
        let gapCount = 0;
        for (let i = 0; i < biotimeIds.length - 1; i++) {
          const current = biotimeIds[i];
          const next = biotimeIds[i + 1];
          if (next - current > 1) {
            gapCount += (next - current - 1);
          }
        }
        
        // Calculate expected records based on ID range
        const expectedRecords = endBiotimeId - startBiotimeId + 1;
        const completeness = expectedRecords > 0 ? Math.round((records.length / expectedRecords) * 100) : 0;
        
        return {
          date: dateStr,
          startBiotimeId,
          endBiotimeId,
          recordCount: records.length,
          hasGaps: !hasFullContinuity, // Use timestamp continuity instead of biotime ID gaps
          hasFullContinuity,
          gapCount,
          completeness: Math.min(completeness, 100),
          isToday: dateStr === format(new Date(), 'yyyy-MM-dd'), // Mark current day
        };
      })
    );
    
    // Calculate totals
    const totalRecords = cells.reduce((sum, cell) => sum + cell.recordCount, 0);
    const totalGaps = cells.reduce((sum, cell) => sum + cell.gapCount, 0);
    
    res.json({
      cells,
      totalRecords,
      totalGaps,
      dateRange: {
        start: format(startDate, 'yyyy-MM-dd'),
        end: format(endDate, 'yyyy-MM-dd'),
      },
    });
  } catch (error) {
    console.error('Error getting heatmap data:', error);
    res.status(500).json({ error: 'Failed to get heatmap data' });
  }
});

// Targeted polling for specific dates
router.post('/targeted-poll', async (req, res) => {
  try {
    const { dates } = targetedPollSchema.parse(req.body);
    
    let totalRecordsRetrieved = 0;
    let datesProcessed = 0;
    
    for (const dateStr of dates) {
      try {
        const date = new Date(dateStr);
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);
        
        // Get existing records for this date to find gaps
        const existingRecords = await storage.getAttendancePullExtByDateRange(dayStart, dayEnd);
        
        if (existingRecords.length === 0) {
          // No records for this date, need to determine ID range from nearby dates
          const prevDate = subDays(date, 1);
          const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
          
          const prevRecords = await storage.getAttendancePullExtByDateRange(
            startOfDay(prevDate), 
            endOfDay(prevDate)
          );
          const nextRecords = await storage.getAttendancePullExtByDateRange(
            startOfDay(nextDate), 
            endOfDay(nextDate)
          );
          
          // Estimate ID range based on surrounding dates
          let startId = 0;
          let endId = 0;
          
          if (prevRecords.length > 0) {
            const prevMax = Math.max(...prevRecords.map(r => r.biotimeId).filter(id => id != null));
            startId = prevMax + 1;
          }
          
          if (nextRecords.length > 0) {
            const nextMin = Math.min(...nextRecords.map(r => r.biotimeId).filter(id => id != null));
            endId = nextMin - 1;
          }
          
          // If we have a valid range, poll for it
          if (startId > 0 && endId > startId) {
            const records = await biotimeService.getAttendanceByIdRange(startId, endId);
            const filteredRecords = records.filter(record => {
              const recordDate = new Date(record.punch_time);
              return recordDate >= dayStart && recordDate <= dayEnd;
            });
            
            if (filteredRecords.length > 0) {
              await storage.bulkInsertAttendancePullExt(filteredRecords, 'targeted_poll');
              totalRecordsRetrieved += filteredRecords.length;
            }
          }
        } else {
          // Find gaps in existing records
          const biotimeIds = existingRecords.map(r => r.biotimeId).filter(id => id != null).sort((a, b) => a - b);
          const startId = biotimeIds[0];
          const endId = biotimeIds[biotimeIds.length - 1];
          
          // Find missing IDs in the range
          const missingIds = [];
          for (let id = startId; id <= endId; id++) {
            if (!biotimeIds.includes(id)) {
              missingIds.push(id);
            }
          }
          
          if (missingIds.length > 0) {
            // Poll for missing records in chunks
            const chunkSize = 100;
            for (let i = 0; i < missingIds.length; i += chunkSize) {
              const chunk = missingIds.slice(i, i + chunkSize);
              const chunkStart = chunk[0];
              const chunkEnd = chunk[chunk.length - 1];
              
              const records = await biotimeService.getAttendanceByIdRange(chunkStart, chunkEnd);
              const filteredRecords = records.filter(record => {
                const recordDate = new Date(record.punch_time);
                return recordDate >= dayStart && recordDate <= dayEnd;
              });
              
              if (filteredRecords.length > 0) {
                await storage.bulkInsertAttendancePullExt(filteredRecords, 'targeted_poll');
                totalRecordsRetrieved += filteredRecords.length;
              }
            }
          }
        }
        
        datesProcessed++;
      } catch (error) {
        console.error(`Error processing date ${dateStr}:`, error);
        // Continue with other dates
      }
    }
    
    res.json({
      success: true,
      datesProcessed,
      recordsRetrieved: totalRecordsRetrieved,
      message: `Successfully retrieved ${totalRecordsRetrieved} records for ${datesProcessed} dates`,
    });
  } catch (error) {
    console.error('Error in targeted poll:', error);
    res.status(500).json({ error: 'Failed to perform targeted poll' });
  }
});

export default router;