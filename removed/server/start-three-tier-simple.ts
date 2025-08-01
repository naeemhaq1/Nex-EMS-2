#!/usr/bin/env tsx

/**
 * Simple Three-Tier Service Launcher
 * Directly starts core services on port 5001 and WhatsApp services on port 5002
 */

import express from 'express';
import { serviceManager } from './services/serviceManager';

console.log('🚀 Starting NEXLINX EMS Three-Tier Services...');

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
  const services = serviceManager.getServices();
  const coreServices = Array.from(services.entries()).filter(([name, service]) => 
    ['threePollerSystem', 'attendanceProcessor', 'watchdog', 'processMonitor', 'systemAlerts', 'notificationService', 'autoBackupService'].includes(name)
  );
  
  res.json({
    status: 'running',
    port: 5001,
    services: coreServices.map(([name, service]) => ({
      name,
      status: serviceManager.getServiceStatus(name)?.health || 'unknown'
    })),
    timestamp: new Date().toISOString()
  });
});

coreApp.get('/api/core/services', (req, res) => {
  const services = serviceManager.getServices();
  const coreServices = Array.from(services.entries()).filter(([name, service]) => 
    ['threePollerSystem', 'attendanceProcessor', 'watchdog', 'processMonitor', 'systemAlerts', 'notificationService', 'autoBackupService'].includes(name)
  );
  
  const servicesArray = coreServices.map(([name, service]) => {
    const status = serviceManager.getServiceStatus(name);
    return {
      name,
      status: status?.health || 'unknown',
      uptime: status?.uptime || 0,
      type: 'core',
      port: 5001
    };
  });
  
  res.json(servicesArray);
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
  const services = serviceManager.getServices();
  const whatsappServices = Array.from(services.entries()).filter(([name, service]) => 
    ['whatsappService', 'whatsappMonitor', 'whatsappAPIMonitor', 'whatsappChatbot', 'whatsappDirectory', 'whatsappDeliveryTracker', 'whatsappAnnouncement'].includes(name)
  );
  
  res.json({
    status: 'running',
    port: 5002,
    services: whatsappServices.map(([name, service]) => ({
      name,
      status: serviceManager.getServiceStatus(name)?.health || 'unknown'
    })),
    timestamp: new Date().toISOString()
  });
});

whatsappApp.get('/api/whatsapp/services', (req, res) => {
  const services = serviceManager.getServices();
  const whatsappServices = Array.from(services.entries()).filter(([name, service]) => 
    ['whatsappService', 'whatsappMonitor', 'whatsappAPIMonitor', 'whatsappChatbot', 'whatsappDirectory', 'whatsappDeliveryTracker', 'whatsappAnnouncement'].includes(name)
  );
  
  const servicesArray = whatsappServices.map(([name, service]) => {
    const status = serviceManager.getServiceStatus(name);
    return {
      name,
      status: status?.health || 'unknown',
      uptime: status?.uptime || 0,
      type: 'whatsapp',
      port: 5002
    };
  });
  
  res.json(servicesArray);
});

async function startServices() {
  try {
    // Start Core Services on Port 5001
    console.log('📋 Starting Core Services on port 5001...');
    coreApp.listen(5001, '0.0.0.0', () => {
      console.log('✅ Core Services API running on http://localhost:5001');
      console.log('   • Attendance Processing, Monitoring, Backup Services');
      console.log('   • Health Check: http://localhost:5001/api/core/health');
    });

    // Start WhatsApp Services on Port 5002
    console.log('📱 Starting WhatsApp Services on port 5002...');
    whatsappApp.listen(5002, '0.0.0.0', () => {
      console.log('✅ WhatsApp Services API running on http://localhost:5002');
      console.log('   • WhatsApp Messaging, Directory, Delivery Tracking');
      console.log('   • Health Check: http://localhost:5002/api/whatsapp/health');
    });

    setTimeout(() => {
      console.log('');
      console.log('🎉 THREE-TIER ARCHITECTURE ACTIVE!');
      console.log('📊 Service Distribution:');
      console.log('   • Port 5000: Main Web Interface');
      console.log('   • Port 5001: Core Services (7 services)');
      console.log('   • Port 5002: WhatsApp Services (7 services)');
      console.log('');
      console.log('🔗 Access URLs:');
      console.log('   • Main App: http://localhost:5000');
      console.log('   • Core API: http://localhost:5001/api/core/health');
      console.log('   • WhatsApp API: http://localhost:5002/api/whatsapp/health');
      console.log('');
    }, 1000);

  } catch (error) {
    console.error('❌ Failed to start three-tier services:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down three-tier services...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down...');
  process.exit(0);
});

// Start the services
startServices();