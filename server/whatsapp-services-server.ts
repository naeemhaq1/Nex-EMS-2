import dotenv from 'dotenv';
dotenv.config();

// Force Pakistan timezone
process.env.TZ = 'Asia/Karachi';

import express from "express";
import { whatsappServiceManager } from "./services/whatsappServiceManager.js";
import { PortManager } from "./utils/portManager.js";

const app = express();

// Configure Express
app.set('trust proxy', true);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

// Basic request logging
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    console.log(`[WHATSAPP:5002] ${req.method} ${req.path}`);
  }
  next();
});

// Health check endpoint
app.get('/api/whatsapp/health', (req, res) => {
  const services = whatsappServiceManager.getServiceSummary();
  res.json({
    status: 'running',
    port: 5002,
    services: services,
    timestamp: new Date().toISOString()
  });
});

// WhatsApp services status endpoint
app.get('/api/whatsapp/services', (req, res) => {
  try {
    const services = whatsappServiceManager.getAllServices();
    const servicesArray = Array.from(services.entries()).map(([name, service]) => {
      const status = whatsappServiceManager.getServiceStatusByName(name);
      return {
        name,
        status: status?.health || 'unknown',
        uptime: status?.uptime || 0,
        type: 'whatsapp',
        port: 5002
      };
    });
    res.json(servicesArray);
  } catch (error) {
    console.error('[WHATSAPP:5002] Error fetching services:', error);
    res.status(500).json({ error: 'Failed to fetch WhatsApp services' });
  }
});

// Service control endpoints
app.post('/api/whatsapp/services/:serviceName/restart', async (req, res) => {
  try {
    const { serviceName } = req.params;
    console.log(`[WHATSAPP:5002] Restarting service: ${serviceName}`);
    
    const service = whatsappServiceManager.getAllServices().get(serviceName);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Stop and start the service
    if (typeof service.stop === 'function') {
      await service.stop();
    }
    if (typeof service.start === 'function') {
      await service.start();
    }

    res.json({ success: true, message: `Service ${serviceName} restarted` });
  } catch (error) {
    console.error(`[WHATSAPP:5002] Error restarting service:`, error);
    res.status(500).json({ error: 'Failed to restart service' });
  }
});

// WhatsApp services status page
app.get('/status', (req, res) => {
  const services = whatsappServiceManager.getAllServices();
  const summary = whatsappServiceManager.getServiceSummary();
  
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>WhatsApp Services Status - Port 5002</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
      .container { max-width: 1200px; margin: 0 auto; }
      .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
      .summary-card { background: white; padding: 15px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      .summary-card h3 { margin: 0 0 10px 0; color: #333; }
      .summary-card .number { font-size: 2em; font-weight: bold; margin: 10px 0; }
      .healthy { color: #22c55e; }
      .unhealthy { color: #ef4444; }
      .services-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; }
      .service-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      .service-name { font-size: 1.2em; font-weight: bold; margin-bottom: 10px; }
      .service-status { padding: 4px 8px; border-radius: 4px; font-size: 0.9em; font-weight: bold; }
      .status-healthy { background: #dcfce7; color: #166534; }
      .status-unhealthy { background: #fecaca; color: #991b1b; }
      .status-stopped { background: #f3f4f6; color: #374151; }
      .refresh-btn { background: #25d366; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
      .refresh-btn:hover { background: #128c7e; }
      .whatsapp-icon { color: #25d366; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1><span class="whatsapp-icon">📱</span> WhatsApp Services Status</h1>
        <p>Port 5002 - WhatsApp messaging and communication services</p>
        <button class="refresh-btn" onclick="location.reload()">🔄 Refresh Status</button>
      </div>
      
      <div class="summary">
        <div class="summary-card">
          <h3>Total Services</h3>
          <div class="number">${summary.total}</div>
        </div>
        <div class="summary-card">
          <h3>Healthy</h3>
          <div class="number healthy">${summary.healthy}</div>
        </div>
        <div class="summary-card">
          <h3>Unhealthy</h3>
          <div class="number unhealthy">${summary.unhealthy}</div>
        </div>
        <div class="summary-card">
          <h3>Health Rate</h3>
          <div class="number">${Math.round((summary.healthy / summary.total) * 100)}%</div>
        </div>
      </div>
      
      <div class="services-grid">
        ${Array.from(services.keys()).map(serviceName => {
          const status = whatsappServiceManager.getServiceStatusByName(serviceName);
          const health = status?.health || 'unknown';
          return `
            <div class="service-card">
              <div class="service-name">${serviceName}</div>
              <div class="service-status status-${health}">${health.toUpperCase()}</div>
              <div style="margin-top: 10px; font-size: 0.9em; color: #666;">
                <div>Uptime: ${Math.round((status?.uptime || 0) / 1000)}s</div>
                <div>Restarts: ${status?.restartCount || 0}</div>
                <div>Type: WhatsApp Service</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      
      <div style="margin-top: 20px; text-align: center; color: #666; font-size: 0.9em;">
        Last updated: ${new Date().toLocaleString()} | Port 5002
      </div>
    </div>
    
    <script>
      // Auto-refresh every 30 seconds
      setTimeout(() => location.reload(), 30000);
    </script>
  </body>
  </html>
  `;
  
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// Import and register WhatsApp API routes
import { whatsappDirectRoutes } from "./routes/whatsappDirectRoutes.js";
app.use('/api/whatsapp-direct', whatsappDirectRoutes);

const PORT = 5002;

async function startWhatsAppServer() {
  try {
    console.log('[WHATSAPP:5002] 🚀 Starting WhatsApp Services Server...');
    
    // Clean port before starting
    await PortManager.cleanPort(PORT);
    
    // Wait for port to be free
    const portFree = await PortManager.waitForPortFree(PORT);
    if (!portFree) {
      console.log(`[WHATSAPP:5002] ⚠️ Port ${PORT} still in use, proceeding anyway...`);
    }
    
    // Start WhatsApp service manager
    await whatsappServiceManager.start();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[WHATSAPP:5002] ✅ WhatsApp Services Server running on port ${PORT}`);
      console.log(`[WHATSAPP:5002] 📱 WhatsApp services endpoint: http://localhost:${PORT}/api/whatsapp/services`);
      console.log(`[WHATSAPP:5002] 📊 Status page: http://localhost:${PORT}/status`);
    });
  } catch (error) {
    console.error('[WHATSAPP:5002] ❌ Failed to start WhatsApp services server:', error);
    process.exit(1);
  }
}

startWhatsAppServer();