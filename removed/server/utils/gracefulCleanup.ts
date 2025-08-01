import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class GracefulCleanup {
  private static readonly PORTS = [5000, 5001, 5002];
  private static readonly CLEANUP_TIMEOUT = 10000; // 10 seconds

  static async performCleanup(): Promise<void> {
    console.log('🧹 Starting graceful cleanup before startup...');
    
    try {
      // 1. Kill existing Node.js processes related to our application
      await this.killExistingProcesses();
      
      // 2. Clear any stuck ports
      await this.clearPorts();
      
      // 3. Clean up temporary files and locks
      await this.cleanupTempFiles();
      
      // 4. Wait for cleanup to complete
      await this.waitForCleanup();
      
      console.log('✅ Graceful cleanup completed successfully');
    } catch (error) {
      console.warn('⚠️ Cleanup completed with warnings:', error);
      // Don't fail startup due to cleanup issues
    }
  }

  private static async killExistingProcesses(): Promise<void> {
    console.log('🔄 Killing existing application processes...');
    
    try {
      // Kill processes by our server patterns
      const killCommands = [
        'pkill -f "tsx.*server/index.ts" || true',
        'pkill -f "node.*server/index.ts" || true',
        'pkill -f "npm.*run.*dev" || true',
        'pkill -f "node.*three-tier" || true'
      ];

      for (const cmd of killCommands) {
        try {
          await execAsync(cmd);
        } catch (error) {
          // Ignore errors - processes might not exist
        }
      }

      console.log('✅ Process cleanup completed');
    } catch (error) {
      console.warn('⚠️ Process cleanup warning:', error);
    }
  }

  private static async clearPorts(): Promise<void> {
    console.log('🔄 Clearing application ports...');
    
    for (const port of this.PORTS) {
      try {
        // Try to find and kill processes using our ports
        const { stdout } = await execAsync(`lsof -ti:${port} || true`);
        if (stdout.trim()) {
          const pids = stdout.trim().split('\n');
          for (const pid of pids) {
            if (pid) {
              try {
                await execAsync(`kill -TERM ${pid} || true`);
                // Give process time to exit gracefully
                await new Promise(resolve => setTimeout(resolve, 1000));
                // Force kill if still running
                await execAsync(`kill -KILL ${pid} || true`);
              } catch (error) {
                // Process might already be dead
              }
            }
          }
        }
      } catch (error) {
        // Port might not be in use or lsof not available
      }
    }

    console.log('✅ Port cleanup completed');
  }

  private static async cleanupTempFiles(): Promise<void> {
    console.log('🔄 Cleaning temporary files...');
    
    try {
      const cleanupCommands = [
        'rm -f /tmp/nexlinx-*.lock || true',
        'rm -f /tmp/port-*.lock || true',
        'rm -f .port-lock-* || true'
      ];

      for (const cmd of cleanupCommands) {
        try {
          await execAsync(cmd);
        } catch (error) {
          // Ignore errors - files might not exist
        }
      }

      console.log('✅ Temporary file cleanup completed');
    } catch (error) {
      console.warn('⚠️ Temp file cleanup warning:', error);
    }
  }

  private static async waitForCleanup(): Promise<void> {
    console.log('🔄 Waiting for cleanup to settle...');
    
    // Give system time to fully release resources
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('✅ Resource settling completed');
  }

  static setupGracefulShutdown(): void {
    const gracefulExit = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}, performing graceful shutdown...`);
      
      try {
        // Perform cleanup
        await this.performCleanup();
        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during graceful shutdown:', error);
        process.exit(1);
      }
    };

    // Handle various shutdown signals
    process.on('SIGINT', () => gracefulExit('SIGINT'));
    process.on('SIGTERM', () => gracefulExit('SIGTERM'));
    process.on('SIGUSR2', () => gracefulExit('SIGUSR2')); // nodemon restart
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      gracefulExit('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulExit('unhandledRejection');
    });
  }
}