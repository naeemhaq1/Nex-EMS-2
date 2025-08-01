import express from 'express';
const router = express.Router();

router.get('/dashboard-metrics', (req, res) => {
  res.json({
    success: true,
    totalActiveUsers: 156,
    totalSystemUsers: 156,
    todayAttendance: 142,
    presentToday: 142,
    absentToday: 14,
    lateArrivals: 8,
    attendanceRate: 91.0,
    systemHealth: 'healthy'
  });
});

router.get('/system-metrics', (req, res) => {
  res.json({
    success: true,
    totalEmployees: 156,
    activeEmployees: 142,
    totalPunchIn: 128,
    totalPunchOut: 120,
    totalPresent: 142,
    attendanceRate: 91.0,
    servicesStatus: {
      timestampPolling: true,
      automatedPolling: true,
      autoPunchout: true,
      whatsappService: true
    },
    systemHealth: 'healthy'
  });
});

router.get('/recent-activity', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        message: 'Employee checked in',
        timestamp: new Date().toISOString()
      },
      {
        message: 'System health check completed',
        timestamp: new Date().toISOString()
      }
    ]
  });
});

router.get('/attendance-stats', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  // Generate last 7 days data
  const last7Days = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(Date.now() - (i * 86400000)).toISOString().split('T')[0];
    const dayOfWeek = new Date(Date.now() - (i * 86400000)).toLocaleDateString('en-US', { weekday: 'long' });
    last7Days.push({
      date,
      dayOfWeek,
      present: Math.floor(Math.random() * 50) + 280,
      absent: Math.floor(Math.random() * 20) + 10,
      late: Math.floor(Math.random() * 15) + 5,
      total: 317,
      totalPunchIn: Math.floor(Math.random() * 50) + 280,
      totalPunchOut: Math.floor(Math.random() * 50) + 270,
      attendanceRate: Math.floor(Math.random() * 10) + 85
    });
  }
  
  res.json({
    success: true,
    today: {
      date: today,
      present: 285,
      absent: 22,
      late: 10,
      totalEmployees: 317
    },
    yesterday: {
      date: yesterday,
      present: 292,
      absent: 15,
      late: 10,
      totalEmployees: 317
    },
    last7Days: last7Days,
    departmentStats: [
      { department: 'IT', present: 45, absent: 3, late: 2, total: 50, percentage: 90 },
      { department: 'HR', present: 18, absent: 1, late: 1, total: 20, percentage: 90 },
      { department: 'Finance', present: 25, absent: 2, late: 3, total: 30, percentage: 83 },
      { department: 'Operations', present: 85, absent: 8, late: 7, total: 100, percentage: 85 },
      { department: 'Sales', present: 38, absent: 4, late: 3, total: 45, percentage: 84 }
    ]
  });
});

router.get('/polling/status', (req, res) => {
  res.json({
    success: true,
    data: {
      services: {
        timestampPolling: {
          name: 'Timestamp Polling',
          description: 'Real-time attendance sync',
          status: 'Active',
          health: 'healthy'
        },
        automatedPolling: {
          name: 'Automated Polling',
          description: 'Background data sync',
          status: 'Active',
          health: 'healthy'
        },
        autoPunchout: {
          name: 'Auto Punch-out',
          description: 'Automatic checkout system',
          status: 'Active',
          health: 'healthy'
        }
      },
      queue: {
        pending: 0,
        processing: 0
      }
    }
  });
});

export default router;