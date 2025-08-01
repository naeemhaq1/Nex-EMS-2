import express from 'express';

const app = express();

// Health check endpoint for core services (port 5001)
app.get('/health', async (req, res) => {
  try {
    res.status(200).json({
      status: 'healthy',
      service: 'Core Services',
      port: 5001,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: [
        'attendanceProcessor',
        'threePollerSystem', 
        'watchdog',
        'processMonitor',
        'autoBackupService',
        'systemAlerts',
        'notificationService'
      ]
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'Core Services',
      port: 5001,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

const PORT = 5001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🔧 Core Services Health Check running on port ${PORT}`);
});