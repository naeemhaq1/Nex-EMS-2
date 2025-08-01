
import { Router } from 'express';

const router = Router();

// Basic auth routes that index.js expects
router.post('/login', (req, res) => {
  res.json({ success: false, error: 'Auth route not implemented' });
});

router.post('/logout', (req, res) => {
  res.json({ success: true });
});

router.get('/user', (req, res) => {
  res.status(401).json({ success: false, error: 'Not authenticated' });
});

export default router;
