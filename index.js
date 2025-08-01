
// NEXLINX EMS - Main Server Entry Point
// Production-ready Node.js server with proper port configuration

const path = require('path');
const express = require('express');

// Load environment variables from port config
require('dotenv').config({ path: '.env.port-config' });

console.log('[NEXLINX] Starting NEXLINX EMS Server...');
console.log('[NEXLINX] Port Mode:', process.env.PORT_MODE || 'single-port');
console.log('[NEXLINX] Main Port:', process.env.PORT || '5000');

const app = express();
const PORT = parseInt(process.env.PORT || '5000');
const HOST = process.env.HOST || '0.0.0.0';

// Enable trust proxy for production
app.set('trust proxy', true);

// Serve static files from client build
app.use(express.static(path.join(__dirname, 'client', 'dist')));

// API routes placeholder
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    mode: process.env.PORT_MODE || 'single-port',
    port: PORT
  });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error('[NEXLINX] Server Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const server = app.listen(PORT, HOST, () => {
  console.log(`[NEXLINX] Server running on http://${HOST}:${PORT}`);
  console.log(`[NEXLINX] Mode: ${process.env.PORT_MODE || 'single-port'}`);
  console.log(`[NEXLINX] Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[NEXLINX] Received SIGTERM, shutting down gracefully');
  server.close(() => {
    console.log('[NEXLINX] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[NEXLINX] Received SIGINT, shutting down gracefully');
  server.close(() => {
    console.log('[NEXLINX] Server closed');
    process.exit(0);
  });
});
