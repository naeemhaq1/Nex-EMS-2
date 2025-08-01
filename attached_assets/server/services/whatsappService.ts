import axios, { AxiosInstance } from 'axios';
import { storage } from '../storage';
import { db } from '../db';
import { whatsappMessages } from '@shared/schema';

export interface WhatsAppMessage {
  to: string;
  type: 'text' | 'template';
  text?: {
    body: string;
  };
  template?: {
    name: string;
    language: {
      code: string;
    };
    components?: any[];
  };
}

export interface MessageDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
  recipientPhone: string;
  recipientName?: string;
}

export class WhatsAppService {
  private client: AxiosInstance;
  private enabled: boolean = false;
  private accessToken: string = '';
  private phoneNumberId: string = '';
  private businessId: string = '';

  constructor() {
    this.reloadConfig();
  }

  public reloadConfig() {
    // ⚠️  AI WARNING: DO NOT modify this to use Replit Secrets
    // ⚠️  User has multiple projects with different WhatsApp accounts - keep secrets EMPTY
    
    // Force reload configuration from environment (.env file only)
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.businessId = process.env.WHATSAPP_BUSINESS_ID || '';
    
    // Check if service should be enabled
    this.enabled = !!(this.accessToken && this.phoneNumberId && this.businessId);
    
    console.log(`[WhatsApp] 🔄 Config reloaded - Token: ${this.accessToken.substring(0, 20)}..., Phone: ${this.phoneNumberId}, Enabled: ${this.enabled}`);

    this.client = axios.create({
      baseURL: 'https://graph.facebook.com/v23.0',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  public async sendMessage(message: WhatsAppMessage): Promise<MessageDeliveryResult> {
    const recipientPhone = message.to;
    
    try {
      if (!this.enabled) {
        console.log(`[WhatsApp Send] 📤 Queuing message - credentials missing`);
        
        // Store queued message in database with proper from_number
        const fromNumber = this.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || 'NOT_CONFIGURED';
        console.log(`[WhatsApp Send] 💾 Storing queued message with fromNumber: ${fromNumber}`);
        
        await db.insert(whatsappMessages).values({
          fromNumber: fromNumber,
          toNumber: recipientPhone,
          messageType: 'outgoing',
          messageContent: message.text?.body || 'Template message',
          messageStatus: 'failed',
          failedAt: new Date(),
          errorDetails: 'Missing WhatsApp API credentials'
        });

        return {
          success: false,
          error: 'Message queued - WhatsApp credentials not configured',
          recipientPhone
        };
      }

      console.log(`[WhatsApp Send] 📤 Sending ${message.type} message to ${recipientPhone}`);

      const response = await this.client.post(`/${this.phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        to: recipientPhone,
        type: message.type,
        ...(message.type === 'text' ? { text: message.text } : { template: message.template })
      });

      const messageId = response.data.messages[0].id;
      console.log(`[WhatsApp Send] ✅ Message sent successfully: ${messageId}`);

      // Store successful message in database
      await db.insert(whatsappMessages).values({
        messageId,
        fromNumber: this.phoneNumberId,
        toNumber: recipientPhone,
        messageType: 'outgoing',
        messageContent: message.text?.body || 'Template message',
        messageStatus: 'sent',
        sentAt: new Date(),
        errorDetails: null
      });

      return {
        success: true,
        messageId,
        recipientPhone
      };

    } catch (error: any) {
      const errorMessage = error?.response?.data?.error?.message || error.message || 'Unknown error';
      console.log(`[WhatsApp Send] ❌ Error: ${errorMessage}`);

      try {
        // Store failed message in database with proper from_number
        const fromNumber = this.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || 'NOT_CONFIGURED';
        console.log(`[WhatsApp Send] 💾 Storing failed message with fromNumber: ${fromNumber}`);
        
        await db.insert(whatsappMessages).values({
          fromNumber: fromNumber,
          toNumber: recipientPhone,
          messageType: 'outgoing',
          messageContent: message.text?.body || 'Template message',
          messageStatus: 'failed',
          failedAt: new Date(),
          errorDetails: errorMessage
        });
      } catch (dbError: any) {
        console.log(`[WhatsApp Send] ❌ Database error: ${dbError.message}`);
      }

      return {
        success: false,
        error: errorMessage,
        recipientPhone
      };
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public getStatus(): string {
    return this.enabled ? 'enabled' : 'disabled';
  }
}

// Export singleton instance
export const whatsappService = new WhatsAppService();