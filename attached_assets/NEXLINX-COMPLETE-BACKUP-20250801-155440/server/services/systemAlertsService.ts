import { db } from "../db";
import { systemAlerts, systemAlertActions, systemAlertSubscriptions, systemAlertTemplates, users } from "@shared/schema";
import { eq, and, desc, gte, lte, inArray, or, sql } from "drizzle-orm";
import { EventEmitter } from 'events';
import { formatInSystemTimezone } from "../config/timezone";
import { notificationService } from "./notificationService.js";

export interface AlertFilter {
  alertTypes?: string[];
  severityLevels?: string[];
  statuses?: string[];
  sources?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  searchTerm?: string;
}

export interface CreateAlertData {
  alertType: string;
  severity: string;
  title: string;
  message: string;
  source: string;
  metadata?: any;
  affectedServices?: string[];
  estimatedImpact?: string;
  troubleshootingSteps?: string[];
}

export interface AlertStats {
  totalActive: number;
  totalResolved: number;
  totalByType: Record<string, number>;
  totalBySeverity: Record<string, number>;
  totalByStatus: Record<string, number>;
  recentTrends: {
    date: string;
    count: number;
    resolved: number;
  }[];
}

export class SystemAlertsService extends EventEmitter {
  private isRunning = false;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private escalationInterval: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
  private readonly ESCALATION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    super();
  }

  async start() {
    if (this.isRunning) {
      console.log('[SystemAlerts] Service already running');
      return;
    }

    this.isRunning = true;
    console.log('[SystemAlerts] 🚨 Starting system alerts service...');

    // Initialize default alert templates
    await this.initializeDefaultTemplates();

    // Start cleanup job
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.CLEANUP_INTERVAL);

    // Start escalation job
    this.escalationInterval = setInterval(() => {
      this.checkEscalations();
    }, this.ESCALATION_CHECK_INTERVAL);

    // Emit activity for watchdog
    this.emit('activity', { type: 'service_started', timestamp: new Date() });

    console.log('[SystemAlerts] Service started successfully');
  }

  async stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.escalationInterval) {
      clearInterval(this.escalationInterval);
      this.escalationInterval = null;
    }

    this.isRunning = false;
    console.log('[SystemAlerts] Service stopped');
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      cleanupInterval: this.CLEANUP_INTERVAL,
      escalationCheckInterval: this.ESCALATION_CHECK_INTERVAL,
      lastActivity: new Date().toISOString()
    };
  }

  // Create a new alert
  async createAlert(alertData: CreateAlertData, userId?: number): Promise<number> {
    try {
      const [newAlert] = await db
        .insert(systemAlerts)
        .values({
          ...alertData,
          status: 'active',
          escalationLevel: 1,
          notificationsSent: false,
        })
        .returning({ id: systemAlerts.id });

      // Log the creation action
      await this.logAction(newAlert.id, 'created', userId, { originalData: alertData });

      // Emit event for real-time updates
      this.emit('alertCreated', { alertId: newAlert.id, alertData });

      // Send notifications to subscribers via notification service
      await notificationService.sendNotificationsForAlert({
        alertId: newAlert.id,
        alertType: alertData.alertType,
        severity: alertData.severity,
        title: alertData.title,
        message: alertData.message,
        source: alertData.source,
        metadata: alertData.metadata
      });

      console.log(`[SystemAlerts] ✅ Alert created: ${newAlert.id} - ${alertData.title}`);
      return newAlert.id;

    } catch (error) {
      console.error('[SystemAlerts] ❌ Error creating alert:', error);
      throw error;
    }
  }

  // Get alerts with filtering
  async getAlerts(filters: AlertFilter = {}, limit: number = 50, offset: number = 0) {
    try {
      let query = db
        .select({
          id: systemAlerts.id,
          alertType: systemAlerts.alertType,
          severity: systemAlerts.severity,
          title: systemAlerts.title,
          message: systemAlerts.message,
          source: systemAlerts.source,
          status: systemAlerts.status,
          acknowledgedBy: systemAlerts.acknowledgedBy,
          acknowledgedAt: systemAlerts.acknowledgedAt,
          resolvedBy: systemAlerts.resolvedBy,
          resolvedAt: systemAlerts.resolvedAt,
          resolvedNotes: systemAlerts.resolvedNotes,
          metadata: systemAlerts.metadata,
          affectedServices: systemAlerts.affectedServices,
          estimatedImpact: systemAlerts.estimatedImpact,
          troubleshootingSteps: systemAlerts.troubleshootingSteps,
          escalationLevel: systemAlerts.escalationLevel,
          createdAt: systemAlerts.createdAt,
          updatedAt: systemAlerts.updatedAt,
          acknowledgedByUser: users.username,
          resolvedByUser: users.username,
        })
        .from(systemAlerts)
        .leftJoin(users, eq(systemAlerts.acknowledgedBy, users.id))
        .leftJoin(users, eq(systemAlerts.resolvedBy, users.id));

      // Apply filters
      const conditions = [];

      if (filters.alertTypes?.length) {
        conditions.push(inArray(systemAlerts.alertType, filters.alertTypes));
      }

      if (filters.severityLevels?.length) {
        conditions.push(inArray(systemAlerts.severity, filters.severityLevels));
      }

      if (filters.statuses?.length) {
        conditions.push(inArray(systemAlerts.status, filters.statuses));
      }

      if (filters.sources?.length) {
        conditions.push(inArray(systemAlerts.source, filters.sources));
      }

      if (filters.dateFrom) {
        conditions.push(gte(systemAlerts.createdAt, filters.dateFrom));
      }

      if (filters.dateTo) {
        conditions.push(lte(systemAlerts.createdAt, filters.dateTo));
      }

      if (filters.searchTerm) {
        conditions.push(
          or(
            sql`${systemAlerts.title} ILIKE ${`%${filters.searchTerm}%`}`,
            sql`${systemAlerts.message} ILIKE ${`%${filters.searchTerm}%`}`,
            sql`${systemAlerts.source} ILIKE ${`%${filters.searchTerm}%`}`
          )
        );
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const results = await query
        .orderBy(desc(systemAlerts.createdAt))
        .limit(limit)
        .offset(offset);

      return results;

    } catch (error) {
      console.error('[SystemAlerts] ❌ Error fetching alerts:', error);
      throw error;
    }
  }

  // Get alert statistics
  async getAlertStats(dateFrom?: Date, dateTo?: Date): Promise<AlertStats> {
    try {
      const conditions = [];
      
      if (dateFrom) {
        conditions.push(gte(systemAlerts.createdAt, dateFrom));
      }
      
      if (dateTo) {
        conditions.push(lte(systemAlerts.createdAt, dateTo));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get basic counts
      const [totalActive] = await db
        .select({ count: sql<number>`count(*)` })
        .from(systemAlerts)
        .where(whereClause ? and(whereClause, eq(systemAlerts.status, 'active')) : eq(systemAlerts.status, 'active'));

      const [totalResolved] = await db
        .select({ count: sql<number>`count(*)` })
        .from(systemAlerts)
        .where(whereClause ? and(whereClause, eq(systemAlerts.status, 'resolved')) : eq(systemAlerts.status, 'resolved'));

      // Get counts by type
      const byType = await db
        .select({
          alertType: systemAlerts.alertType,
          count: sql<number>`count(*)`
        })
        .from(systemAlerts)
        .where(whereClause)
        .groupBy(systemAlerts.alertType);

      // Get counts by severity
      const bySeverity = await db
        .select({
          severity: systemAlerts.severity,
          count: sql<number>`count(*)`
        })
        .from(systemAlerts)
        .where(whereClause)
        .groupBy(systemAlerts.severity);

      // Get counts by status
      const byStatus = await db
        .select({
          status: systemAlerts.status,
          count: sql<number>`count(*)`
        })
        .from(systemAlerts)
        .where(whereClause)
        .groupBy(systemAlerts.status);

      // Get recent trends (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const trends = await db
        .select({
          date: sql<string>`DATE(${systemAlerts.createdAt})`,
          count: sql<number>`count(*)`,
          resolved: sql<number>`count(CASE WHEN ${systemAlerts.status} = 'resolved' THEN 1 END)`
        })
        .from(systemAlerts)
        .where(gte(systemAlerts.createdAt, sevenDaysAgo))
        .groupBy(sql`DATE(${systemAlerts.createdAt})`)
        .orderBy(sql`DATE(${systemAlerts.createdAt})`);

      return {
        totalActive: totalActive.count,
        totalResolved: totalResolved.count,
        totalByType: byType.reduce((acc, item) => ({ ...acc, [item.alertType]: item.count }), {}),
        totalBySeverity: bySeverity.reduce((acc, item) => ({ ...acc, [item.severity]: item.count }), {}),
        totalByStatus: byStatus.reduce((acc, item) => ({ ...acc, [item.status]: item.count }), {}),
        recentTrends: trends
      };

    } catch (error) {
      console.error('[SystemAlerts] ❌ Error getting alert stats:', error);
      throw error;
    }
  }

  // Acknowledge an alert
  async acknowledgeAlert(alertId: number, userId: number, notes?: string) {
    try {
      await db
        .update(systemAlerts)
        .set({
          status: 'acknowledged',
          acknowledgedBy: userId,
          acknowledgedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(systemAlerts.id, alertId));

      await this.logAction(alertId, 'acknowledged', userId, { notes });

      this.emit('alertAcknowledged', { alertId, userId, notes });

      console.log(`[SystemAlerts] ✅ Alert acknowledged: ${alertId} by user ${userId}`);

    } catch (error) {
      console.error('[SystemAlerts] ❌ Error acknowledging alert:', error);
      throw error;
    }
  }

  // Resolve an alert
  async resolveAlert(alertId: number, userId: number, notes: string) {
    try {
      await db
        .update(systemAlerts)
        .set({
          status: 'resolved',
          resolvedBy: userId,
          resolvedAt: new Date(),
          resolvedNotes: notes,
          updatedAt: new Date()
        })
        .where(eq(systemAlerts.id, alertId));

      await this.logAction(alertId, 'resolved', userId, { notes });

      this.emit('alertResolved', { alertId, userId, notes });

      console.log(`[SystemAlerts] ✅ Alert resolved: ${alertId} by user ${userId}`);

    } catch (error) {
      console.error('[SystemAlerts] ❌ Error resolving alert:', error);
      throw error;
    }
  }

  // Get active alerts count
  async getActiveAlertsCount(): Promise<number> {
    try {
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(systemAlerts)
        .where(eq(systemAlerts.status, 'active'));

      return result.count;
    } catch (error) {
      console.error('[SystemAlerts] ❌ Error getting active alerts count:', error);
      return 0;
    }
  }

  // Get critical alerts
  async getCriticalAlerts() {
    try {
      return await db
        .select()
        .from(systemAlerts)
        .where(
          and(
            eq(systemAlerts.severity, 'critical'),
            eq(systemAlerts.status, 'active')
          )
        )
        .orderBy(desc(systemAlerts.createdAt));
    } catch (error) {
      console.error('[SystemAlerts] ❌ Error getting critical alerts:', error);
      return [];
    }
  }

  // Private helper methods
  private async logAction(alertId: number, actionType: string, userId?: number, actionData?: any) {
    try {
      await db
        .insert(systemAlertActions)
        .values({
          alertId,
          actionType,
          performedBy: userId || null,
          actionData,
          createdAt: new Date()
        });
    } catch (error) {
      console.error('[SystemAlerts] ❌ Error logging action:', error);
    }
  }

  private async sendNotifications(alertId: number, alertData: CreateAlertData) {
    try {
      // Get subscribers for this alert type and severity
      const subscribers = await db
        .select()
        .from(systemAlertSubscriptions)
        .where(
          and(
            eq(systemAlertSubscriptions.isActive, true),
            sql`${alertData.alertType} = ANY(${systemAlertSubscriptions.alertTypes})`,
            sql`${alertData.severity} = ANY(${systemAlertSubscriptions.severityLevels})`
          )
        );

      // Send notifications (placeholder for actual implementation)
      for (const subscriber of subscribers) {
        this.emit('notificationRequired', {
          userId: subscriber.userId,
          alertId,
          alertData,
          methods: subscriber.notificationMethods
        });
      }

      // Mark notifications as sent
      await db
        .update(systemAlerts)
        .set({ notificationsSent: true })
        .where(eq(systemAlerts.id, alertId));

    } catch (error) {
      console.error('[SystemAlerts] ❌ Error sending notifications:', error);
    }
  }

  private async performCleanup() {
    try {
      this.emit('activity', { type: 'cleanup_start', timestamp: new Date() });

      // Auto-resolve old alerts based on templates
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const oldAlerts = await db
        .select()
        .from(systemAlerts)
        .where(
          and(
            eq(systemAlerts.status, 'active'),
            lte(systemAlerts.createdAt, thirtyDaysAgo)
          )
        );

      for (const alert of oldAlerts) {
        await db
          .update(systemAlerts)
          .set({
            status: 'resolved',
            autoResolved: true,
            resolvedAt: new Date(),
            resolvedNotes: 'Auto-resolved due to age (30+ days)',
            updatedAt: new Date()
          })
          .where(eq(systemAlerts.id, alert.id));

        await this.logAction(alert.id, 'resolved', null, { autoResolved: true });
      }

      if (oldAlerts.length > 0) {
        console.log(`[SystemAlerts] 🧹 Auto-resolved ${oldAlerts.length} old alerts`);
      }

      this.emit('activity', { type: 'cleanup_completed', timestamp: new Date() });

    } catch (error) {
      console.error('[SystemAlerts] ❌ Cleanup error:', error);
    }
  }

  private async checkEscalations() {
    try {
      // Check for alerts that need escalation
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const alertsToEscalate = await db
        .select()
        .from(systemAlerts)
        .where(
          and(
            eq(systemAlerts.status, 'active'),
            eq(systemAlerts.escalationLevel, 1),
            lte(systemAlerts.createdAt, oneHourAgo)
          )
        );

      for (const alert of alertsToEscalate) {
        await db
          .update(systemAlerts)
          .set({
            escalationLevel: 2,
            updatedAt: new Date()
          })
          .where(eq(systemAlerts.id, alert.id));

        await this.logAction(alert.id, 'escalated', null, { escalationLevel: 2 });

        this.emit('alertEscalated', { alertId: alert.id, level: 2 });
      }

      if (alertsToEscalate.length > 0) {
        console.log(`[SystemAlerts] 📈 Escalated ${alertsToEscalate.length} alerts`);
      }

    } catch (error) {
      console.error('[SystemAlerts] ❌ Escalation check error:', error);
    }
  }

  private async initializeDefaultTemplates() {
    try {
      const defaultTemplates = [
        {
          templateName: 'service_failure',
          alertType: 'service_failure',
          severity: 'critical',
          titleTemplate: 'Service Failure: {{serviceName}}',
          messageTemplate: 'Service {{serviceName}} has failed. Error: {{error}}',
          troubleshootingSteps: [
            'Check service logs for error details',
            'Verify service configuration',
            'Restart the service if necessary',
            'Check resource availability'
          ],
          autoResolveAfterMinutes: 60,
          escalationRules: { escalateAfterMinutes: 15 }
        },
        {
          templateName: 'high_resource_usage',
          alertType: 'high_resource_usage',
          severity: 'high',
          titleTemplate: 'High Resource Usage: {{resourceType}}',
          messageTemplate: '{{resourceType}} usage is at {{percentage}}% - above threshold',
          troubleshootingSteps: [
            'Check which processes are consuming resources',
            'Kill unnecessary processes',
            'Scale services if needed',
            'Monitor resource trends'
          ],
          autoResolveAfterMinutes: 30,
          escalationRules: { escalateAfterMinutes: 30 }
        },
        {
          templateName: 'data_sync_error',
          alertType: 'data_sync_error',
          severity: 'medium',
          titleTemplate: 'Data Sync Error: {{syncType}}',
          messageTemplate: 'Data synchronization failed for {{syncType}}. Error: {{error}}',
          troubleshootingSteps: [
            'Check network connectivity',
            'Verify API credentials',
            'Check data source availability',
            'Retry synchronization manually'
          ],
          autoResolveAfterMinutes: 120,
          escalationRules: { escalateAfterMinutes: 60 }
        }
      ];

      for (const template of defaultTemplates) {
        try {
          await db
            .insert(systemAlertTemplates)
            .values(template)
            .onConflictDoNothing();
        } catch (error) {
          // Template already exists, skip
        }
      }

    } catch (error) {
      console.error('[SystemAlerts] ❌ Error initializing templates:', error);
    }
  }
}

// Export singleton instance
export const systemAlertsService = new SystemAlertsService();