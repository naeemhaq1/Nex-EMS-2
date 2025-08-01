/**
 * Port Cleanup Utility - Gracefully shut down existing port bindings
 * Prevents EADDRINUSE errors during production deployments
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Find and gracefully terminate processes using specific ports
 */
export async function cleanupPorts(ports: number[]): Promise<void> {
  console.log('[Port Cleanup] Checking for existing processes on ports:', ports);
  
  for (const port of ports) {
    try {
      // Try to find process using the port
      const { stdout } = await execAsync(`lsof -ti:${port} 2>/dev/null || echo ""`);
      const pid = stdout.trim();
      
      if (pid && pid !== '') {
        console.log(`[Port Cleanup] Found process ${pid} using port ${port}, terminating gracefully...`);
        
        // Send SIGTERM first for graceful shutdown
        await execAsync(`kill -TERM ${pid} 2>/dev/null || true`);
        
        // Wait a moment for graceful shutdown
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if process is still running
        try {
          await execAsync(`kill -0 ${pid} 2>/dev/null`);
          console.log(`[Port Cleanup] Process ${pid} still running, forcing termination...`);
          await execAsync(`kill -KILL ${pid} 2>/dev/null || true`);
        } catch {
          console.log(`[Port Cleanup] Process ${pid} terminated gracefully`);
        }
      } else {
        console.log(`[Port Cleanup] Port ${port} is free`);
      }
    } catch (error) {
      // Port cleanup tools not available (like in Docker), skip silently
      console.log(`[Port Cleanup] Port cleanup tools not available for port ${port}, proceeding...`);
    }
  }
  
  // Give the system a moment to clean up
  await new Promise(resolve => setTimeout(resolve, 500));
}

/**
 * Specific cleanup for three-tier architecture ports
 */
export async function cleanupThreeTierPorts(): Promise<void> {
  await cleanupPorts([5001, 5002]);
}