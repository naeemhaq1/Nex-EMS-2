
/**
 * Nexlinx EMS Main Entry Point
 * Starts the complete application with all services
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🚀 Starting Nexlinx EMS...');
console.log('📍 Working directory:', __dirname);

// Start the main application
const serverProcess = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true,
  cwd: __dirname,
  env: {
    ...process.env,
    NODE_ENV: 'development',
    PORT: '5000',
    HOST: '0.0.0.0'
  }
});

serverProcess.on('error', (error) => {
  console.error('❌ Failed to start Nexlinx EMS:', error);
  process.exit(1);
});

serverProcess.on('close', (code) => {
  console.log(`📋 Nexlinx EMS process exited with code ${code}`);
  if (code !== 0) {
    process.exit(code);
  }
});

// Handle graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 Received ${signal}. Shutting down Nexlinx EMS gracefully...`);
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill('SIGTERM');
    setTimeout(() => {
      if (!serverProcess.killed) {
        console.log('🔥 Force killing process...');
        serverProcess.kill('SIGKILL');
      }
    }, 5000);
  }
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGQUIT', () => gracefulShutdown('SIGQUIT'));

console.log('✅ Nexlinx EMS startup script running');
console.log('🌐 Application will be available at: https://your-repl-name.replit.app');
console.log('📊 Services will be available at: http://0.0.0.0:5001 & http://0.0.0.0:5002');
