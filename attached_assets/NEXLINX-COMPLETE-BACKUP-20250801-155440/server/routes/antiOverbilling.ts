import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { missingPunchOutProcessor } from '../services/missingPunchOutProcessor';
import { subDays, startOfDay, endOfDay } from 'date-fns';

const router = Router();

/**
 * Process missing punch-outs for a specific date range
 */
router.post('/process', requireAuth, async (req, res) => {
  try {
    const { fromDate, toDate } = req.body;
    
    if (!fromDate || !toDate) {
      return res.status(400).json({ 
        error: 'fromDate and toDate are required' 
      });
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);
    
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return res.status(400).json({ 
        error: 'Invalid date format' 
      });
    }

    const result = await missingPunchOutProcessor.processMissingPunchOuts({
      from: startOfDay(from),
      to: endOfDay(to)
    });

    res.json({
      success: true,
      message: `Processed ${result.processedRecords} records with ${result.adjustmentsMade} anti-overbilling adjustments`,
      data: result
    });

  } catch (error) {
    console.error('[AntiOverbilling] Error processing missing punch-outs:', error);
    res.status(500).json({ 
      error: 'Failed to process missing punch-outs',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Get daily missing punch-out report
 */
router.get('/daily-report', requireAuth, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();
    
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ 
        error: 'Invalid date format' 
      });
    }

    const report = await missingPunchOutProcessor.generateDailyReport(targetDate);

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('[AntiOverbilling] Error generating daily report:', error);
    res.status(500).json({ 
      error: 'Failed to generate daily report',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Get statistics on potential overbilling prevention
 */
router.get('/statistics', requireAuth, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const daysCount = parseInt(days as string);
    
    if (isNaN(daysCount) || daysCount < 1 || daysCount > 30) {
      return res.status(400).json({ 
        error: 'Days must be between 1 and 30' 
      });
    }

    const from = startOfDay(subDays(new Date(), daysCount));
    const to = endOfDay(new Date());

    const result = await missingPunchOutProcessor.processMissingPunchOuts({
      from,
      to
    });

    // Calculate statistics
    const averageAdjustmentsPerDay = result.adjustmentsMade / daysCount;
    const averageOverbillingPreventedPerDay = result.potentialOverbilling / daysCount;

    res.json({
      success: true,
      data: {
        period: {
          from: from.toISOString().split('T')[0],
          to: to.toISOString().split('T')[0],
          days: daysCount
        },
        summary: {
          totalRecordsProcessed: result.processedRecords,
          totalAdjustmentsMade: result.adjustmentsMade,
          totalOverbillingPrevented: result.potentialOverbilling,
          averageAdjustmentsPerDay: Math.round(averageAdjustmentsPerDay * 100) / 100,
          averageOverbillingPreventedPerDay: Math.round(averageOverbillingPreventedPerDay * 100) / 100
        },
        details: result.results.map(r => ({
          employeeCode: r.employeeCode,
          date: r.date.toISOString().split('T')[0],
          checkInTime: r.checkInTime.toISOString(),
          cappedHours: r.cappedHours,
          hoursSaved: r.originalHours - r.cappedHours,
          reason: r.adjustmentReason
        }))
      }
    });

  } catch (error) {
    console.error('[AntiOverbilling] Error getting statistics:', error);
    res.status(500).json({ 
      error: 'Failed to get statistics',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Process yesterday's missing punch-outs (automated daily task)
 */
router.post('/process-yesterday', requireAuth, async (req, res) => {
  try {
    const yesterday = subDays(new Date(), 1);
    
    const result = await missingPunchOutProcessor.processMissingPunchOuts({
      from: startOfDay(yesterday),
      to: endOfDay(yesterday)
    });

    res.json({
      success: true,
      message: `Processed yesterday's data: ${result.adjustmentsMade} anti-overbilling adjustments made`,
      data: {
        date: yesterday.toISOString().split('T')[0],
        ...result
      }
    });

  } catch (error) {
    console.error('[AntiOverbilling] Error processing yesterday:', error);
    res.status(500).json({ 
      error: 'Failed to process yesterday\'s data',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export { router as antiOverbillingRoutes };