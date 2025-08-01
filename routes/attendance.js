
import express from 'express';
const router = express.Router();

router.get('/today', (req, res) => {
  res.json({
    success: true,
    data: {
      date: new Date().toISOString().split('T')[0],
      totalEmployees: 156,
      present: 142,
      absent: 14,
      records: []
    }
  });
});

export default router;
