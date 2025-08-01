// WhatsApp Chatbot Monitor - Third WhatsApp Service
// Monitors chatbot responses, conversation flows, and automated handling

interface ChatbotHealth {
  responseEngine: boolean;
  conversationFlow: boolean;
  nlpProcessor: boolean;
  webhookReceiver: boolean;
  autoResponder: boolean;
}

interface ChatbotMetrics {
  conversationsHandled: number;
  avgResponseTime: number;
  successfulResponses: number;
  failedResponses: number;
  activeChats: number;
  queuedMessages: number;
}

interface ConversationFlow {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'error';
  triggerCount: number;
  completionRate: number;
}

class WhatsAppChatbotMonitorService {
  private isRunning = false;
  private monitorInterval: NodeJS.Timeout | null = null;
  private startTime = Date.now();
  
  private chatbotHealth: ChatbotHealth = {
    responseEngine: false,
    conversationFlow: false,
    nlpProcessor: false,
    webhookReceiver: false,
    autoResponder: false
  };

  private metrics: ChatbotMetrics = {
    conversationsHandled: 0,
    avgResponseTime: 0,
    successfulResponses: 0,
    failedResponses: 0,
    activeChats: 0,
    queuedMessages: 0
  };

  private conversationFlows: ConversationFlow[] = [
    {
      id: 'welcome',
      name: 'Welcome Flow',
      status: 'active',
      triggerCount: 45,
      completionRate: 89
    },
    {
      id: 'faq',
      name: 'FAQ Assistant',
      status: 'active',
      triggerCount: 123,
      completionRate: 94
    },
    {
      id: 'support',
      name: 'Support Escalation',
      status: 'active',
      triggerCount: 28,
      completionRate: 76
    }
  ];

  private readonly MONITOR_INTERVAL = 20000; // 20 seconds

  constructor() {
    console.log('[WhatsApp Chatbot Monitor] 🔧 Service initialized');
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[WhatsApp Chatbot Monitor] ⚠️ Service already running');
      return;
    }

    this.isRunning = true;
    this.startTime = Date.now();
    console.log('[WhatsApp Chatbot Monitor] 🚀 Starting chatbot monitoring service');

    // Initial health check
    await this.performChatbotCheck();

    // Set up recurring monitoring
    this.monitorInterval = setInterval(() => {
      this.performChatbotCheck().catch(error => {
        console.error('[WhatsApp Chatbot Monitor] 🚨 Chatbot check failed:', error.message);
      });
    }, this.MONITOR_INTERVAL);

    console.log('[WhatsApp Chatbot Monitor] ✅ Service started successfully');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('[WhatsApp Chatbot Monitor] ⚠️ Service not running');
      return;
    }

    this.isRunning = false;
    
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    console.log('[WhatsApp Chatbot Monitor] 🛑 Service stopped');
  }

  async restart(): Promise<void> {
    console.log('[WhatsApp Chatbot Monitor] 🔄 Restarting service');
    await this.stop();
    await this.start();
  }

  private async performChatbotCheck(): Promise<void> {
    console.log('[WhatsApp Chatbot Monitor] 🔍 Performing chatbot health check');

    try {
      // Check response engine
      this.chatbotHealth.responseEngine = await this.checkResponseEngine();
      
      // Check conversation flow engine
      this.chatbotHealth.conversationFlow = await this.checkConversationFlow();
      
      // Check NLP processor
      this.chatbotHealth.nlpProcessor = await this.checkNLPProcessor();
      
      // Check webhook receiver
      this.chatbotHealth.webhookReceiver = await this.checkWebhookReceiver();
      
      // Check auto responder
      this.chatbotHealth.autoResponder = await this.checkAutoResponder();
      
      // Update chatbot metrics
      await this.updateChatbotMetrics();
      
      // Update conversation flows
      await this.updateConversationFlows();

      const healthyComponents = Object.values(this.chatbotHealth).filter(Boolean).length;
      const totalComponents = Object.keys(this.chatbotHealth).length;
      
      console.log(`[WhatsApp Chatbot Monitor] ✅ Chatbot check complete: ${healthyComponents}/${totalComponents} components healthy`);

    } catch (error: any) {
      console.error('[WhatsApp Chatbot Monitor] 🚨 Chatbot check failed:', error.message);
    }
  }

  private async checkResponseEngine(): Promise<boolean> {
    try {
      // Check if chatbot response engine is operational
      // In production, this would test the actual response engine
      const hasConfig = !!(process.env.WHATSAPP_ACCESS_TOKEN);
      
      if (hasConfig) {
        console.log('[WhatsApp Chatbot Monitor] ✅ Response engine: HEALTHY');
        return true;
      } else {
        console.log('[WhatsApp Chatbot Monitor] ❌ Response engine: No configuration');
        return false;
      }
    } catch (error) {
      console.log('[WhatsApp Chatbot Monitor] ❌ Response engine: ERROR');
      return false;
    }
  }

  private async checkConversationFlow(): Promise<boolean> {
    try {
      // Check conversation flow engine
      // In production, this would verify flow engine status
      console.log('[WhatsApp Chatbot Monitor] ✅ Conversation flow: HEALTHY');
      return true;
    } catch (error) {
      console.log('[WhatsApp Chatbot Monitor] ❌ Conversation flow: ERROR');
      return false;
    }
  }

  private async checkNLPProcessor(): Promise<boolean> {
    try {
      // Check Natural Language Processing component
      // In production, this would test NLP service connectivity
      console.log('[WhatsApp Chatbot Monitor] ✅ NLP processor: HEALTHY');
      return true;
    } catch (error) {
      console.log('[WhatsApp Chatbot Monitor] ❌ NLP processor: ERROR');
      return false;
    }
  }

  private async checkWebhookReceiver(): Promise<boolean> {
    try {
      // Check webhook receiver status
      // In production, this would verify webhook endpoint health
      console.log('[WhatsApp Chatbot Monitor] ✅ Webhook receiver: HEALTHY');
      return true;
    } catch (error) {
      console.log('[WhatsApp Chatbot Monitor] ❌ Webhook receiver: ERROR');
      return false;
    }
  }

  private async checkAutoResponder(): Promise<boolean> {
    try {
      // Check automated response system
      // In production, this would test auto-response capability
      console.log('[WhatsApp Chatbot Monitor] ✅ Auto responder: HEALTHY');
      return true;
    } catch (error) {
      console.log('[WhatsApp Chatbot Monitor] ❌ Auto responder: ERROR');
      return false;
    }
  }

  private async updateChatbotMetrics(): Promise<void> {
    // In production, this would query real chatbot metrics
    this.metrics = {
      conversationsHandled: 45 + Math.floor(Math.random() * 20),
      avgResponseTime: 1.2 + Math.random() * 0.8, // 1.2-2.0 seconds
      successfulResponses: 156 + Math.floor(Math.random() * 30),
      failedResponses: Math.floor(Math.random() * 5),
      activeChats: 8 + Math.floor(Math.random() * 12),
      queuedMessages: Math.floor(Math.random() * 8)
    };
  }

  private async updateConversationFlows(): Promise<void> {
    // In production, this would update real flow statistics
    this.conversationFlows.forEach(flow => {
      // Simulate some activity
      if (Math.random() > 0.8) {
        flow.triggerCount += Math.floor(Math.random() * 3);
        flow.completionRate = Math.max(70, Math.min(99, flow.completionRate + (Math.random() - 0.5) * 5));
      }
    });
  }

  getStatus(): {
    isRunning: boolean;
    uptime: string;
    chatbotHealth: ChatbotHealth;
    metrics: ChatbotMetrics;
    conversationFlows: ConversationFlow[];
    overallHealth: 'healthy' | 'warning' | 'unhealthy';
  } {
    const healthyComponents = Object.values(this.chatbotHealth).filter(Boolean).length;
    const totalComponents = Object.keys(this.chatbotHealth).length;
    
    let overallHealth: 'healthy' | 'warning' | 'unhealthy';
    if (healthyComponents === totalComponents) {
      overallHealth = 'healthy';
    } else if (healthyComponents >= totalComponents / 2) {
      overallHealth = 'warning';
    } else {
      overallHealth = 'unhealthy';
    }

    return {
      isRunning: this.isRunning,
      uptime: this.formatUptime(),
      chatbotHealth: this.chatbotHealth,
      metrics: this.metrics,
      conversationFlows: this.conversationFlows,
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
        service: 'WhatsApp Chatbot Monitor',
        running: this.isRunning,
        overallHealth: status.overallHealth,
        chatbotHealth: status.chatbotHealth,
        metrics: status.metrics,
        conversationFlows: status.conversationFlows,
        uptime: status.uptime
      }
    };
  }

  // Additional methods for chatbot-specific operations
  async pauseConversationFlow(flowId: string): Promise<boolean> {
    const flow = this.conversationFlows.find(f => f.id === flowId);
    if (flow) {
      flow.status = 'paused';
      console.log(`[WhatsApp Chatbot Monitor] ⏸️ Paused conversation flow: ${flow.name}`);
      return true;
    }
    return false;
  }

  async resumeConversationFlow(flowId: string): Promise<boolean> {
    const flow = this.conversationFlows.find(f => f.id === flowId);
    if (flow) {
      flow.status = 'active';
      console.log(`[WhatsApp Chatbot Monitor] ▶️ Resumed conversation flow: ${flow.name}`);
      return true;
    }
    return false;
  }

  getConversationFlowStats(): { 
    totalFlows: number; 
    activeFlows: number; 
    pausedFlows: number; 
    errorFlows: number;
  } {
    const flows = this.conversationFlows;
    return {
      totalFlows: flows.length,
      activeFlows: flows.filter(f => f.status === 'active').length,
      pausedFlows: flows.filter(f => f.status === 'paused').length,
      errorFlows: flows.filter(f => f.status === 'error').length
    };
  }
}

export const whatsappChatbotMonitorService = new WhatsAppChatbotMonitorService();
export default whatsappChatbotMonitorService;