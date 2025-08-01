
import express from 'express';
const router = express.Router();

router.get('/check', (req, res) => {
  res.json({
    success: true,
    data: {
      qualityScore: 95.2,
      issues: [],
      lastCheck: new Date().toISOString()
    }
  });
});

export default router;
