import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { db } from '../db';
import { whatsappApiKeys, whatsappGatewayLogs } from '../../shared/whatsappSchema';
import { eq, and, desc, gte } from 'drizzle-orm';

export interface GatewayMessage {
  to: string;
  message: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document';
  metadata?: any;
}

export interface ApiKeyData {
  id: string;
  keyName: string;
  permissions: string[];
  rateLimit: number;
  isActive: boolean;
  createdBy: string;
  lastUsed?: string;
  usageCount: number;
}

export class WhatsAppGatewayService {
  private static instance: WhatsAppGatewayService;
  private rateLimitMap = new Map<string, { count: number; resetTime: number }>();

  public static getInstance(): WhatsAppGatewayService {
    if (!WhatsAppGatewayService.instance) {
      WhatsAppGatewayService.instance = new WhatsAppGatewayService();
    }
    return WhatsAppGatewayService.instance;
  }

  /**
   * Generate new API key for external applications
   */
  async generateApiKey(keyName: string, permissions: string[], rateLimit: number = 100, createdBy: string): Promise<string> {
    const apiKey = `whatsapp_${crypto.randomBytes(32).toString('hex')}`;
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');

    await db.insert(whatsappApiKeys).values({
      id: uuidv4(),
      keyName,
      hashedKey,
      permissions,
      rateLimit,
      isActive: true,
      createdBy,
      createdAt: new Date(),
      lastUsed: null,
      usageCount: 0
    });

    console.log(`[Gateway] Generated API key: ${keyName} for ${createdBy}`);
    return apiKey;
  }

  /**
   * Validate API key and check permissions
   */
  async validateApiKey(apiKey: string, requiredPermission: string): Promise<{ isValid: boolean; keyData?: any; error?: string }> {
    try {
      const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
      
      const [keyRecord] = await db
        .select()
        .from(whatsappApiKeys)
        .where(and(
          eq(whatsappApiKeys.hashedKey, hashedKey),
          eq(whatsappApiKeys.isActive, true)
        ));

      if (!keyRecord) {
        return { isValid: false, error: 'Invalid API key' };
      }

      // Check permissions
      if (!keyRecord.permissions.includes(requiredPermission) && !keyRecord.permissions.includes('*')) {
        return { isValid: false, error: 'Insufficient permissions' };
      }

      // Check rate limiting
      const rateCheck = this.checkRateLimit(keyRecord.id, keyRecord.rateLimit);
      if (!rateCheck.allowed) {
        return { isValid: false, error: `Rate limit exceeded. Try again in ${rateCheck.resetIn}s` };
      }

      // Update usage statistics
      await db.update(whatsappApiKeys)
        .set({
          lastUsed: new Date(),
          usageCount: keyRecord.usageCount + 1
        })
        .where(eq(whatsappApiKeys.id, keyRecord.id));

      return { isValid: true, keyData: keyRecord };
    } catch (error) {
      console.error('[Gateway] API key validation error:', error);
      return { isValid: false, error: 'Validation failed' };
    }
  }

  /**
   * Send message through gateway (API-based)
   */
  async sendGatewayMessage(apiKey: string, messageData: GatewayMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Validate API key
      const validation = await this.validateApiKey(apiKey, 'send_message');
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      // Log the request
      const logId = uuidv4();
      await db.insert(whatsappGatewayLogs).values({
        id: logId,
        apiKeyId: validation.keyData.id,
        endpoint: '/gateway/send',
        method: 'POST',
        requestData: messageData,
        timestamp: new Date(),
        success: false // Will update after processing
      });

      // Send message through WhatsApp service
      const whatsappService = await import('./whatsappService');
      const result = await whatsappService.sendMessage({
        to: messageData.to,
        content: messageData.message,
        messageType: messageData.type,
        source: 'gateway',
        metadata: {
          apiKeyId: validation.keyData.id,
          gatewayLogId: logId,
          ...messageData.metadata
        }
      });

      // Update log with result
      await db.update(whatsappGatewayLogs)
        .set({
          success: result.success,
          responseData: result,
          error: result.error || null
        })
        .where(eq(whatsappGatewayLogs.id, logId));

      if (result.success) {
        console.log(`[Gateway] Message sent successfully via API key: ${validation.keyData.keyName}`);
        return { success: true, messageId: result.messageId };
      } else {
        return { success: false, error: result.error || 'Failed to send message' };
      }

    } catch (error) {
      console.error('[Gateway] Send message error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Get gateway statistics
   */
  async getGatewayStats(): Promise<{
    apiKeysCount: number;
    messagesCount: number;
    successRate: number;
    topApiKeys: any[];
  }> {
    try {
      // Get total API keys
      const apiKeys = await db.select().from(whatsappApiKeys).where(eq(whatsappApiKeys.isActive, true));
      
      // Get today's messages
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayLogs = await db
        .select()
        .from(whatsappGatewayLogs)
        .where(gte(whatsappGatewayLogs.timestamp, today));

      const messagesCount = todayLogs.length;
      const successCount = todayLogs.filter(log => log.success).length;
      const successRate = messagesCount > 0 ? (successCount / messagesCount) * 100 : 0;

      // Get top API keys by usage
      const keyUsage = apiKeys
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 5)
        .map(key => ({
          keyName: key.keyName,
          usageCount: key.usageCount,
          lastUsed: key.lastUsed
        }));

      return {
        apiKeysCount: apiKeys.length,
        messagesCount,
        successRate: Math.round(successRate),
        topApiKeys: keyUsage
      };

    } catch (error) {
      console.error('[Gateway] Stats error:', error);
      return {
        apiKeysCount: 0,
        messagesCount: 0,
        successRate: 0,
        topApiKeys: []
      };
    }
  }

  /**
   * List API keys for admin
   */
  async listApiKeys(): Promise<ApiKeyData[]> {
    try {
      const keys = await db
        .select({
          id: whatsappApiKeys.id,
          keyName: whatsappApiKeys.keyName,
          permissions: whatsappApiKeys.permissions,
          rateLimit: whatsappApiKeys.rateLimit,
          isActive: whatsappApiKeys.isActive,
          createdBy: whatsappApiKeys.createdBy,
          lastUsed: whatsappApiKeys.lastUsed,
          usageCount: whatsappApiKeys.usageCount
        })
        .from(whatsappApiKeys)
        .orderBy(desc(whatsappApiKeys.createdAt));

      return keys.map(key => ({
        id: key.id,
        keyName: key.keyName,
        permissions: key.permissions,
        rateLimit: key.rateLimit,
        isActive: key.isActive,
        createdBy: key.createdBy,
        lastUsed: key.lastUsed?.toISOString(),
        usageCount: key.usageCount
      }));
    } catch (error) {
      console.error('[Gateway] List API keys error:', error);
      return [];
    }
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(keyId: string): Promise<boolean> {
    try {
      await db.update(whatsappApiKeys)
        .set({ isActive: false })
        .where(eq(whatsappApiKeys.id, keyId));
      
      console.log(`[Gateway] API key revoked: ${keyId}`);
      return true;
    } catch (error) {
      console.error('[Gateway] Revoke API key error:', error);
      return false;
    }
  }

  /**
   * Rate limiting check
   */
  private checkRateLimit(keyId: string, limit: number): { allowed: boolean; resetIn?: number } {
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hour window
    
    const current = this.rateLimitMap.get(keyId);
    
    if (!current || now > current.resetTime) {
      this.rateLimitMap.set(keyId, {
        count: 1,
        resetTime: now + windowMs
      });
      return { allowed: true };
    }

    if (current.count >= limit) {
      const resetIn = Math.ceil((current.resetTime - now) / 1000);
      return { allowed: false, resetIn };
    }

    current.count++;
    return { allowed: true };
  }

  /**
   * Get gateway logs for monitoring
   */
  async getGatewayLogs(limit: number = 100): Promise<any[]> {
    try {
      const logs = await db
        .select()
        .from(whatsappGatewayLogs)
        .orderBy(desc(whatsappGatewayLogs.timestamp))
        .limit(limit);

      return logs.map(log => ({
        id: log.id,
        endpoint: log.endpoint,
        method: log.method,
        success: log.success,
        timestamp: log.timestamp.toISOString(),
        error: log.error
      }));
    } catch (error) {
      console.error('[Gateway] Get logs error:', error);
      return [];
    }
  }

  /**
   * Health check for gateway service
   */
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const stats = await this.getGatewayStats();
      
      return {
        status: 'healthy',
        details: {
          activeApiKeys: stats.apiKeysCount,
          todayMessages: stats.messagesCount,
          successRate: `${stats.successRate}%`,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error.message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }
}

export const gatewayService = WhatsAppGatewayService.getInstance();