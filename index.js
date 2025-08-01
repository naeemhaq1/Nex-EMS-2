import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, testConnection } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Test database connection on startup
async function initializeServer() {
  console.log('🚀 Starting NEXLINX EMS Server...');

  // Test database connection
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.log('⚠️  Server starting without database connection');
  }

  // Health check endpoint
  app.get('/health', async (req, res) => {
    try {
      const dbStatus = await testConnection();
      res.json({
        status: 'ok',
        database: dbStatus ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        database: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Basic route
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  // Start server
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
    console.log(`🔗 Health check: http://0.0.0.0:${PORT}/health`);
  });
}

initializeServer();