
import express from 'express';
const router = express.Router();

router.get('/summary', (req, res) => {
  res.json({
    success: true,
    data: {
      period: 'This Month',
      attendanceRate: 96.2,
      averageHours: 8.2,
      totalHours: 18240
    }
  });
});

export default router;
