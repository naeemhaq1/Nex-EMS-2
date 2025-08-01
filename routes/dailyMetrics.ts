import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { 
  calculateDailyMetrics, 
  storeDailyMetrics, 
  getDailyMetrics, 
  getLatestDailyMetrics,
  calculateMetricsForDateRange,
  recalculateMetricsForDate,
  getMetricsSummary
} from '../services/dailyAttendanceMetrics';

const router = Router();

// Get daily metrics for a date range
router.get('/daily-metrics', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }
    
    const metrics = await getDailyMetrics(startDate as string, endDate as string);
    res.json(metrics);
  } catch (error) {
    console.error('Error getting daily metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get latest daily metrics
router.get('/latest-metrics', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 30;
    const metrics = await getLatestDailyMetrics(limit);
    res.json(metrics);
  } catch (error) {
    console.error('Error getting latest metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Calculate metrics for a specific date
router.post('/calculate-metrics', async (req, res) => {
  try {
    const { date } = req.body;
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }
    
    const metrics = await calculateDailyMetrics(new Date(date));
    await storeDailyMetrics(metrics);
    
    res.json({ message: 'Metrics calculated successfully', metrics });
  } catch (error) {
    console.error('Error calculating metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Calculate metrics for a date range
router.post('/calculate-range', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }
    
    await calculateMetricsForDateRange(new Date(startDate), new Date(endDate));
    
    res.json({ message: 'Range metrics calculated successfully' });
  } catch (error) {
    console.error('Error calculating range metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Recalculate metrics for a specific date
router.post('/recalculate-metrics', async (req, res) => {
  try {
    const { date } = req.body;
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }
    
    await recalculateMetricsForDate(date);
    
    res.json({ message: 'Metrics recalculated successfully' });
  } catch (error) {
    console.error('Error recalculating metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get metrics summary
router.get('/metrics-summary', async (req, res) => {
  try {
    const summary = await getMetricsSummary();
    res.json(summary);
  } catch (error) {
    console.error('Error getting metrics summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get yesterday's metrics
router.get('/yesterday', async (req, res) => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const metrics = await getDailyMetrics(yesterdayStr, yesterdayStr);
    
    if (!metrics || metrics.length === 0) {
      return res.status(404).json({ error: "No metrics found for yesterday" });
    }
    
    res.json(metrics[0]);
  } catch (error) {
    console.error('Error fetching yesterday metrics:', error);
    res.status(500).json({ error: "Failed to fetch yesterday metrics" });
  }
});

// Get today's metrics
router.get('/today', async (req, res) => {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const metrics = await getDailyMetrics(todayStr, todayStr);
    
    if (!metrics || metrics.length === 0) {
      // If no metrics found for today, calculate them
      const todayMetrics = await calculateDailyMetrics(today);
      await storeDailyMetrics(todayMetrics);
      return res.json(todayMetrics);
    }
    
    res.json(metrics[0]);
  } catch (error) {
    console.error('Error fetching today metrics:', error);
    res.status(500).json({ error: "Failed to fetch today metrics" });
  }
});

// Get monthly trend (last 30 days)
router.get('/monthly-trend', async (req, res) => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    const metrics = await getDailyMetrics(startDateStr, endDateStr);
    
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching monthly trend:', error);
    res.status(500).json({ error: "Failed to fetch monthly trend" });
  }
});

export default router;