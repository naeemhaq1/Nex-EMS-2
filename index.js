
// NEXLINX EMS Entry Point
// This file serves as the main entry point for the application

const path = require('path');
const { spawn } = require('child_process');

console.log('[NEXLINX EMS] Starting application...');

// Start the main server
const serverProcess = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true,
  cwd: __dirname
});

serverProcess.on('error', (error) => {
  console.error('[NEXLINX EMS] Failed to start:', error);
  process.exit(1);
});

serverProcess.on('close', (code) => {
  console.log(`[NEXLINX EMS] Process exited with code ${code}`);
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('[NEXLINX EMS] Shutting down gracefully...');
  serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('[NEXLINX EMS] Shutting down gracefully...');
  serverProcess.kill('SIGTERM');
});
