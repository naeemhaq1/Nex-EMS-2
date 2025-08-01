import { Router } from 'express';
import { duplicatePreventionService } from '../services/duplicatePreventionService';

const router = Router();

// Get duplicate statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await duplicatePreventionService.getDuplicateStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting duplicate stats:', error);
    res.status(500).json({ error: 'Failed to get duplicate statistics' });
  }
});

// Trigger duplicate prevention cleanup
router.post('/cleanup', async (req, res) => {
  try {
    const result = await duplicatePreventionService.preventDuplicates();
    res.json(result);
  } catch (error) {
    console.error('Error running duplicate prevention:', error);
    res.status(500).json({ error: 'Failed to run duplicate prevention' });
  }
});

export default router;