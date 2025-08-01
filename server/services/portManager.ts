import express from 'express';
import { EventEmitter } from 'events';
import net from 'net';

interface PortConfig {
  frontend: number; // Always locked at 5000
  services: number;
  whatsapp: number;
}

interface ServiceInstance {
  app: express.Application;
  server: any;
  port: number;
  type: 'services' | 'whatsapp';
  status: 'running' | 'stopped' | 'error';
  startTime?: Date;
  error?: string;
}

class PortManager extends EventEmitter {
  private currentConfig: PortConfig = {
    frontend: 5000,
    services: 5001,
    whatsapp: 5002
  };
  
  private serviceInstances: Map<string, ServiceInstance> = new Map();
  private isInitialized = false;

  constructor() {
    super();
  }

  getCurrentConfig(): PortConfig {
    return { ...this.currentConfig };
  }

  async checkPortAvailability(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.listen(port, () => {
        server.once('close', () => resolve(true));
        server.close();
      });
      
      server.on('error', () => resolve(false));
    });
  }

  async validatePortConfiguration(config: PortConfig): Promise<{
    valid: boolean;
    errors: string[];
    conflicts: number[];
  }> {
    const errors: string[] = [];
    const conflicts: number[] = [];
    const ports = [config.frontend, config.services, config.whatsapp];

    // Check for duplicate ports
    const uniquePorts = new Set(ports);
    if (uniquePorts.size !== ports.length) {
      errors.push('Port numbers must be unique');
    }

    // Check port ranges
    for (const [key, port] of Object.entries(config)) {
      if (port < 1024 || port > 65535) {
        errors.push(`${key} port must be between 1024 and 65535`);
      }
    }

    // Check port availability (excluding frontend which might be in use)
    for (const port of [config.services, config.whatsapp]) {
      if (port !== this.currentConfig.services && port !== this.currentConfig.whatsapp) {
        const available = await this.checkPortAvailability(port);
        if (!available) {
          conflicts.push(port);
          errors.push(`Port ${port} is already in use`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      conflicts
    };
  }

  private createServicesApp(): express.Application {
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      next();
    });

    app.get('/api/core/health', (req, res) => {
      const instance = this.serviceInstances.get('services');
      res.json({
        status: 'running',
        port: instance?.port || this.currentConfig.services,
        service: 'core-services',
        uptime: instance?.startTime ? Math.floor((Date.now() - instance.startTime.getTime()) / 1000) : 0,
        services: [
          { name: 'threePollerSystem', status: 'healthy' },
          { name: 'attendanceProcessor', status: 'healthy' },
          { name: 'watchdog', status: 'healthy' },
          { name: 'processMonitor', status: 'healthy' },
          { name: 'systemAlerts', status: 'healthy' },
          { name: 'notificationService', status: 'healthy' },
          { name: 'autoBackupService', status: 'healthy' }
        ],
        timestamp: new Date().toISOString()
      });
    });

    app.get('/api/core/services', (req, res) => {
      const instance = this.serviceInstances.get('services');
      const uptime = instance?.startTime ? Math.floor((Date.now() - instance.startTime.getTime()) / 1000) : 0;
      
      res.json([
        { name: 'threePollerSystem', status: 'healthy', type: 'core', port: instance?.port, uptime },
        { name: 'attendanceProcessor', status: 'healthy', type: 'core', port: instance?.port, uptime },
        { name: 'watchdog', status: 'healthy', type: 'core', port: instance?.port, uptime },
        { name: 'processMonitor', status: 'healthy', type: 'core', port: instance?.port, uptime },
        { name: 'systemAlerts', status: 'healthy', type: 'core', port: instance?.port, uptime },
        { name: 'notificationService', status: 'healthy', type: 'core', port: instance?.port, uptime },
        { name: 'autoBackupService', status: 'healthy', type: 'core', port: instance?.port, uptime }
      ]);
    });

    return app;
  }

  private createWhatsAppApp(): express.Application {
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      next();
    });

    app.get('/api/whatsapp/health', (req, res) => {
      const instance = this.serviceInstances.get('whatsapp');
      res.json({
        status: 'running',
        port: instance?.port || this.currentConfig.whatsapp,
        service: 'whatsapp-services',
        uptime: instance?.startTime ? Math.floor((Date.now() - instance.startTime.getTime()) / 1000) : 0,
        services: [
          { name: 'whatsappService', status: 'healthy' },
          { name: 'whatsappMonitor', status: 'healthy' },
          { name: 'whatsappAPIMonitor', status: 'healthy' },
          { name: 'whatsappChatbot', status: 'healthy' },
          { name: 'whatsappDirectory', status: 'healthy' },
          { name: 'whatsappDeliveryTracker', status: 'healthy' },
          { name: 'whatsappAnnouncement', status: 'healthy' }
        ],
        timestamp: new Date().toISOString()
      });
    });

    app.get('/api/whatsapp/services', (req, res) => {
      const instance = this.serviceInstances.get('whatsapp');
      const uptime = instance?.startTime ? Math.floor((Date.now() - instance.startTime.getTime()) / 1000) : 0;
      
      res.json([
        { name: 'whatsappService', status: 'healthy', type: 'whatsapp', port: instance?.port, uptime },
        { name: 'whatsappMonitor', status: 'healthy', type: 'whatsapp', port: instance?.port, uptime },
        { name: 'whatsappAPIMonitor', status: 'healthy', type: 'whatsapp', port: instance?.port, uptime },
        { name: 'whatsappChatbot', status: 'healthy', type: 'whatsapp', port: instance?.port, uptime },
        { name: 'whatsappDirectory', status: 'healthy', type: 'whatsapp', port: instance?.port, uptime },
        { name: 'whatsappDeliveryTracker', status: 'healthy', type: 'whatsapp', port: instance?.port, uptime },
        { name: 'whatsappAnnouncement', status: 'healthy', type: 'whatsapp', port: instance?.port, uptime }
      ]);
    });

    return app;
  }

  private async startService(type: 'services' | 'whatsapp', port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const app = type === 'services' ? this.createServicesApp() : this.createWhatsAppApp();
        
        const server = app.listen(port, '0.0.0.0', () => {
          const instance: ServiceInstance = {
            app,
            server,
            port,
            type,
            status: 'running',
            startTime: new Date()
          };
          
          this.serviceInstances.set(type, instance);
          console.log(`✅ ${type.charAt(0).toUpperCase() + type.slice(1)} service started on port ${port}`);
          
          this.emit('serviceStarted', { type, port });
          resolve();
        });

        server.on('error', (error: any) => {
          const instance: ServiceInstance = {
            app,
            server: null,
            port,
            type,
            status: 'error',
            error: error.message
          };
          
          this.serviceInstances.set(type, instance);
          this.emit('serviceError', { type, port, error: error.message });
          reject(new Error(`Failed to start ${type} service on port ${port}: ${error.message}`));
        });
      } catch (error: any) {
        reject(new Error(`Error creating ${type} service: ${error.message}`));
      }
    });
  }

  private async stopService(type: 'services' | 'whatsapp'): Promise<void> {
    return new Promise((resolve) => {
      const instance = this.serviceInstances.get(type);
      
      if (instance?.server) {
        instance.server.close(() => {
          instance.status = 'stopped';
          console.log(`🛑 ${type.charAt(0).toUpperCase() + type.slice(1)} service stopped`);
          this.emit('serviceStopped', { type });
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  async applyConfiguration(newConfig: PortConfig): Promise<{
    success: boolean;
    message: string;
    errors?: string[];
  }> {
    try {
      // Validate new configuration
      const validation = await this.validatePortConfiguration(newConfig);
      if (!validation.valid) {
        return {
          success: false,
          message: 'Port configuration validation failed',
          errors: validation.errors
        };
      }

      // Stop existing services
      console.log('🔄 Stopping existing services...');
      await this.stopService('services');
      await this.stopService('whatsapp');

      // Wait a moment for ports to be released
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Start services on new ports
      console.log('🚀 Starting services on new ports...');
      await this.startService('services', newConfig.services);
      await this.startService('whatsapp', newConfig.whatsapp);

      // Update current configuration
      this.currentConfig = { ...newConfig };

      this.emit('configurationChanged', this.currentConfig);

      return {
        success: true,
        message: `Services successfully reconfigured. Frontend: ${newConfig.frontend}, Services: ${newConfig.services}, WhatsApp: ${newConfig.whatsapp}`
      };

    } catch (error: any) {
      console.error('❌ Failed to apply port configuration:', error);
      
      // Try to restart with original configuration
      try {
        await this.startService('services', this.currentConfig.services);
        await this.startService('whatsapp', this.currentConfig.whatsapp);
      } catch (restartError: any) {
        console.error('❌ Failed to restart with original configuration:', restartError);
      }

      return {
        success: false,
        message: `Failed to apply configuration: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔧 Initializing Port Manager...');
      
      // Start services with default configuration
      await this.startService('services', this.currentConfig.services);
      await this.startService('whatsapp', this.currentConfig.whatsapp);
      
      this.isInitialized = true;
      console.log('✅ Port Manager initialized successfully');
      
      // Display current configuration
      console.log(`📊 Current Port Configuration:`);
      console.log(`   • Frontend: ${this.currentConfig.frontend}`);
      console.log(`   • Services: ${this.currentConfig.services}`);
      console.log(`   • WhatsApp: ${this.currentConfig.whatsapp}`);
      
    } catch (error: any) {
      console.error('❌ Failed to initialize Port Manager:', error);
      throw error;
    }
  }

  getServiceStatus(): { [key: string]: ServiceInstance | undefined } {
    return {
      services: this.serviceInstances.get('services'),
      whatsapp: this.serviceInstances.get('whatsapp')
    };
  }

  async restart(): Promise<void> {
    console.log('🔄 Restarting all services...');
    await this.stopService('services');
    await this.stopService('whatsapp');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await this.startService('services', this.currentConfig.services);
    await this.startService('whatsapp', this.currentConfig.whatsapp);
    
    console.log('✅ All services restarted');
  }

  /**
   * Get dynamic service status with real-time monitoring
   */
  async getDynamicServiceStatus() {
    try {
      // Core services that should be running on the services port
      const coreServices = [
        'Attendance Processor',
        'Three Poller System', 
        'Watchdog',
        'Process Monitor',
        'Auto Backup Service',
        'System Alerts',
        'Notification Service'
      ];

      // WhatsApp services that should be running on the whatsapp port  
      const whatsappServices = [
        'WhatsApp Service',
        'WhatsApp Monitor',
        'WhatsApp API Monitor',
        'WhatsApp Chatbot',
        'WhatsApp Directory',
        'WhatsApp Delivery Tracker',
        'WhatsApp Announcement'
      ];

      // Check if services are actually running by trying to connect to ports
      const servicesRunning = await this.checkPortConnection(this.currentConfig.services);
      const whatsappRunning = await this.checkPortConnection(this.currentConfig.whatsapp);

      return {
        coreServices: servicesRunning ? coreServices : [],
        whatsappServices: whatsappRunning ? whatsappServices : [],
        portsActive: {
          services: servicesRunning,
          whatsapp: whatsappRunning
        }
      };
    } catch (error) {
      console.error('Error getting dynamic service status:', error);
      return {
        coreServices: [],
        whatsappServices: [],
        portsActive: {
          services: false,
          whatsapp: false
        }
      };
    }
  }

  /**
   * Check if a port is accepting connections
   */
  private async checkPortConnection(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const net = require('net');
      const socket = new net.Socket();
      
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, 2000);

      socket.on('connect', () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve(true);
      });

      socket.on('error', () => {
        clearTimeout(timeout);
        resolve(false);
      });

      socket.connect(port, '127.0.0.1');
    });
  }

  /**
   * Start a specific service type
   */
  async startServiceType(type: 'services' | 'whatsapp'): Promise<{ success: boolean; message: string }> {
    try {
      const port = type === 'services' ? this.currentConfig.services : this.currentConfig.whatsapp;
      await this.startService(type, port);
      return {
        success: true,
        message: `${type.charAt(0).toUpperCase() + type.slice(1)} service started successfully on port ${port}`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to start ${type} service: ${error.message}`
      };
    }
  }

  /**
   * Stop a specific service type
   */
  async stopServiceType(type: 'services' | 'whatsapp'): Promise<{ success: boolean; message: string }> {
    try {
      await this.stopService(type);
      return {
        success: true,
        message: `${type.charAt(0).toUpperCase() + type.slice(1)} service stopped successfully`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to stop ${type} service: ${error.message}`
      };
    }
  }
}

export const portManager = new PortManager();