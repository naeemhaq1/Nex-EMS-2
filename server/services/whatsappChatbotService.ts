import { whatsappMainService } from './whatsappCoreService';

/**
 * WhatsApp Chatbot Service
 * Dedicated service for automated WhatsApp conversation handling:
 * - Webhook processing
 * - Intelligent response generation
 * - Conversation flow management
 * - Employee assistance commands
 * - FAQ responses
 */
export class WhatsAppChatbotService {
  private isRunning: boolean = false;
  private conversationHistory: Map<string, any[]> = new Map();
  private responseCount: number = 0;
  private lastActivity: Date = new Date();

  constructor() {
    console.log('[WhatsApp Chatbot] ✅ WhatsApp Chatbot Service initialized');
  }

  /**
   * Start the WhatsApp Chatbot Service
   */
  async start(): Promise<void> {
    try {
      console.log('[WhatsApp Chatbot] 🚀 Starting WhatsApp Chatbot Service...');
      
      this.isRunning = true;
      this.lastActivity = new Date();
      
      console.log('[WhatsApp Chatbot] ✅ WhatsApp Chatbot Service started successfully');
      
    } catch (error) {
      console.error('[WhatsApp Chatbot] ❌ Failed to start WhatsApp Chatbot Service:', error);
      throw error;
    }
  }

  /**
   * Stop the WhatsApp Chatbot Service
   */
  async stop(): Promise<void> {
    try {
      console.log('[WhatsApp Chatbot] 🛑 Stopping WhatsApp Chatbot Service...');
      
      this.isRunning = false;
      this.conversationHistory.clear();
      
      console.log('[WhatsApp Chatbot] ✅ WhatsApp Chatbot Service stopped successfully');
      
    } catch (error) {
      console.error('[WhatsApp Chatbot] ❌ Error stopping WhatsApp Chatbot Service:', error);
      throw error;
    }
  }

  /**
   * Process incoming WhatsApp webhook for chatbot responses
   */
  async processWebhook(webhookData: any): Promise<void> {
    try {
      console.log('[WhatsApp Chatbot] 🤖 Processing webhook for automated responses');
      
      if (!this.isRunning) {
        console.log('[WhatsApp Chatbot] ⚠️ Service not running, ignoring webhook');
        return;
      }

      // Process messages for chatbot responses
      if (webhookData.messages) {
        for (const message of webhookData.messages) {
          await this.handleIncomingMessage(message);
        }
      }

      // Process status updates for delivery tracking
      if (webhookData.statuses) {
        for (const status of webhookData.statuses) {
          await this.handleStatusUpdate(status);
        }
      }
      
      this.lastActivity = new Date();
      
    } catch (error) {
      console.error('[WhatsApp Chatbot] ❌ Error processing webhook:', error);
    }
  }

  /**
   * Handle incoming message and generate appropriate response
   */
  private async handleIncomingMessage(message: any): Promise<void> {
    try {
      const from = message.from;
      const text = message.text?.body?.toLowerCase() || '';
      const messageId = message.id;

      console.log(`[WhatsApp Chatbot] 📨 Processing message from ${from}: "${text}"`);

      // Store conversation history
      if (!this.conversationHistory.has(from)) {
        this.conversationHistory.set(from, []);
      }
      this.conversationHistory.get(from)?.push({
        id: messageId,
        text: text,
        timestamp: new Date(),
        type: 'incoming'
      });

      // Generate response based on message content
      const response = await this.generateResponse(text, from);
      
      if (response) {
        // Send response through main WhatsApp service
        const result = await whatsappMainService.sendMessage(from, response, 'chatbot');
        
        if (result.success) {
          this.responseCount++;
          
          // Store response in conversation history
          this.conversationHistory.get(from)?.push({
            id: result.messageId,
            text: response,
            timestamp: new Date(),
            type: 'outgoing'
          });
          
          console.log(`[WhatsApp Chatbot] ✅ Response sent to ${from}`);
        } else {
          console.log(`[WhatsApp Chatbot] ❌ Failed to send response: ${result.error}`);
        }
      }

    } catch (error) {
      console.error('[WhatsApp Chatbot] ❌ Error handling incoming message:', error);
    }
  }

  /**
   * Generate intelligent response based on message content
   */
  private async generateResponse(text: string, from: string): Promise<string | null> {
    try {
      // Greeting responses
      if (text.includes('hello') || text.includes('hi') || text.includes('hey') || text.includes('salaam')) {
        return '👋 Hello! I\'m the Nexlinx assistant. How can I help you today?\n\nType "help" to see available commands.';
      }

      // Help and support
      if (text.includes('help') || text.includes('support') || text.includes('commands')) {
        return '🤖 **Nexlinx Assistant Commands:**\n\n' +
               '• "attendance" - Check attendance info\n' +
               '• "leave" - Leave request guidance\n' +
               '• "status" - System status\n' +
               '• "contact" - Contact information\n' +
               '• "emergency" - Emergency contacts\n\n' +
               'For other assistance, contact your manager or HR department.';
      }

      // Attendance related queries
      if (text.includes('attendance') || text.includes('punch') || text.includes('time') || text.includes('late')) {
        return '🕐 **Attendance Information:**\n\n' +
               '• Use the Nexlinx mobile app for punch in/out\n' +
               '• Contact your supervisor for attendance issues\n' +
               '• Late arrivals should be reported immediately\n' +
               '• For attendance corrections, submit a request through proper channels';
      }

      // Leave requests
      if (text.includes('leave') || text.includes('holiday') || text.includes('vacation') || text.includes('sick')) {
        return '📅 **Leave Request Process:**\n\n' +
               '• Submit leave requests through the mobile app\n' +
               '• Ensure proper advance notice\n' +
               '• Emergency leave: Contact supervisor immediately\n' +
               '• Sick leave: Submit medical certificate if required';
      }

      // System status
      if (text.includes('status') || text.includes('working') || text.includes('system') || text.includes('online')) {
        return '✅ **System Status:**\n\n' +
               '• All systems operational\n' +
               '• WhatsApp service: Active\n' +
               '• Mobile app: Available\n' +
               '• For technical issues, contact IT support';
      }

      // Contact information
      if (text.includes('contact') || text.includes('phone') || text.includes('email') || text.includes('reach')) {
        return '📞 **Contact Information:**\n\n' +
               '• HR Department: Contact through official channels\n' +
               '• IT Support: Use internal helpdesk\n' +
               '• Emergency: Contact your immediate supervisor\n' +
               '• For urgent matters: Use designated emergency contacts';
      }

      // Emergency
      if (text.includes('emergency') || text.includes('urgent') || text.includes('immediate')) {
        return '🚨 **Emergency Contacts:**\n\n' +
               '• Immediate Supervisor: Contact directly\n' +
               '• Security: Use internal emergency number\n' +
               '• Medical Emergency: Call local emergency services\n' +
               '• For workplace emergencies: Follow company protocol';
      }

      // Thank you responses
      if (text.includes('thank') || text.includes('thanks') || text.includes('appreciate')) {
        return '😊 You\'re welcome! Happy to help. If you need anything else, just ask!';
      }

      // Default response for unrecognized messages
      if (text.length > 3) { // Only respond to meaningful messages
        return '🤖 I understand you need assistance, but I\'m not sure how to help with that specific request.\n\n' +
               'Type "help" to see available commands, or contact your supervisor for personalized assistance.';
      }

      return null; // No response for very short or unclear messages

    } catch (error) {
      console.error('[WhatsApp Chatbot] ❌ Error generating response:', error);
      return '⚠️ I\'m experiencing technical difficulties. Please try again later or contact your supervisor for assistance.';
    }
  }

  /**
   * Handle status updates for message delivery tracking
   */
  private async handleStatusUpdate(status: any): Promise<void> {
    try {
      console.log(`[WhatsApp Chatbot] 📊 Status update: ${status.status} for message ${status.id}`);
      
      // This could be used for delivery analytics
      // For now, just log the status
      
    } catch (error) {
      console.error('[WhatsApp Chatbot] ❌ Error handling status update:', error);
    }
  }

  /**
   * Get conversation history for a specific contact
   */
  getConversationHistory(phoneNumber: string): any[] {
    return this.conversationHistory.get(phoneNumber) || [];
  }

  /**
   * Clear conversation history for a specific contact
   */
  clearConversationHistory(phoneNumber: string): void {
    this.conversationHistory.delete(phoneNumber);
    console.log(`[WhatsApp Chatbot] 🗑️ Cleared conversation history for ${phoneNumber}`);
  }

  /**
   * Get chatbot service statistics
   */
  getStatistics(): any {
    return {
      isRunning: this.isRunning,
      responseCount: this.responseCount,
      activeConversations: this.conversationHistory.size,
      lastActivity: this.lastActivity,
      uptime: this.isRunning ? Math.floor((Date.now() - this.lastActivity.getTime()) / 1000) : 0
    };
  }

  /**
   * Check if service is running
   */
  isServiceRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get health status
   */
  getHealthStatus(): any {
    return {
      isRunning: this.isRunning,
      responseCount: this.responseCount,
      activeConversations: this.conversationHistory.size,
      lastActivity: this.lastActivity,
      memoryUsage: this.conversationHistory.size * 100 // Rough estimate
    };
  }
}

// Export singleton instance
export const whatsappChatbotService = new WhatsAppChatbotService();