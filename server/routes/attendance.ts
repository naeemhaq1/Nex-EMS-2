import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { calculateAttendanceMetrics, getTodayAttendanceMetrics, getYesterdayAttendanceMetrics, getAttendanceDetails } from '../utils/attendanceCalculations';
import { z } from 'zod';

const router = Router();

// Get attendance metrics for a specific date
router.get('/metrics/:date', requireAuth, async (req, res) => {
  try {
    const date = new Date(req.params.date);
    if (isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    
    const metrics = await calculateAttendanceMetrics(date);
    res.json(metrics);
  } catch (error) {
    console.error('Error calculating attendance metrics:', error);
    res.status(500).json({ error: 'Failed to calculate attendance metrics' });
  }
});

// Get today's attendance metrics
router.get('/metrics/today', requireAuth, async (req, res) => {
  try {
    const metrics = await getTodayAttendanceMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Error getting today\'s attendance metrics:', error);
    res.status(500).json({ error: 'Failed to get today\'s attendance metrics' });
  }
});

// Get yesterday's attendance metrics  
router.get('/metrics/yesterday', requireAuth, async (req, res) => {
  try {
    const metrics = await getYesterdayAttendanceMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Error getting yesterday\'s attendance metrics:', error);
    res.status(500).json({ error: 'Failed to get yesterday\'s attendance metrics' });
  }
});

// Get detailed attendance breakdown for a specific date
router.get('/details/:date', requireAuth, async (req, res) => {
  try {
    const date = new Date(req.params.date);
    if (isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    
    const details = await getAttendanceDetails(date);
    res.json(details);
  } catch (error) {
    console.error('Error getting attendance details:', error);
    res.status(500).json({ error: 'Failed to get attendance details' });
  }
});

export default router;