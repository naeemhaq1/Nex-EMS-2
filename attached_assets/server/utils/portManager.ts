import { spawn } from 'child_process';

export class PortManager {
  private static async killProcessOnPort(port: number): Promise<void> {
    return new Promise((resolve) => {
      // Try multiple methods to kill processes on port
      const methods = [
        `lsof -ti:${port} | xargs kill -9`,
        `fuser -k ${port}/tcp`,
        `netstat -tulpn | grep :${port} | awk '{print $7}' | cut -d'/' -f1 | xargs kill -9`
      ];

      let attempts = 0;
      const tryNext = () => {
        if (attempts >= methods.length) {
          console.log(`[PortManager] Port ${port} cleanup completed (${attempts} attempts)`);
          resolve();
          return;
        }

        const command = methods[attempts++];
        const child = spawn('bash', ['-c', command], { stdio: 'ignore' });
        
        child.on('close', () => {
          setTimeout(tryNext, 500); // Small delay between attempts
        });

        child.on('error', () => {
          setTimeout(tryNext, 500);
        });
      };

      tryNext();
    });
  }

  static async cleanPort(port: number): Promise<void> {
    console.log(`[PortManager] 🧹 Cleaning port ${port}...`);
    
    try {
      await this.killProcessOnPort(port);
      
      // Additional wait to ensure port is fully released
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log(`[PortManager] ✅ Port ${port} cleaned successfully`);
    } catch (error) {
      console.log(`[PortManager] ⚠️ Port ${port} cleanup completed with warnings`);
    }
  }

  static async isPortInUse(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const child = spawn('bash', ['-c', `lsof -i:${port} | grep LISTEN`], { stdio: 'pipe' });
      
      child.on('close', (code) => {
        resolve(code === 0); // 0 means port is in use
      });

      child.on('error', () => {
        resolve(false); // Assume port is free if check fails
      });

      setTimeout(() => {
        child.kill();
        resolve(false);
      }, 2000);
    });
  }

  static async waitForPortFree(port: number, maxWaitMs: number = 10000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitMs) {
      const inUse = await this.isPortInUse(port);
      if (!inUse) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return false;
  }
}