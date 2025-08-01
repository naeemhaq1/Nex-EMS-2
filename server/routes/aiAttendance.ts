import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { aiAttendancePredictionService } from '../services/AIAttendancePredictionService';

const router = Router();

// Get attendance prediction for specific employee and date
router.get('/prediction/:employeeCode/:date', requireAuth, async (req, res) => {
  try {
    const { employeeCode, date } = req.params;
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const prediction = await aiAttendancePredictionService.generatePrediction(employeeCode, date);
    res.json(prediction);
  } catch (error) {
    console.error('Prediction generation failed:', error);
    res.status(500).json({ error: 'Failed to generate prediction' });
  }
});

// Get attendance patterns for employee
router.get('/patterns/:employeeCode', requireAuth, async (req, res) => {
  try {
    const { employeeCode } = req.params;
    const daysBack = parseInt(req.query.days as string) || 30;
    
    const patterns = await aiAttendancePredictionService.analyzeEmployeePatterns(employeeCode, daysBack);
    res.json(patterns);
  } catch (error) {
    console.error('Pattern analysis failed:', error);
    res.status(500).json({ error: 'Failed to analyze patterns' });
  }
});

// Get AI insights for employee
router.get('/insights/:employeeCode', requireAuth, async (req, res) => {
  try {
    const { employeeCode } = req.params;
    const insights = await aiAttendancePredictionService.generateInsights(employeeCode);
    res.json(insights);
  } catch (error) {
    console.error('Insight generation failed:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

// Generate bulk predictions for all employees
router.post('/bulk-predictions', requireAuth, async (req, res) => {
  try {
    const { targetDate } = req.body;
    
    if (!targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      return res.status(400).json({ error: 'Invalid target date format. Use YYYY-MM-DD' });
    }

    const predictions = await aiAttendancePredictionService.generateBulkPredictions(targetDate);
    res.json({ predictions, total: predictions.length });
  } catch (error) {
    console.error('Bulk prediction failed:', error);
    res.status(500).json({ error: 'Failed to generate bulk predictions' });
  }
});

// Get personal AI dashboard for current user
router.get('/my-dashboard', requireAuth, async (req, res) => {
  try {
    const session = req.session as any;
    const employeeCode = session.userId; // Using userId as employeeCode for now
    
    // Get tomorrow's prediction
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    // Generate prediction and insights in parallel
    const [prediction, patterns, insights] = await Promise.all([
      aiAttendancePredictionService.generatePrediction(employeeCode, tomorrowStr).catch(() => null),
      aiAttendancePredictionService.analyzeEmployeePatterns(employeeCode, 30).catch(() => null),
      aiAttendancePredictionService.generateInsights(employeeCode).catch(() => [])
    ]);

    res.json({
      employeeCode,
      prediction,
      patterns,
      insights,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Personal dashboard failed:', error);
    res.status(500).json({ error: 'Failed to load AI dashboard' });
  }
});

// Check AI service status
router.get('/status', requireAuth, async (req, res) => {
  try {
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const status = {
      aiServiceActive: hasOpenAI,
      openaiConfigured: hasOpenAI,
      predictionServiceReady: true,
      lastUpdate: new Date().toISOString()
    };
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to check AI status' });
  }
});

export default router;