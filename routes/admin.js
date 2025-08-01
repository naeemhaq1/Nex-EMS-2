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