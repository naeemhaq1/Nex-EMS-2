
import express from 'express';
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        name: 'John Doe',
        department: 'IT',
        status: 'Present',
        checkIn: '09:00 AM',
        checkOut: null
      },
      {
        id: 2,
        name: 'Jane Smith',
        department: 'HR',
        status: 'Present', 
        checkIn: '08:45 AM',
        checkOut: null
      }
    ]
  });
});

export default router;
