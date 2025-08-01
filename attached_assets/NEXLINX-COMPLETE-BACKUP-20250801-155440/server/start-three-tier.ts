#!/usr/bin/env tsx

import { spawn } from 'child_process';
import path from 'path';

console.log('🚀 Starting NEXLINX EMS Three-Tier Architecture...');
console.log('📋 Port Configuration:');
console.log('   • Port 5000: Main Web Interface & General APIs');
console.log('   • Port 5001: Core Services (Attendance, Monitoring, etc.)');
console.log('   • Port 5002: WhatsApp Services (Isolated)');
console.log('');

const processes: any[] = [];

function startServer(name: string, script: string, port: number) {
  console.log(`[${name}] Starting on port ${port}...`);
  
  const child = spawn('tsx', [script], {
    stdio: 'pipe',
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: 'production' }
  });

  child.stdout?.on('data', (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    lines.forEach(line => console.log(`[${name}:${port}] ${line}`));
  });

  child.stderr?.on('data', (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    lines.forEach(line => console.error(`[${name}:${port}] ERROR: ${line}`));
  });

  child.on('close', (code) => {
    console.log(`[${name}:${port}] Process exited with code ${code}`);
  });

  child.on('error', (error) => {
    console.error(`[${name}:${port}] Failed to start: ${error.message}`);
  });

  processes.push({ name, port, child });
  return child;
}

// Start all three servers
const mainServer = startServer('MAIN', 'server/index.ts', 5000);
const coreServer = startServer('CORE', 'server/core-services-server.ts', 5001);
const whatsappServer = startServer('WHATSAPP', 'server/whatsapp-services-server.ts', 5002);

// Wait for servers to start
setTimeout(() => {
  console.log('');
  console.log('✅ Three-Tier Architecture Started Successfully!');
  console.log('');
  console.log('🌐 Access URLs:');
  console.log('   • Main Application: http://localhost:5000');
  console.log('   • Core Services Status: http://localhost:5001/api/core/health');
  console.log('   • WhatsApp Services Status: http://localhost:5002/api/whatsapp/health');
  console.log('');
  console.log('📊 Service Distribution:');
  console.log('   • 7 Core Services running on port 5001');
  console.log('   • 7 WhatsApp Services running on port 5002');
  console.log('   • Main web interface on port 5000');
  console.log('');
}, 5000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Three-Tier Architecture...');
  
  processes.forEach(({ name, port, child }) => {
    console.log(`[${name}:${port}] Stopping...`);
    child.kill('SIGTERM');
  });
  
  setTimeout(() => {
    console.log('✅ All services stopped');
    process.exit(0);
  }, 2000);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  processes.forEach(({ child }) => child.kill('SIGTERM'));
  process.exit(0);
});