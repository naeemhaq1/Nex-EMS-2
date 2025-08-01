import { db } from '../db';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { createWriteStream, createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createGzip } from 'zlib';
import archiver from 'archiver';

const execAsync = promisify(exec);

export interface BackupStats {
  startTime: Date;
  endTime?: Date;
  duration?: number;
  originalSize?: number;
  compressedSize?: number;
  compressionRatio?: number;
  tablesBackedUp: string[];
  success: boolean;
  errorMessage?: string;
  backupPath?: string;
}

export class AutoBackupService {
  private isRunning: boolean = false;
  private scheduledBackupTimer?: NodeJS.Timeout;
  private readonly backupDirectory = './backups';
  private readonly maxBackupAge = 30; // Keep backups for 30 days
  private readonly pakistanTimezone = 'Asia/Karachi';
  private lastBackupTime: number = 0;
  private readonly minBackupInterval = 5 * 60 * 1000; // Minimum 5 minutes between backups

  constructor() {
    console.log('[AutoBackup] 📦 Initializing automated backup service...');
    this.ensureBackupDirectory();
  }

  /**
   * Start the auto backup service with Pakistan timezone scheduling
   */
  async start(): Promise<void> {
    console.log('[AutoBackup] 🚀 Starting automated backup service...');
    
    // Schedule daily backup at 00:01 Pakistan time
    this.scheduleNextBackup();
    
    console.log('[AutoBackup] ✅ Auto backup service started - scheduled for 00:01 PKT daily');
  }

  /**
   * Stop the auto backup service
   */
  stop(): void {
    if (this.scheduledBackupTimer) {
      clearTimeout(this.scheduledBackupTimer);
      this.scheduledBackupTimer = undefined;
    }
    console.log('[AutoBackup] 🛑 Auto backup service stopped');
  }

  /**
   * Schedule next backup at 00:01 Pakistan time
   */
  private scheduleNextBackup(): void {
    const now = new Date();
    const pakistanNow = new Date(now.toLocaleString("en-US", {timeZone: this.pakistanTimezone}));
    
    // Calculate next 00:01 PKT
    const nextBackup = new Date(pakistanNow);
    nextBackup.setHours(0, 1, 0, 0); // 00:01:00
    
    // If it's already past 00:01 today, schedule for tomorrow
    if (pakistanNow.getHours() > 0 || (pakistanNow.getHours() === 0 && pakistanNow.getMinutes() > 1)) {
      nextBackup.setDate(nextBackup.getDate() + 1);
    }

    // Convert back to system timezone
    const nextBackupSystem = new Date(nextBackup.toLocaleString("en-US", {timeZone: "UTC"}));
    const delay = nextBackupSystem.getTime() - Date.now();

    console.log(`[AutoBackup] ⏰ Next backup scheduled: ${nextBackup.toLocaleString('en-US', {
      timeZone: this.pakistanTimezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    })} (${Math.round(delay / 1000 / 60)} minutes from now)`);

    this.scheduledBackupTimer = setTimeout(() => {
      this.executeAutoBackup();
      // Schedule the next one after completion
      this.scheduleNextBackup();
    }, delay);
  }

  /**
   * Execute automatic backup
   */
  private async executeAutoBackup(): Promise<void> {
    try {
      console.log('[AutoBackup] 🏁 Executing scheduled backup at Pakistan 00:01...');
      const stats = await this.createComprehensiveBackup();
      
      if (stats.success) {
        console.log(`[AutoBackup] ✅ Automated backup completed successfully`);
        console.log(`[AutoBackup] 📊 Backup Stats: ${this.formatBackupStats(stats)}`);
        
        // Clean up old backups
        await this.cleanupOldBackups();
      } else {
        console.error(`[AutoBackup] ❌ Automated backup failed: ${stats.errorMessage}`);
      }
    } catch (error) {
      console.error('[AutoBackup] ❌ Critical error during automated backup:', error);
    }
  }

  /**
   * Create comprehensive backup with maximum compression
   */
  async createComprehensiveBackup(): Promise<BackupStats> {
    const stats: BackupStats = {
      startTime: new Date(),
      tablesBackedUp: [],
      success: false
    };

    if (this.isRunning) {
      stats.errorMessage = 'Backup already in progress';
      console.log('[AutoBackup] ⚠️ Skipping backup - already running');
      return stats;
    }

    this.isRunning = true;

    try {
      // Create timestamped backup filename
      const timestamp = new Date().toLocaleString('sv-SE', {
        timeZone: this.pakistanTimezone
      }).replace(/[:\s]/g, '-').replace(/\./g, '-');
      
      const backupPrefix = `NEXLINX-COMPREHENSIVE-BACKUP-${timestamp}`;
      const sqlBackupPath = path.join(this.backupDirectory, `${backupPrefix}.sql`);
      const finalBackupPath = path.join(this.backupDirectory, `${backupPrefix}.tar.gz`);

      console.log('[AutoBackup] 📊 Creating comprehensive database backup...');
      
      // Step 1: Create SQL dump with all critical tables
      await this.createSQLDump(sqlBackupPath, stats);

      // Step 2: Create additional JSON exports for WhatsApp data
      const jsonExports = await this.createJSONExports(timestamp);

      // Step 3: Create compressed archive with all backup files
      await this.createCompressedArchive(finalBackupPath, [
        sqlBackupPath,
        ...jsonExports
      ], stats);

      // Step 4: Calculate compression stats
      const originalSize = await this.getFileSize(sqlBackupPath) + 
                          (await Promise.all(jsonExports.map(f => this.getFileSize(f)))).reduce((a, b) => a + b, 0);
      const compressedSize = await this.getFileSize(finalBackupPath);
      
      stats.originalSize = originalSize;
      stats.compressedSize = compressedSize;
      stats.compressionRatio = Math.round((1 - compressedSize / originalSize) * 100);

      // Step 5: Clean up temporary files
      await fs.unlink(sqlBackupPath);
      for (const jsonFile of jsonExports) {
        await fs.unlink(jsonFile);
      }

      stats.endTime = new Date();
      stats.duration = stats.endTime.getTime() - stats.startTime.getTime();
      stats.success = true;
      stats.backupPath = finalBackupPath;

      console.log(`[AutoBackup] ✅ Comprehensive backup completed: ${path.basename(finalBackupPath)}`);
      
    } catch (error) {
      stats.errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[AutoBackup] ❌ Backup failed:', error);
    } finally {
      this.isRunning = false;
    }

    return stats;
  }

  /**
   * Create SQL dump of all critical tables
   */
  private async createSQLDump(outputPath: string, stats: BackupStats): Promise<void> {
    const criticalTables = [
      'users', 'employee_records', 'attendance_records', 'biotime_sync_data',
      'whatsapp_message_logs', 'whatsapp_blacklist', 'whatsapp_contacts', 
      'whatsapp_groups', 'whatsapp_messages', 'whatsapp_analytics',
      'geofence_clusters', 'mobile_punch_validation', 'announcements'
    ];

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable not set');
    }

    // Use pg_dump with compression and parallel processing
    const pgDumpCommand = `pg_dump "${databaseUrl}" ` +
      `--no-owner --no-privileges --verbose ` +
      `--format=plain --compress=0 ` +
      `--file="${outputPath}" ` +
      criticalTables.map(table => `--table=${table}`).join(' ');

    console.log('[AutoBackup] 🗄️ Executing pg_dump for critical tables...');
    
    const { stdout, stderr } = await execAsync(pgDumpCommand);
    
    if (stderr && !stderr.includes('NOTICE')) {
      console.warn('[AutoBackup] ⚠️ pg_dump warnings:', stderr);
    }

    stats.tablesBackedUp = criticalTables;
    console.log(`[AutoBackup] ✅ SQL dump completed: ${criticalTables.length} tables`);
  }

  /**
   * Create JSON exports for critical WhatsApp data
   */
  private async createJSONExports(timestamp: string): Promise<string[]> {
    const exportFiles: string[] = [];

    try {
      // Export WhatsApp contacts with full details
      const contactsExport = await this.exportWhatsAppContacts(timestamp);
      if (contactsExport) exportFiles.push(contactsExport);

      // Export WhatsApp messages (last 30 days)
      const messagesExport = await this.exportWhatsAppMessages(timestamp);
      if (messagesExport) exportFiles.push(messagesExport);

      // Export system configuration
      const configExport = await this.exportSystemConfiguration(timestamp);
      if (configExport) exportFiles.push(configExport);

    } catch (error) {
      console.warn('[AutoBackup] ⚠️ Some JSON exports failed:', error);
    }

    return exportFiles;
  }

  /**
   * Export WhatsApp contacts data
   */
  private async exportWhatsAppContacts(timestamp: string): Promise<string | null> {
    try {
      // Get all employee contacts with WhatsApp numbers
      const contacts = await db.execute(`
        SELECT 
          employee_code, first_name, last_name, department, designation, 
          phone, mobile, wanumber, email, status
        FROM employee_records 
        WHERE wanumber IS NOT NULL 
        ORDER BY employee_code
      `);

      const exportPath = path.join(this.backupDirectory, `whatsapp-contacts-${timestamp}.json`);
      
      await fs.writeFile(exportPath, JSON.stringify({
        exportDate: new Date().toISOString(),
        exportType: 'whatsapp_contacts',
        totalContacts: contacts.rows.length,
        contacts: contacts.rows
      }, null, 2));

      console.log(`[AutoBackup] 📞 WhatsApp contacts exported: ${contacts.rows.length} contacts`);
      return exportPath;
    } catch (error) {
      console.error('[AutoBackup] ❌ Failed to export contacts:', error);
      return null;
    }
  }

  /**
   * Export WhatsApp messages (last 30 days)
   */
  private async exportWhatsAppMessages(timestamp: string): Promise<string | null> {
    try {
      // Get messages from last 30 days
      const messages = await db.execute(`
        SELECT * FROM whatsapp_message_logs 
        WHERE timestamp >= NOW() - INTERVAL '30 days'
        ORDER BY timestamp DESC
      `);

      const exportPath = path.join(this.backupDirectory, `whatsapp-messages-${timestamp}.json`);
      
      await fs.writeFile(exportPath, JSON.stringify({
        exportDate: new Date().toISOString(),
        exportType: 'whatsapp_messages_30days',
        totalMessages: messages.rows.length,
        messages: messages.rows
      }, null, 2));

      console.log(`[AutoBackup] 💬 WhatsApp messages exported: ${messages.rows.length} messages`);
      return exportPath;
    } catch (error) {
      console.error('[AutoBackup] ❌ Failed to export messages:', error);
      return null;
    }
  }

  /**
   * Export system configuration
   */
  private async exportSystemConfiguration(timestamp: string): Promise<string | null> {
    try {
      const config = {
        exportDate: new Date().toISOString(),
        exportType: 'system_configuration',
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          uptime: process.uptime()
        },
        services: {
          whatsappService: 'active',
          biotimePolling: 'active',
          autoBackup: 'active'
        }
      };

      const exportPath = path.join(this.backupDirectory, `system-config-${timestamp}.json`);
      
      await fs.writeFile(exportPath, JSON.stringify(config, null, 2));

      console.log('[AutoBackup] ⚙️ System configuration exported');
      return exportPath;
    } catch (error) {
      console.error('[AutoBackup] ❌ Failed to export system config:', error);
      return null;
    }
  }

  /**
   * Create compressed archive of all backup files
   */
  private async createCompressedArchive(outputPath: string, filePaths: string[], stats: BackupStats): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = createWriteStream(outputPath);
      const archive = archiver('tar', {
        gzip: true,
        gzipOptions: {
          level: 9, // Maximum compression
          chunkSize: 1024 * 1024, // 1MB chunks
        }
      });

      output.on('close', () => {
        console.log(`[AutoBackup] 📦 Archive created: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
        resolve();
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);

      // Add all files to archive
      for (const filePath of filePaths) {
        const fileName = path.basename(filePath);
        archive.file(filePath, { name: fileName });
      }

      archive.finalize();
    });
  }

  /**
   * Get file size in bytes
   */
  private async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  /**
   * Clean up backups older than maxBackupAge days
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      const files = await fs.readdir(this.backupDirectory);
      const now = Date.now();
      const maxAge = this.maxBackupAge * 24 * 60 * 60 * 1000; // Convert days to milliseconds

      let deletedCount = 0;
      
      for (const file of files) {
        if (file.startsWith('NEXLINX-COMPREHENSIVE-BACKUP-') && file.endsWith('.tar.gz')) {
          const filePath = path.join(this.backupDirectory, file);
          const stats = await fs.stat(filePath);
          
          if (now - stats.mtime.getTime() > maxAge) {
            await fs.unlink(filePath);
            deletedCount++;
            console.log(`[AutoBackup] 🗑️ Deleted old backup: ${file}`);
          }
        }
      }

      if (deletedCount > 0) {
        console.log(`[AutoBackup] 🧹 Cleanup completed: ${deletedCount} old backups removed`);
      }
    } catch (error) {
      console.error('[AutoBackup] ⚠️ Cleanup failed:', error);
    }
  }

  /**
   * Ensure backup directory exists
   */
  private async ensureBackupDirectory(): Promise<void> {
    try {
      await fs.access(this.backupDirectory);
    } catch {
      await fs.mkdir(this.backupDirectory, { recursive: true });
      console.log(`[AutoBackup] 📁 Created backup directory: ${this.backupDirectory}`);
    }
  }

  /**
   * Format backup stats for logging
   */
  private formatBackupStats(stats: BackupStats): string {
    const duration = stats.duration ? `${Math.round(stats.duration / 1000)}s` : 'N/A';
    const originalSize = stats.originalSize ? `${(stats.originalSize / 1024 / 1024).toFixed(2)}MB` : 'N/A';
    const compressedSize = stats.compressedSize ? `${(stats.compressedSize / 1024 / 1024).toFixed(2)}MB` : 'N/A';
    const ratio = stats.compressionRatio ? `${stats.compressionRatio}%` : 'N/A';
    
    return `Duration: ${duration}, Original: ${originalSize}, Compressed: ${compressedSize}, Ratio: ${ratio}`;
  }

  /**
   * Trigger manual backup (for testing or on-demand) with rate limiting
   */
  async triggerManualBackup(): Promise<BackupStats> {
    const now = Date.now();
    const timeSinceLastBackup = now - this.lastBackupTime;
    
    if (timeSinceLastBackup < this.minBackupInterval) {
      const waitTime = Math.ceil((this.minBackupInterval - timeSinceLastBackup) / 1000);
      console.log(`[AutoBackup] ⚠️ Rate limited: Manual backup rejected. Please wait ${waitTime} seconds.`);
      return {
        startTime: new Date(),
        tablesBackedUp: [],
        success: false,
        errorMessage: `Rate limited: Please wait ${waitTime} seconds before next backup`
      };
    }
    
    console.log('[AutoBackup] 🔧 Manual backup triggered...');
    this.lastBackupTime = now;
    return this.createComprehensiveBackup();
  }

  /**
   * Get backup service status
   */
  getStatus(): {
    isRunning: boolean;
    isScheduled: boolean;
    nextBackupTime?: Date;
  } {
    return {
      isRunning: this.isRunning,
      isScheduled: !!this.scheduledBackupTimer,
      // Note: nextBackupTime calculation would require storing the scheduled time
    };
  }
}

// Export singleton instance
export const autoBackupService = new AutoBackupService();