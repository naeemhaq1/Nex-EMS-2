
import { Router } from 'express';

const router = Router();

// Basic session management routes
router.get('/sessions', (req, res) => {
  res.json({ sessions: [] });
});

export default router;
