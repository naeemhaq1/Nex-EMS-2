
import express from 'express';
const router = express.Router();

router.get('/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalEmployees: 156,
      presentToday: 142,
      absentToday: 14,
      lateArrivals: 8,
      earlyDepartures: 3
    }
  });
});

export default router;
