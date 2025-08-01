import { EventEmitter } from 'events';
import { db } from '../db';
import { biotimeSyncData, attendanceRecords } from '../../shared/schema';
import { sql, and, gte, lte, eq } from 'drizzle-orm';
import { emailService } from './emailService';

interface AttendanceHealthMetrics {
    date: string;
    biotimeSyncRecords: number;
    attendanceProcessedRecords: number;
    unprocessedRecords: number;
    processingRate: number;
    lastBiotimeSync: Date | null;
    lastProcessedRecord: Date | null;
    hoursWithoutSync: number;
    hoursWithoutProcessing: number;
    isHealthy: boolean;
    issues: string[];
}

interface OutageAlert {
    severity: 'WARNING' | 'CRITICAL' | 'INFO';
    title: string;
    description: string;
    metrics: AttendanceHealthMetrics;
    recommendedActions: string[];
}

export class DailyAttendanceConfirmationService extends EventEmitter {
    private isRunning = false;
    private confirmationTimer: NodeJS.Timeout | null = null;
    private readonly EMAIL_RECIPIENT = 'naeemhaq1@gmail.com';
    
    // Health check thresholds
    private readonly THRESHOLDS = {
        MIN_EXPECTED_DAILY_RECORDS: 200,        // Minimum expected records per day
        MAX_UNPROCESSED_PERCENTAGE: 10,         // Max % of unprocessed records
        MAX_HOURS_WITHOUT_SYNC: 2,              // Alert if no BioTime sync for 2+ hours
        MAX_HOURS_WITHOUT_PROCESSING: 1,        // Alert if no processing for 1+ hours
        MIN_PROCESSING_RATE: 85,                // Minimum processing rate %
        CRITICAL_UNPROCESSED_COUNT: 500         // Critical threshold for unprocessed records
    };

    constructor() {
        super();
        this.scheduleDaily();
    }

    async start(): Promise<void> {
        if (this.isRunning) {
            console.log('[AttendanceConfirmation] Already running');
            return;
        }

        this.isRunning = true;
        console.log('[AttendanceConfirmation] 🚀 Starting daily attendance confirmation service...');
        
        // Schedule daily confirmation at 11:30 PM PKT (18:30 UTC)
        this.scheduleDaily();
        
        // Run initial health check
        await this.performDailyConfirmation();
        
        console.log('[AttendanceConfirmation] ✅ Daily confirmation service started');
        this.emit('serviceStarted');
    }

    async stop(): Promise<void> {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        if (this.confirmationTimer) {
            clearTimeout(this.confirmationTimer);
            this.confirmationTimer = null;
        }
        
        console.log('[AttendanceConfirmation] 🛑 Daily confirmation service stopped');
        this.emit('serviceStopped');
    }

    private scheduleDaily(): void {
        // Calculate next 11:30 PM PKT (18:30 UTC)
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        tomorrow.setUTCHours(18, 30, 0, 0); // 11:30 PM PKT
        
        const timeUntilNext = tomorrow.getTime() - now.getTime();
        
        console.log(`[AttendanceConfirmation] 📅 Next daily confirmation scheduled for ${tomorrow.toISOString()} (${Math.round(timeUntilNext/1000/60/60)} hours)`);
        
        this.confirmationTimer = setTimeout(async () => {
            await this.performDailyConfirmation();
            this.scheduleDaily(); // Schedule next day
        }, timeUntilNext);
    }

    public async performDailyConfirmation(): Promise<AttendanceHealthMetrics> {
        const today = new Date();
        const todayPKT = new Date(today.getTime() + (5 * 60 * 60 * 1000)); // UTC+5
        const dateStr = todayPKT.toISOString().split('T')[0];
        
        console.log(`[AttendanceConfirmation] 🔍 Performing daily confirmation for ${dateStr}...`);
        
        try {
            const metrics = await this.calculateHealthMetrics(dateStr);
            
            if (!metrics.isHealthy) {
                const alert = this.generateOutageAlert(metrics);
                await this.sendOutageAlert(alert);
                console.log(`[AttendanceConfirmation] 🚨 OUTAGE DETECTED: ${alert.severity} - ${alert.title}`);
            } else {
                console.log(`[AttendanceConfirmation] ✅ System healthy for ${dateStr}`);
                // Send daily summary even when healthy
                await this.sendDailySummary(metrics);
            }
            
            this.emit('confirmationComplete', metrics);
            return metrics;
            
        } catch (error) {
            console.error('[AttendanceConfirmation] ❌ Error during daily confirmation:', error);
            
            // Send critical alert about confirmation failure
            await this.sendCriticalSystemAlert(error as Error, dateStr);
            throw error;
        }
    }

    private async calculateHealthMetrics(date: string): Promise<AttendanceHealthMetrics> {
        const startOfDay = new Date(`${date}T00:00:00Z`);
        const endOfDay = new Date(`${date}T23:59:59Z`);
        
        // Get BioTime sync data for today
        const biotimeSyncResult = await db.execute(sql`
            SELECT COUNT(*) as count, MAX(processed_at) as last_sync
            FROM biotime_sync_data
            WHERE DATE(processed_at) = ${date}
        `);
        
        // Get processed attendance records for today
        const attendanceResult = await db.execute(sql`
            SELECT COUNT(*) as count, MAX(created_at) as last_processed
            FROM attendance_records
            WHERE DATE(created_at) = ${date}
        `);
        
        // Get unprocessed records
        const unprocessedResult = await db.execute(sql`
            SELECT COUNT(*) as count
            FROM biotime_sync_data
            WHERE processed = false OR processed IS NULL
        `);
        
        const biotimeSyncRecords = parseInt(String(biotimeSyncResult.rows[0]?.count || 0));
        const attendanceProcessedRecords = parseInt(String(attendanceResult.rows[0]?.count || 0));
        const unprocessedRecords = parseInt(String(unprocessedResult.rows[0]?.count || 0));
        
        const lastBiotimeSync = biotimeSyncResult.rows[0]?.last_sync ? new Date(String(biotimeSyncResult.rows[0].last_sync)) : null;
        const lastProcessedRecord = attendanceResult.rows[0]?.last_processed ? new Date(String(attendanceResult.rows[0].last_processed)) : null;
        
        const now = new Date();
        const hoursWithoutSync = lastBiotimeSync ? (now.getTime() - lastBiotimeSync.getTime()) / (1000 * 60 * 60) : 24;
        const hoursWithoutProcessing = lastProcessedRecord ? (now.getTime() - lastProcessedRecord.getTime()) / (1000 * 60 * 60) : 24;
        
        const processingRate = biotimeSyncRecords > 0 ? (attendanceProcessedRecords / biotimeSyncRecords) * 100 : 0;
        
        // Assess health
        const issues: string[] = [];
        
        if (biotimeSyncRecords < this.THRESHOLDS.MIN_EXPECTED_DAILY_RECORDS) {
            issues.push(`Low BioTime sync records: ${biotimeSyncRecords} (expected: ${this.THRESHOLDS.MIN_EXPECTED_DAILY_RECORDS}+)`);
        }
        
        if (unprocessedRecords > this.THRESHOLDS.CRITICAL_UNPROCESSED_COUNT) {
            issues.push(`Critical unprocessed backlog: ${unprocessedRecords} records`);
        }
        
        if (processingRate < this.THRESHOLDS.MIN_PROCESSING_RATE && biotimeSyncRecords > 0) {
            issues.push(`Low processing rate: ${processingRate.toFixed(1)}% (expected: ${this.THRESHOLDS.MIN_PROCESSING_RATE}%+)`);
        }
        
        if (hoursWithoutSync > this.THRESHOLDS.MAX_HOURS_WITHOUT_SYNC) {
            issues.push(`BioTime sync stalled: ${hoursWithoutSync.toFixed(1)} hours without sync`);
        }
        
        if (hoursWithoutProcessing > this.THRESHOLDS.MAX_HOURS_WITHOUT_PROCESSING) {
            issues.push(`Processing stalled: ${hoursWithoutProcessing.toFixed(1)} hours without processing`);
        }
        
        return {
            date,
            biotimeSyncRecords,
            attendanceProcessedRecords,
            unprocessedRecords,
            processingRate: Math.round(processingRate * 10) / 10,
            lastBiotimeSync,
            lastProcessedRecord,
            hoursWithoutSync: Math.round(hoursWithoutSync * 10) / 10,
            hoursWithoutProcessing: Math.round(hoursWithoutProcessing * 10) / 10,
            isHealthy: issues.length === 0,
            issues
        };
    }

    private generateOutageAlert(metrics: AttendanceHealthMetrics): OutageAlert {
        let severity: 'WARNING' | 'CRITICAL' | 'INFO' = 'INFO';
        let title = 'Attendance System Status';
        const recommendedActions: string[] = [];
        
        // Determine severity
        if (metrics.unprocessedRecords > this.THRESHOLDS.CRITICAL_UNPROCESSED_COUNT || 
            metrics.hoursWithoutSync > 6 || 
            metrics.biotimeSyncRecords < 50) {
            severity = 'CRITICAL';
            title = 'CRITICAL: Attendance System Outage Detected';
            recommendedActions.push('Immediate investigation required');
            recommendedActions.push('Check BioTime API connectivity');
            recommendedActions.push('Verify three-poller system status');
        } else if (metrics.issues.length > 1 || metrics.processingRate < 70) {
            severity = 'WARNING';
            title = 'WARNING: Attendance System Issues Detected';
            recommendedActions.push('Monitor system closely');
            recommendedActions.push('Consider manual intervention');
        } else {
            severity = 'WARNING';
            title = 'Attendance System Health Alert';
            recommendedActions.push('Review system status');
        }
        
        // Add specific recommendations based on issues
        if (metrics.unprocessedRecords > 100) {
            recommendedActions.push(`Process ${metrics.unprocessedRecords} unprocessed records manually`);
        }
        
        if (metrics.hoursWithoutSync > this.THRESHOLDS.MAX_HOURS_WITHOUT_SYNC) {
            recommendedActions.push('Restart BioTime polling service');
        }
        
        if (metrics.hoursWithoutProcessing > this.THRESHOLDS.MAX_HOURS_WITHOUT_PROCESSING) {
            recommendedActions.push('Restart attendance processing service');
        }
        
        return {
            severity,
            title,
            description: `Attendance system health check for ${metrics.date} detected ${metrics.issues.length} issue(s)`,
            metrics,
            recommendedActions
        };
    }

    private async sendOutageAlert(alert: OutageAlert): Promise<void> {
        const { metrics } = alert;
        
        const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: ${alert.severity === 'CRITICAL' ? '#dc2626' : '#f59e0b'}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">🚨 ${alert.title}</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px;">${alert.description}</p>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
                <h2 style="color: #374151; margin-top: 0;">📊 System Metrics</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Date:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${metrics.date}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>BioTime Records:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${metrics.biotimeSyncRecords}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Processed Records:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${metrics.attendanceProcessedRecords}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Unprocessed Backlog:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: ${metrics.unprocessedRecords > 100 ? '#dc2626' : '#059669'};">${metrics.unprocessedRecords}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Processing Rate:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: ${metrics.processingRate < 85 ? '#dc2626' : '#059669'};">${metrics.processingRate}%</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Hours Since Last Sync:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: ${metrics.hoursWithoutSync > 2 ? '#dc2626' : '#059669'};">${metrics.hoursWithoutSync}</td></tr>
                    <tr><td style="padding: 8px;"><strong>Hours Since Last Processing:</strong></td><td style="padding: 8px; color: ${metrics.hoursWithoutProcessing > 1 ? '#dc2626' : '#059669'};">${metrics.hoursWithoutProcessing}</td></tr>
                </table>
            </div>
            
            <div style="background: #fef2f2; padding: 20px; border: 1px solid #fecaca; border-top: none;">
                <h2 style="color: #dc2626; margin-top: 0;">⚠️ Issues Detected</h2>
                <ul style="margin: 0; padding-left: 20px;">
                    ${metrics.issues.map(issue => `<li style="margin: 5px 0; color: #374151;">${issue}</li>`).join('')}
                </ul>
            </div>
            
            <div style="background: #f0f9ff; padding: 20px; border: 1px solid #bae6fd; border-top: none;">
                <h2 style="color: #0369a1; margin-top: 0;">🔧 Recommended Actions</h2>
                <ol style="margin: 0; padding-left: 20px;">
                    ${alert.recommendedActions.map(action => `<li style="margin: 5px 0; color: #374151;">${action}</li>`).join('')}
                </ol>
            </div>
            
            <div style="background: #f9fafb; padding: 15px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; text-align: center;">
                <p style="margin: 0; color: #6b7280; font-size: 14px;">
                    Generated by Nexlinx EMS Daily Attendance Confirmation Service<br>
                    System Time: ${new Date().toISOString()}
                </p>
            </div>
        </div>
        `;
        
        try {
            await emailService.sendEmail({
                to: this.EMAIL_RECIPIENT,
                subject: `[${alert.severity}] ${alert.title} - ${metrics.date}`,
                html: emailHtml
            });
            
            console.log(`[AttendanceConfirmation] ✉️ ${alert.severity} alert sent to ${this.EMAIL_RECIPIENT}`);
            this.emit('alertSent', alert);
            
        } catch (error) {
            console.error('[AttendanceConfirmation] ❌ Failed to send outage alert:', error);
            this.emit('alertFailed', error);
        }
    }

    private async sendDailySummary(metrics: AttendanceHealthMetrics): Promise<void> {
        const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #059669; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">✅ Daily Attendance Confirmation</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px;">System operating normally for ${metrics.date}</p>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
                <h2 style="color: #374151; margin-top: 0;">📊 Daily Summary</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>BioTime Records Synced:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #059669;">${metrics.biotimeSyncRecords}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Attendance Records Processed:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #059669;">${metrics.attendanceProcessedRecords}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Processing Rate:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #059669;">${metrics.processingRate}%</td></tr>
                    <tr><td style="padding: 8px;"><strong>Unprocessed Backlog:</strong></td><td style="padding: 8px; color: #059669;">${metrics.unprocessedRecords}</td></tr>
                </table>
            </div>
            
            <div style="background: #f0fdf4; padding: 20px; border: 1px solid #bbf7d0; border-top: none; border-radius: 0 0 8px 8px;">
                <h2 style="color: #15803d; margin-top: 0;">✅ System Health Status</h2>
                <p style="margin: 0; color: #374151;">All systems operational. No intervention required.</p>
            </div>
        </div>
        `;
        
        try {
            await emailService.sendEmail({
                to: this.EMAIL_RECIPIENT,
                subject: `[HEALTHY] Daily Attendance Confirmation - ${metrics.date}`,
                html: emailHtml
            });
            
            console.log(`[AttendanceConfirmation] ✉️ Daily summary sent to ${this.EMAIL_RECIPIENT}`);
            
        } catch (error) {
            console.error('[AttendanceConfirmation] ❌ Failed to send daily summary:', error);
        }
    }

    private async sendCriticalSystemAlert(error: Error, date: string): Promise<void> {
        const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">🔥 CRITICAL SYSTEM ERROR</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px;">Daily attendance confirmation service failure</p>
            </div>
            
            <div style="background: #fef2f2; padding: 20px; border: 1px solid #fecaca; border-top: none;">
                <h2 style="color: #dc2626; margin-top: 0;">❌ Error Details</h2>
                <p><strong>Date:</strong> ${date}</p>
                <p><strong>Error:</strong> ${error.message}</p>
                <p><strong>Stack:</strong></p>
                <pre style="background: #f9fafb; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px;">${error.stack}</pre>
            </div>
            
            <div style="background: #f0f9ff; padding: 20px; border: 1px solid #bae6fd; border-top: none; border-radius: 0 0 8px 8px;">
                <h2 style="color: #0369a1; margin-top: 0;">🚨 Immediate Action Required</h2>
                <ol style="margin: 0; padding-left: 20px;">
                    <li style="margin: 5px 0;">Check database connectivity</li>
                    <li style="margin: 5px 0;">Verify service status</li>
                    <li style="margin: 5px 0;">Review system logs</li>
                    <li style="margin: 5px 0;">Restart confirmation service if necessary</li>
                </ol>
            </div>
        </div>
        `;
        
        try {
            await emailService.sendEmail({
                to: this.EMAIL_RECIPIENT,
                subject: `[CRITICAL] Attendance Confirmation Service Failure - ${date}`,
                html: emailHtml
            });
            
            console.log('[AttendanceConfirmation] ✉️ Critical system alert sent');
            
        } catch (emailError) {
            console.error('[AttendanceConfirmation] ❌ Failed to send critical alert:', emailError);
        }
    }

    // Manual trigger for testing
    public async triggerManualConfirmation(): Promise<AttendanceHealthMetrics> {
        console.log('[AttendanceConfirmation] 🔄 Manual confirmation triggered');
        return await this.performDailyConfirmation();
    }

    public getStatus(): { isRunning: boolean; nextConfirmation: string | null } {
        const nextConfirmation = this.confirmationTimer ? 'Scheduled for 11:30 PM PKT daily' : null;
        return {
            isRunning: this.isRunning,
            nextConfirmation
        };
    }
}

// Export singleton instance
export const dailyAttendanceConfirmationService = new DailyAttendanceConfirmationService();