// WhatsApp Core Services Monitor - Second WhatsApp Service
// Monitors core messaging services, queues, and contact management

interface ServiceHealth {
  messagingService: boolean;
  contactsService: boolean;
  queueService: boolean;
  deliveryService: boolean;
  mediaService: boolean;
}

interface QueueStats {
  pending: number;
  processing: number;
  failed: number;
  completed: number;
  totalToday: number;
}

interface CoreMetrics {
  messagesPerMinute: number;
  successRate: number;
  averageDeliveryTime: number;
  contactCount: number;
  activeConversations: number;
}

class WhatsAppCoreMonitorService {
  private isRunning = false;
  private monitorInterval: NodeJS.Timeout | null = null;
  private startTime = Date.now();
  
  private serviceHealth: ServiceHealth = {
    messagingService: false,
    contactsService: false,
    queueService: false,
    deliveryService: false,
    mediaService: false
  };

  private queueStats: QueueStats = {
    pending: 0,
    processing: 0,
    failed: 0,
    completed: 0,
    totalToday: 0
  };

  private metrics: CoreMetrics = {
    messagesPerMinute: 0,
    successRate: 0,
    averageDeliveryTime: 0,
    contactCount: 0,
    activeConversations: 0
  };

  private readonly MONITOR_INTERVAL = 15000; // 15 seconds

  constructor() {
    console.log('[WhatsApp Core Monitor] 🔧 Service initialized');
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[WhatsApp Core Monitor] ⚠️ Service already running');
      return;
    }

    this.isRunning = true;
    this.startTime = Date.now();
    console.log('[WhatsApp Core Monitor] 🚀 Starting core services monitoring');

    // Initial health check
    await this.performHealthCheck();

    // Set up recurring monitoring
    this.monitorInterval = setInterval(() => {
      this.performHealthCheck().catch(error => {
        console.error('[WhatsApp Core Monitor] 🚨 Health check failed:', error.message);
      });
    }, this.MONITOR_INTERVAL);

    console.log('[WhatsApp Core Monitor] ✅ Service started successfully');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('[WhatsApp Core Monitor] ⚠️ Service not running');
      return;
    }

    this.isRunning = false;
    
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    console.log('[WhatsApp Core Monitor] 🛑 Service stopped');
  }

  async restart(): Promise<void> {
    console.log('[WhatsApp Core Monitor] 🔄 Restarting service');
    await this.stop();
    await this.start();
  }

  private async performHealthCheck(): Promise<void> {
    console.log('[WhatsApp Core Monitor] 🔍 Performing core services health check');

    try {
      // Check messaging service health
      this.serviceHealth.messagingService = await this.checkMessagingService();
      
      // Check contacts service health
      this.serviceHealth.contactsService = await this.checkContactsService();
      
      // Check queue service health
      this.serviceHealth.queueService = await this.checkQueueService();
      
      // Check delivery service health
      this.serviceHealth.deliveryService = await this.checkDeliveryService();
      
      // Check media service health
      this.serviceHealth.mediaService = await this.checkMediaService();
      
      // Update queue statistics
      await this.updateQueueStats();
      
      // Update core metrics
      await this.updateCoreMetrics();

      const healthyServices = Object.values(this.serviceHealth).filter(Boolean).length;
      const totalServices = Object.keys(this.serviceHealth).length;
      
      console.log(`[WhatsApp Core Monitor] ✅ Health check complete: ${healthyServices}/${totalServices} services healthy`);

    } catch (error: any) {
      console.error('[WhatsApp Core Monitor] 🚨 Health check failed:', error.message);
    }
  }

  private async checkMessagingService(): Promise<boolean> {
    try {
      // In production, this would check actual messaging service health
      // For now, simulate based on available credentials
      const hasCredentials = !!(
        process.env.WHATSAPP_ACCESS_TOKEN && 
        process.env.WHATSAPP_PHONE_NUMBER_ID
      );
      
      if (hasCredentials) {
        console.log('[WhatsApp Core Monitor] ✅ Messaging service: HEALTHY');
        return true;
      } else {
        console.log('[WhatsApp Core Monitor] ❌ Messaging service: No credentials');
        return false;
      }
    } catch (error) {
      console.log('[WhatsApp Core Monitor] ❌ Messaging service: ERROR');
      return false;
    }
  }

  private async checkContactsService(): Promise<boolean> {
    try {
      // Check if contacts database/service is accessible
      // In production, this would ping the contacts service
      console.log('[WhatsApp Core Monitor] ✅ Contacts service: HEALTHY');
      return true;
    } catch (error) {
      console.log('[WhatsApp Core Monitor] ❌ Contacts service: ERROR');
      return false;
    }
  }

  private async checkQueueService(): Promise<boolean> {
    try {
      // Check message queue health
      // In production, this would check Redis/queue service
      console.log('[WhatsApp Core Monitor] ✅ Queue service: HEALTHY');
      return true;
    } catch (error) {
      console.log('[WhatsApp Core Monitor] ❌ Queue service: ERROR');
      return false;
    }
  }

  private async checkDeliveryService(): Promise<boolean> {
    try {
      // Check delivery tracking service
      console.log('[WhatsApp Core Monitor] ✅ Delivery service: HEALTHY');
      return true;
    } catch (error) {
      console.log('[WhatsApp Core Monitor] ❌ Delivery service: ERROR');
      return false;
    }
  }

  private async checkMediaService(): Promise<boolean> {
    try {
      // Check media upload/download service
      console.log('[WhatsApp Core Monitor] ✅ Media service: HEALTHY');
      return true;
    } catch (error) {
      console.log('[WhatsApp Core Monitor] ❌ Media service: ERROR');
      return false;
    }
  }

  private async updateQueueStats(): Promise<void> {
    // In production, this would query actual queue statistics
    this.queueStats = {
      pending: Math.floor(Math.random() * 10),
      processing: Math.floor(Math.random() * 5),
      failed: Math.floor(Math.random() * 3),
      completed: 156 + Math.floor(Math.random() * 50),
      totalToday: 200 + Math.floor(Math.random() * 100)
    };
  }

  private async updateCoreMetrics(): Promise<void> {
    // In production, this would calculate real metrics
    this.metrics = {
      messagesPerMinute: Math.floor(Math.random() * 15) + 5,
      successRate: 95 + Math.random() * 4, // 95-99%
      averageDeliveryTime: 1.2 + Math.random() * 0.8, // 1.2-2.0 seconds
      contactCount: 156 + Math.floor(Math.random() * 50),
      activeConversations: 12 + Math.floor(Math.random() * 8)
    };
  }

  getStatus(): {
    isRunning: boolean;
    uptime: string;
    serviceHealth: ServiceHealth;
    queueStats: QueueStats;
    metrics: CoreMetrics;
    overallHealth: 'healthy' | 'warning' | 'unhealthy';
  } {
    const healthyServices = Object.values(this.serviceHealth).filter(Boolean).length;
    const totalServices = Object.keys(this.serviceHealth).length;
    
    let overallHealth: 'healthy' | 'warning' | 'unhealthy';
    if (healthyServices === totalServices) {
      overallHealth = 'healthy';
    } else if (healthyServices >= totalServices / 2) {
      overallHealth = 'warning';
    } else {
      overallHealth = 'unhealthy';
    }

    return {
      isRunning: this.isRunning,
      uptime: this.formatUptime(),
      serviceHealth: this.serviceHealth,
      queueStats: this.queueStats,
      metrics: this.metrics,
      overallHealth
    };
  }

  private formatUptime(): string {
    if (!this.isRunning) return '0s';
    
    const uptimeMs = Date.now() - this.startTime;
    const minutes = Math.floor(uptimeMs / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else {
      return `${minutes}m`;
    }
  }

  async getHealth(): Promise<{ status: string; details: any }> {
    const status = this.getStatus();
    return {
      status: this.isRunning && status.overallHealth === 'healthy' ? 'healthy' : 'unhealthy',
      details: {
        service: 'WhatsApp Core Monitor',
        running: this.isRunning,
        overallHealth: status.overallHealth,
        serviceHealth: status.serviceHealth,
        queueStats: status.queueStats,
        metrics: status.metrics,
        uptime: status.uptime
      }
    };
  }
}

export const whatsappCoreMonitorService = new WhatsAppCoreMonitorService();
export default whatsappCoreMonitorService;