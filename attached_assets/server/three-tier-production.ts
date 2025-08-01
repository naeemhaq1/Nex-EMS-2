#!/usr/bin/env tsx

/**
 * NEXLINX EMS Three-Tier Production Architecture
 * 
 * Port Distribution:
 * - Port 5000: Main Web Interface & General APIs
 * - Port 5001: Core Services (Attendance, Monitoring, Backup)
 * - Port 5002: WhatsApp Services (Isolated for minimal interference)
 */

import dotenv from 'dotenv';
dotenv.config();

// Force Pakistan timezone
process.env.TZ = 'Asia/Karachi';

import express from "express";
import { coreServiceManager } from "./services/coreServiceManager";
import { whatsappServiceManager } from "./services/whatsappServiceManager";
import { whatsappDirectRoutes } from "./routes/whatsappDirectRoutes";
import { PortManager } from "./utils/portManager.js";

console.log('🚀 NEXLINX EMS Three-Tier Architecture Starting...');
console.log('📋 Service Distribution:');
console.log('   • Port 5000: Web Interface (current main server)');
console.log('   • Port 5001: Core Services (7 services)');
console.log('   • Port 5002: WhatsApp Services (7 services)');
console.log('');

// ============ CORE SERVICES SERVER (PORT 5001) ============
const coreApp = express();
coreApp.use(express.json());
coreApp.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

coreApp.get('/api/core/health', (req, res) => {
  const services = coreServiceManager.getServiceSummary();
  res.json({
    status: 'running',
    port: 5001,
    services: services,
    timestamp: new Date().toISOString()
  });
});

coreApp.get('/api/core/services', (req, res) => {
  try {
    const services = coreServiceManager.getAllServices();
    const servicesArray = Array.from(services.entries()).map(([name, service]) => {
      const status = coreServiceManager.getServiceStatusByName(name);
      return {
        name,
        status: status?.health || 'unknown',
        uptime: status?.uptime || 0,
        type: 'core',
        port: 5001
      };
    });
    res.json(servicesArray);
  } catch (error) {
    console.error('[CORE:5001] Error fetching services:', error);
    res.status(500).json({ error: 'Failed to fetch core services' });
  }
});

// ============ WHATSAPP SERVICES SERVER (PORT 5002) ============
const whatsappApp = express();
whatsappApp.use(express.json());
whatsappApp.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

whatsappApp.get('/api/whatsapp/health', (req, res) => {
  const services = whatsappServiceManager.getServiceSummary();
  res.json({
    status: 'running',
    port: 5002,
    services: services,
    timestamp: new Date().toISOString()
  });
});

whatsappApp.get('/api/whatsapp/services', (req, res) => {
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

// Register WhatsApp API routes
whatsappApp.use('/api/whatsapp-direct', whatsappDirectRoutes);

// ============ START ALL SERVERS ============
async function startThreeTierSystem() {
  try {
    console.log('[SYSTEM] Starting three-tier architecture...');

    // Clean ports first
    console.log('[SYSTEM] Cleaning ports for fresh start...');
    await Promise.all([
      PortManager.cleanPort(5001),
      PortManager.cleanPort(5002)
    ]);

    // Wait for ports to be free
    const [port5001Free, port5002Free] = await Promise.all([
      PortManager.waitForPortFree(5001),
      PortManager.waitForPortFree(5002)
    ]);

    if (!port5001Free) console.log('[CORE:5001] ⚠️ Port still in use, proceeding...');
    if (!port5002Free) console.log('[WHATSAPP:5002] ⚠️ Port still in use, proceeding...');

    // Start Core Services (Port 5001)
    console.log('[CORE:5001] Starting core services...');
    await coreServiceManager.start();
    
    coreApp.listen(5001, '0.0.0.0', () => {
      console.log('[CORE:5001] ✅ Core Services Server running on port 5001');
      console.log('[CORE:5001] 🎯 Health check: http://localhost:5001/api/core/health');
      console.log('[CORE:5001] 📊 Status page: http://localhost:5001/status');
    });

    // Start WhatsApp Services (Port 5002)
    console.log('[WHATSAPP:5002] Starting WhatsApp services...');
    await whatsappServiceManager.start();
    
    whatsappApp.listen(5002, '0.0.0.0', () => {
      console.log('[WHATSAPP:5002] ✅ WhatsApp Services Server running on port 5002');
      console.log('[WHATSAPP:5002] 📱 Health check: http://localhost:5002/api/whatsapp/health');
      console.log('[WHATSAPP:5002] 📊 Status page: http://localhost:5002/status');
    });

    // Success summary
    setTimeout(() => {
      console.log('');
      console.log('✅ THREE-TIER ARCHITECTURE STARTED SUCCESSFULLY!');
      console.log('');
      console.log('🌐 Access URLs:');
      console.log('   • Main Application: http://localhost:5000 (start with npm run dev)');
      console.log('   • Core Services: http://localhost:5001/api/core/health');
      console.log('   • WhatsApp Services: http://localhost:5002/api/whatsapp/health');
      console.log('');
      console.log('📊 Service Distribution:');
      console.log('   • 7 Core Services running on port 5001');
      console.log('   • 7 WhatsApp Services running on port 5002');
      console.log('   • Main web interface available on port 5000');
      console.log('');
      console.log('🔗 Service Isolation Achieved:');
      console.log('   • Core services isolated from WhatsApp services');
      console.log('   • Each service group can scale independently');
      console.log('   • Minimal interference between service layers');
      console.log('');
    }, 2000);

  } catch (error) {
    console.error('❌ Failed to start three-tier system:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down three-tier system...');
  
  try {
    await coreServiceManager.stop();
    await whatsappServiceManager.stop();
    console.log('✅ All services stopped gracefully');
  } catch (error) {
    console.error('Error during shutdown:', error);
  }
  
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down...');
  try {
    await coreServiceManager.stop();
    await whatsappServiceManager.stop();
  } catch (error) {
    console.error('Error during shutdown:', error);
  }
  process.exit(0);
});

// Start the system
startThreeTierSystem();