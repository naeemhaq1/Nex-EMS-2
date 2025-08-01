import { db } from "../db";
import { 
  notificationRecipients, 
  notificationDeliveryLog, 
  notificationTemplates,
  systemAlerts,
  InsertNotificationRecipient,
  InsertNotificationDeliveryLog,
  InsertNotificationTemplate
} from "@shared/schema";
import { eq, and, desc, inArray, or } from "drizzle-orm";
import { EventEmitter } from 'events';
import { formatInSystemTimezone } from "../config/timezone";

export interface NotificationData {
  alertId?: number;
  alertType: string;
  severity: string;
  title: string;
  message: string;
  source: string;
  metadata?: any;
}

export interface DeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
  responseData?: any;
}

export class NotificationService extends EventEmitter {
  private isRunning = false;
  private retryInterval: NodeJS.Timeout | null = null;
  private readonly RETRY_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    super();
  }

  async start() {
    if (this.isRunning) {
      console.log('[NotificationService] Service already running');
      return;
    }

    this.isRunning = true;
    console.log('[NotificationService] 📧 Starting notification service...');

    // Initialize default templates
    await this.initializeDefaultTemplates();

    // Start retry job for failed notifications
    this.retryInterval = setInterval(() => {
      this.retryFailedNotifications();
    }, this.RETRY_INTERVAL);

    // Emit activity for watchdog
    this.emit('activity', { type: 'service_started', timestamp: new Date() });

    console.log('[NotificationService] Service started successfully');
  }

  async stop() {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }

    this.isRunning = false;
    console.log('[NotificationService] Service stopped');
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      retryInterval: this.RETRY_INTERVAL,
      lastActivity: new Date().toISOString()
    };
  }

  // Add notification recipient
  async addRecipient(recipientData: InsertNotificationRecipient): Promise<number> {
    try {
      const [newRecipient] = await db
        .insert(notificationRecipients)
        .values({
          ...recipientData,
          isActive: true,
          isVerified: false,
          updatedAt: new Date()
        })
        .returning({ id: notificationRecipients.id });

      console.log(`[NotificationService] ✅ Added recipient: ${newRecipient.id} - ${recipientData.recipientValue}`);
      return newRecipient.id;

    } catch (error) {
      console.error('[NotificationService] ❌ Error adding recipient:', error);
      throw error;
    }
  }

  // Get all recipients with filtering
  async getRecipients(filters: {
    recipientType?: string;
    department?: string;
    isActive?: boolean;
    isVerified?: boolean;
  } = {}) {
    try {
      let query = db.select().from(notificationRecipients);

      const conditions = [];

      if (filters.recipientType) {
        conditions.push(eq(notificationRecipients.recipientType, filters.recipientType));
      }

      if (filters.department) {
        conditions.push(eq(notificationRecipients.department, filters.department));
      }

      if (filters.isActive !== undefined) {
        conditions.push(eq(notificationRecipients.isActive, filters.isActive));
      }

      if (filters.isVerified !== undefined) {
        conditions.push(eq(notificationRecipients.isVerified, filters.isVerified));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const recipients = await query.orderBy(desc(notificationRecipients.createdAt));
      return recipients;

    } catch (error) {
      console.error('[NotificationService] ❌ Error fetching recipients:', error);
      throw error;
    }
  }

  // Update recipient
  async updateRecipient(id: number, updates: Partial<InsertNotificationRecipient>) {
    try {
      await db
        .update(notificationRecipients)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(notificationRecipients.id, id));

      console.log(`[NotificationService] ✅ Updated recipient: ${id}`);

    } catch (error) {
      console.error('[NotificationService] ❌ Error updating recipient:', error);
      throw error;
    }
  }

  // Delete recipient
  async deleteRecipient(id: number) {
    try {
      await db
        .delete(notificationRecipients)
        .where(eq(notificationRecipients.id, id));

      console.log(`[NotificationService] ✅ Deleted recipient: ${id}`);

    } catch (error) {
      console.error('[NotificationService] ❌ Error deleting recipient:', error);
      throw error;
    }
  }

  // Verify recipient (for email verification, SMS confirmation, etc.)
  async verifyRecipient(id: number) {
    try {
      await db
        .update(notificationRecipients)
        .set({
          isVerified: true,
          verifiedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(notificationRecipients.id, id));

      console.log(`[NotificationService] ✅ Verified recipient: ${id}`);

    } catch (error) {
      console.error('[NotificationService] ❌ Error verifying recipient:', error);
      throw error;
    }
  }

  // Send notifications for an alert
  async sendNotificationsForAlert(notificationData: NotificationData) {
    try {
      // Get recipients who should receive this alert
      const recipients = await this.getRecipientsForAlert(notificationData);

      if (recipients.length === 0) {
        console.log('[NotificationService] No recipients found for alert');
        return;
      }

      console.log(`[NotificationService] Sending notifications to ${recipients.length} recipients`);

      // Send notifications to each recipient
      for (const recipient of recipients) {
        for (const method of recipient.notificationMethods || []) {
          await this.sendNotification(recipient, method, notificationData);
        }
      }

    } catch (error) {
      console.error('[NotificationService] ❌ Error sending notifications:', error);
    }
  }

  // Get recipients for specific alert
  private async getRecipientsForAlert(notificationData: NotificationData) {
    try {
      const recipients = await db
        .select()
        .from(notificationRecipients)
        .where(
          and(
            eq(notificationRecipients.isActive, true),
            eq(notificationRecipients.isVerified, true),
            or(
              // Check if alert type is in their alert types array
              inArray(notificationData.alertType, notificationRecipients.alertTypes),
              // Or if they have no specific alert types (receive all)
              eq(notificationRecipients.alertTypes, null)
            ),
            or(
              // Check if severity is in their severity levels array
              inArray(notificationData.severity, notificationRecipients.severityLevels),
              // Or if they have no specific severity levels (receive all)
              eq(notificationRecipients.severityLevels, null)
            )
          )
        );

      return recipients;

    } catch (error) {
      console.error('[NotificationService] ❌ Error getting recipients for alert:', error);
      return [];
    }
  }

  // Send individual notification
  private async sendNotification(
    recipient: any,
    method: string,
    notificationData: NotificationData
  ) {
    try {
      // Create delivery log entry
      const [logEntry] = await db
        .insert(notificationDeliveryLog)
        .values({
          alertId: notificationData.alertId,
          recipientId: recipient.id,
          deliveryMethod: method,
          deliveryStatus: 'pending',
          deliveryAttempts: 0,
          lastAttemptAt: new Date(),
          updatedAt: new Date()
        })
        .returning({ id: notificationDeliveryLog.id });

      let result: DeliveryResult;

      // Send notification based on method
      switch (method) {
        case 'email':
          result = await this.sendEmailNotification(recipient, notificationData);
          break;
        case 'sms':
          result = await this.sendSMSNotification(recipient, notificationData);
          break;
        case 'whatsapp':
          result = await this.sendWhatsAppNotification(recipient, notificationData);
          break;
        default:
          result = { success: false, error: `Unsupported notification method: ${method}` };
      }

      // Update delivery log
      await db
        .update(notificationDeliveryLog)
        .set({
          deliveryStatus: result.success ? 'sent' : 'failed',
          deliveryAttempts: 1,
          deliveredAt: result.success ? new Date() : null,
          failureReason: result.error || null,
          responseData: result.responseData || null,
          updatedAt: new Date()
        })
        .where(eq(notificationDeliveryLog.id, logEntry.id));

      if (result.success) {
        console.log(`[NotificationService] ✅ Sent ${method} notification to ${recipient.recipientValue}`);
      } else {
        console.error(`[NotificationService] ❌ Failed to send ${method} notification to ${recipient.recipientValue}: ${result.error}`);
      }

    } catch (error) {
      console.error('[NotificationService] ❌ Error sending notification:', error);
    }
  }

  // Email notification sender
  private async sendEmailNotification(recipient: any, notificationData: NotificationData): Promise<DeliveryResult> {
    try {
      // Get email template
      const template = await this.getTemplate('email', notificationData.alertType, notificationData.severity);
      
      if (!template) {
        return { success: false, error: 'No email template found' };
      }

      // Render template
      const subject = this.renderTemplate(template.subject || template.bodyTemplate, notificationData);
      const body = this.renderTemplate(template.bodyTemplate, notificationData);

      // Send email using your preferred email service
      // This is a placeholder - implement with your actual email service
      console.log(`[NotificationService] 📧 Sending email to ${recipient.recipientValue}`);
      console.log(`Subject: ${subject}`);
      console.log(`Body: ${body}`);

      // For now, simulate successful delivery
      return { 
        success: true, 
        messageId: `email_${Date.now()}`,
        responseData: { service: 'email', timestamp: new Date() }
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // SMS notification sender
  private async sendSMSNotification(recipient: any, notificationData: NotificationData): Promise<DeliveryResult> {
    try {
      // Get SMS template
      const template = await this.getTemplate('sms', notificationData.alertType, notificationData.severity);
      
      if (!template) {
        return { success: false, error: 'No SMS template found' };
      }

      // Render template
      const message = this.renderTemplate(template.bodyTemplate, notificationData);

      // Send SMS using your preferred SMS service
      // This is a placeholder - implement with your actual SMS service
      console.log(`[NotificationService] 📱 Sending SMS to ${recipient.recipientValue}`);
      console.log(`Message: ${message}`);

      // For now, simulate successful delivery
      return { 
        success: true, 
        messageId: `sms_${Date.now()}`,
        responseData: { service: 'sms', timestamp: new Date() }
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // WhatsApp notification sender
  private async sendWhatsAppNotification(recipient: any, notificationData: NotificationData): Promise<DeliveryResult> {
    try {
      // Get WhatsApp template
      const template = await this.getTemplate('whatsapp', notificationData.alertType, notificationData.severity);
      
      if (!template) {
        return { success: false, error: 'No WhatsApp template found' };
      }

      // Render template
      const message = this.renderTemplate(template.bodyTemplate, notificationData);

      // Send WhatsApp message using your WhatsApp service
      // This is a placeholder - implement with your actual WhatsApp service
      console.log(`[NotificationService] 💬 Sending WhatsApp to ${recipient.recipientValue}`);
      console.log(`Message: ${message}`);

      // For now, simulate successful delivery
      return { 
        success: true, 
        messageId: `whatsapp_${Date.now()}`,
        responseData: { service: 'whatsapp', timestamp: new Date() }
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get notification template
  private async getTemplate(templateType: string, alertType: string, severity: string) {
    try {
      const [template] = await db
        .select()
        .from(notificationTemplates)
        .where(
          and(
            eq(notificationTemplates.templateType, templateType),
            eq(notificationTemplates.alertType, alertType),
            eq(notificationTemplates.severity, severity),
            eq(notificationTemplates.isActive, true)
          )
        )
        .limit(1);

      return template;

    } catch (error) {
      console.error('[NotificationService] ❌ Error getting template:', error);
      return null;
    }
  }

  // Render template with data
  private renderTemplate(template: string, data: NotificationData): string {
    let rendered = template;

    // Replace placeholders with actual data
    rendered = rendered.replace(/\{\{title\}\}/g, data.title);
    rendered = rendered.replace(/\{\{message\}\}/g, data.message);
    rendered = rendered.replace(/\{\{source\}\}/g, data.source);
    rendered = rendered.replace(/\{\{severity\}\}/g, data.severity);
    rendered = rendered.replace(/\{\{alertType\}\}/g, data.alertType);
    rendered = rendered.replace(/\{\{timestamp\}\}/g, formatInSystemTimezone(new Date()));

    // Replace metadata placeholders if metadata exists
    if (data.metadata) {
      for (const [key, value] of Object.entries(data.metadata)) {
        rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
      }
    }

    return rendered;
  }

  // Retry failed notifications
  private async retryFailedNotifications() {
    try {
      this.emit('activity', { type: 'retry_start', timestamp: new Date() });

      // Get failed notifications from last 24 hours
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const failedNotifications = await db
        .select()
        .from(notificationDeliveryLog)
        .where(
          and(
            eq(notificationDeliveryLog.deliveryStatus, 'failed'),
            // lte(notificationDeliveryLog.deliveryAttempts, 3) // Max 3 attempts
          )
        )
        .limit(10); // Process max 10 at a time

      for (const notification of failedNotifications) {
        // Retry logic would go here
        console.log(`[NotificationService] 🔄 Retrying failed notification ${notification.id}`);
      }

      this.emit('activity', { type: 'retry_completed', timestamp: new Date() });

    } catch (error) {
      console.error('[NotificationService] ❌ Retry failed notifications error:', error);
    }
  }

  // Initialize default templates
  private async initializeDefaultTemplates() {
    try {
      const defaultTemplates = [
        {
          templateName: 'email_service_failure_critical',
          templateType: 'email',
          alertType: 'service_failure',
          severity: 'critical',
          subject: 'CRITICAL: {{title}}',
          bodyTemplate: `
CRITICAL ALERT: {{title}}

Message: {{message}}
Source: {{source}}
Severity: {{severity}}
Timestamp: {{timestamp}}

Please investigate immediately.

This is an automated message from Nexlinx EMS.
          `.trim()
        },
        {
          templateName: 'sms_service_failure_critical',
          templateType: 'sms',
          alertType: 'service_failure',
          severity: 'critical',
          bodyTemplate: 'CRITICAL: {{title}} - {{message}} Source: {{source}} Time: {{timestamp}}'
        },
        {
          templateName: 'whatsapp_service_failure_critical',
          templateType: 'whatsapp',
          alertType: 'service_failure',
          severity: 'critical',
          bodyTemplate: `🚨 *CRITICAL ALERT*

*{{title}}*

{{message}}

📍 Source: {{source}}
⏰ Time: {{timestamp}}

Please investigate immediately.`
        }
      ];

      for (const template of defaultTemplates) {
        try {
          await db
            .insert(notificationTemplates)
            .values(template)
            .onConflictDoNothing();
        } catch (error) {
          // Template already exists, skip
        }
      }

    } catch (error) {
      console.error('[NotificationService] ❌ Error initializing templates:', error);
    }
  }

  // Get delivery statistics
  async getDeliveryStats(dateFrom?: Date, dateTo?: Date) {
    try {
      const conditions = [];
      
      if (dateFrom) {
        conditions.push(`created_at >= '${dateFrom.toISOString()}'`);
      }
      
      if (dateTo) {
        conditions.push(`created_at <= '${dateTo.toISOString()}'`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // This would need to be implemented with proper SQL queries
      // For now, return mock data
      return {
        totalSent: 0,
        totalFailed: 0,
        totalDelivered: 0,
        byMethod: {},
        byStatus: {}
      };

    } catch (error) {
      console.error('[NotificationService] ❌ Error getting delivery stats:', error);
      return null;
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();