import { Router } from "express";
import { comprehensiveDataGapFiller } from "../services/comprehensiveDataGapFiller";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Analyze current data gaps
router.get('/gaps/analyze', requireAuth, async (req, res) => {
  try {
    const analysis = await comprehensiveDataGapFiller.analyzeDataGaps();
    res.json(analysis);
  } catch (error) {
    console.error('Error analyzing data gaps:', error);
    res.status(500).json({ error: 'Failed to analyze data gaps' });
  }
});

// Start comprehensive gap filling
router.post('/gaps/fill', requireAuth, async (req, res) => {
  try {
    // Start gap filling in background
    comprehensiveDataGapFiller.startComprehensiveGapFilling();
    
    res.json({ 
      message: 'Gap filling started', 
      status: comprehensiveDataGapFiller.getStatus() 
    });
  } catch (error) {
    console.error('Error starting gap filling:', error);
    res.status(500).json({ error: 'Failed to start gap filling' });
  }
});

// Get gap filling status
router.get('/gaps/status', requireAuth, async (req, res) => {
  try {
    const status = comprehensiveDataGapFiller.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting gap filling status:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// Stop gap filling
router.post('/gaps/stop', requireAuth, async (req, res) => {
  try {
    await comprehensiveDataGapFiller.stop();
    res.json({ message: 'Gap filling stopped' });
  } catch (error) {
    console.error('Error stopping gap filling:', error);
    res.status(500).json({ error: 'Failed to stop gap filling' });
  }
});

export default router;