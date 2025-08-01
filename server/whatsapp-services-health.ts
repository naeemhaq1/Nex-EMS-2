import express from 'express';

const app = express();

// Health check endpoint for WhatsApp services (port 5002)
app.get('/health', async (req, res) => {
  try {
    res.status(200).json({
      status: 'healthy',
      service: 'WhatsApp Services',
      port: 5002,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: [
        'whatsappService',
        'whatsappMonitor',
        'whatsappAPIMonitor',
        'whatsappChatbot',
        'whatsappDirectory',
        'whatsappDeliveryTracker',
        'whatsappAnnouncement'
      ]
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'WhatsApp Services',
      port: 5002,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

const PORT = 5002;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`📱 WhatsApp Services Health Check running on port ${PORT}`);
});