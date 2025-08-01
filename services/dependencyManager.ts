import { EventEmitter } from 'events';

interface ServiceDependency {
  name: string;
  dependencies: string[];
  port?: number;
  startupOrder: number;
  category: 'core' | 'whatsapp' | 'management';
  isRunning: boolean;
  lastStarted?: Date;
}

export class DependencyManager extends EventEmitter {
  private services: Map<string, ServiceDependency> = new Map();
  private startupQueue: string[] = [];
  private startingServices: Set<string> = new Set();

  constructor() {
    super();
    this.initializeServiceDependencies();
  }

  private initializeServiceDependencies() {
    // All services removed as requested
    const serviceDependencies: ServiceDependency[] = [];

    // Initialize services map
    serviceDependencies.forEach(service => {
      this.services.set(service.name, service);
    });

    // Generate startup queue based on dependencies and startup order
    this.generateStartupQueue();
  }

  private generateStartupQueue() {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const queue: string[] = [];

    const visit = (serviceName: string) => {
      if (visiting.has(serviceName)) {
        throw new Error(`Circular dependency detected involving ${serviceName}`);
      }
      if (visited.has(serviceName)) {
        return;
      }

      visiting.add(serviceName);
      const service = this.services.get(serviceName);
      
      if (service) {
        // Visit all dependencies first
        service.dependencies.forEach(dep => {
          if (this.services.has(dep)) {
            visit(dep);
          }
        });
        
        visiting.delete(serviceName);
        visited.add(serviceName);
        queue.push(serviceName);
      }
    };

    // Sort services by startup order and visit each
    const sortedServices = Array.from(this.services.values())
      .sort((a, b) => a.startupOrder - b.startupOrder);

    sortedServices.forEach(service => {
      visit(service.name);
    });

    this.startupQueue = queue;
    console.log('[DependencyManager] 🚀 Startup queue generated:', this.startupQueue);
  }

  public async startServices(): Promise<void> {
    console.log('[DependencyManager] 🔧 Starting services in dependency order...');
    
    for (const serviceName of this.startupQueue) {
      if (!this.startingServices.has(serviceName)) {
        await this.startService(serviceName);
      }
    }
    
    console.log('[DependencyManager] ✅ No services configured - startup complete');
  }

  public async startService(serviceName: string): Promise<void> {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }

    if (service.isRunning) {
      console.log(`[DependencyManager] ⏭️ Service ${serviceName} already running`);
      return;
    }

    if (this.startingServices.has(serviceName)) {
      console.log(`[DependencyManager] ⏳ Service ${serviceName} already starting`);
      return;
    }

    // Check if all dependencies are running
    for (const depName of service.dependencies) {
      const dependency = this.services.get(depName);
      if (!dependency || !dependency.isRunning) {
        console.log(`[DependencyManager] ⏸️ Waiting for dependency ${depName} of ${serviceName}`);
        await this.startService(depName);
      }
    }

    this.startingServices.add(serviceName);
    
    try {
      console.log(`[DependencyManager] 🚀 Starting ${serviceName} on port ${service.port || 'N/A'}...`);
      
      // Emit service start event
      this.emit('serviceStarting', serviceName, service);
      
      // Mark as running (actual service startup handled by ServiceManager)
      service.isRunning = true;
      service.lastStarted = new Date();
      
      console.log(`[DependencyManager] ✅ Service ${serviceName} started successfully`);
      this.emit('serviceStarted', serviceName, service);
      
    } catch (error) {
      console.error(`[DependencyManager] ❌ Failed to start ${serviceName}:`, error);
      service.isRunning = false;
      this.emit('serviceError', serviceName, error);
      throw error;
    } finally {
      this.startingServices.delete(serviceName);
    }
  }

  public stopService(serviceName: string): void {
    const service = this.services.get(serviceName);
    if (service) {
      service.isRunning = false;
      console.log(`[DependencyManager] 🛑 Service ${serviceName} stopped`);
      this.emit('serviceStopped', serviceName, service);
    }
  }

  public getServiceStatus(serviceName: string): ServiceDependency | undefined {
    return this.services.get(serviceName);
  }

  public getAllServices(): Map<string, ServiceDependency> {
    return new Map(this.services);
  }

  public getStartupQueue(): string[] {
    return [...this.startupQueue];
  }

  public getServicesByPort(port: number): ServiceDependency[] {
    return Array.from(this.services.values()).filter(service => service.port === port);
  }

  public getServicesByCategory(category: 'core' | 'whatsapp' | 'management'): ServiceDependency[] {
    return Array.from(this.services.values()).filter(service => service.category === category);
  }

  public validateDependencies(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    for (const [serviceName, service] of Array.from(this.services.entries())) {
      for (const depName of service.dependencies) {
        if (!this.services.has(depName)) {
          errors.push(`Service ${serviceName} depends on non-existent service ${depName}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

export const dependencyManager = new DependencyManager();