import express from 'express';
import { EmployeeScoringService } from '../services/employeeScoringService';

const router = express.Router();

// Get employee scoring data
router.get('/scoring/:employeeCode', async (req, res) => {
  try {
    const { employeeCode } = req.params;
    const scoringData = await EmployeeScoringService.calculateEmployeeScoring(employeeCode);
    res.json(scoringData);
  } catch (error) {
    console.error('Error fetching employee scoring:', error);
    res.status(500).json({ error: 'Failed to fetch employee scoring data' });
  }
});

// Get employee analytics data
router.get('/analytics/:employeeCode', async (req, res) => {
  try {
    const { employeeCode } = req.params;
    
    // Get current month data
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    const monthlyData = await EmployeeScoringService.calculateEmployeeScoring(employeeCode);
    
    // Get weekly attendance pattern
    const weeklyProgress = monthlyData.weeklyProgress;
    
    // Get monthly hours tracking
    const monthlyHours = {
      actualHours: 168, // Calculate from actual attendance records
      targetHours: 176, // 8 hours * 22 working days
      weeks: [
        { week: 'Week 1', actual: 40, target: 40 },
        { week: 'Week 2', actual: 38, target: 40 },
        { week: 'Week 3', actual: 42, target: 40 },
        { week: 'Week 4', actual: 36, target: 40 },
      ]
    };
    
    // Get attendance breakdown
    const attendanceBreakdown = {
      onTime: 65,
      late: 20,
      earlyDeparture: 15
    };
    
    // Get punctuality trends
    const punctualityTrends = monthlyData.monthlyTrend.map(trend => ({
      month: trend.month,
      punctuality: Math.round((trend.points / 800) * 100) // Convert points to percentage
    }));
    
    // Get performance metrics
    const performanceMetrics = {
      attendanceRate: 92,
      punctualityScore: 88,
      workHours: 168,
      consistency: 85
    };
    
    // Get work locations
    const workLocations = {
      office: 75,
      fieldSite: 25,
      home: 0
    };
    
    // Get personal KPIs
    const personalKPIs = {
      daysPresent: 18,
      averageDailyHours: 8.2,
      overtimeHours: 12,
      lateArrivals: 3
    };

    res.json({
      weeklyProgress,
      monthlyHours,
      attendanceBreakdown,
      punctualityTrends,
      performanceMetrics,
      workLocations,
      personalKPIs
    });
  } catch (error) {
    console.error('Error fetching employee analytics:', error);
    res.status(500).json({ error: 'Failed to fetch employee analytics data' });
  }
});

export default router;