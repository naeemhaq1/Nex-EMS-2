import { db } from '../db';
import { employeeLocations, locationBackups } from '@shared/location-schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';

interface LocationBackupConfig {
  backupDirectory: string;
  hourlyBackupEnabled: boolean;
  dailyBackupEnabled: boolean;
  compressionEnabled: boolean;
  retentionHours: number; // Keep backups for X hours
  retentionDays: number; // Keep daily backups for X days
  checksumAlgorithm: 'md5' | 'sha256';
  maxBackupSize: number; // Max backup file size in bytes
}

interface BackupMetrics {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  backupSize: number;
  compressionRatio: number;
  duration: number;
}

export class LocationBackupService extends EventEmitter {
  private config: LocationBackupConfig;
  private isRunning: boolean = false;
  private hourlyTimer: NodeJS.Timeout | null = null;
  private dailyTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<LocationBackupConfig> = {}) {
    super();
    this.config = {
      backupDirectory: './backups/location_data',
      hourlyBackupEnabled: true,
      dailyBackupEnabled: true,
      compressionEnabled: true,
      retentionHours: 72, // Keep hourly backups for 72 hours
      retentionDays: 30, // Keep daily backups for 30 days
      checksumAlgorithm: 'sha256',
      maxBackupSize: 1024 * 1024 * 500, // 500MB max
      ...config
    };

    console.log('[LocationBackup] Service initialized with config:', this.config);
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[LocationBackup] Service already running');
      return;
    }

    console.log('[LocationBackup] 🚀 Starting location backup service...');
    this.isRunning = true;
    
    // Ensure backup directory exists
    await this.ensureBackupDirectory();
    
    // Schedule backups
    if (this.config.hourlyBackupEnabled) {
      await this.scheduleHourlyBackups();
    }
    
    if (this.config.dailyBackupEnabled) {
      await this.scheduleDailyBackups();
    }
    
    // Perform initial cleanup of old backups
    await this.cleanupOldBackups();
    
    this.emit('started');
    console.log('[LocationBackup] ✅ Service started successfully');
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('[LocationBackup] 🛑 Stopping location backup service...');
    this.isRunning = false;

    if (this.hourlyTimer) {
      clearTimeout(this.hourlyTimer);
      this.hourlyTimer = null;
    }

    if (this.dailyTimer) {
      clearTimeout(this.dailyTimer);
      this.dailyTimer = null;
    }

    this.emit('stopped');
    console.log('[LocationBackup] ✅ Service stopped');
  }

  private async ensureBackupDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.config.backupDirectory, { recursive: true });
      
      // Create subdirectories for different backup types
      await fs.mkdir(path.join(this.config.backupDirectory, 'hourly'), { recursive: true });
      await fs.mkdir(path.join(this.config.backupDirectory, 'daily'), { recursive: true });
      await fs.mkdir(path.join(this.config.backupDirectory, 'manual'), { recursive: true });
      
      console.log('[LocationBackup] Backup directories created/verified');
    } catch (error) {
      console.error('[LocationBackup] Error creating backup directory:', error);
      throw error;
    }
  }

  private async scheduleHourlyBackups(): Promise<void> {
    const now = new Date();
    const nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0);
    const msUntilNextHour = nextHour.getTime() - now.getTime();

    console.log(`[LocationBackup] Scheduling hourly backup in ${Math.round(msUntilNextHour / 1000 / 60)} minutes`);

    this.hourlyTimer = setTimeout(async () => {
      if (this.isRunning) {
        await this.performHourlyBackup();
        // Schedule next hourly backup
        if (this.isRunning) {
          this.hourlyTimer = setInterval(() => {
            if (this.isRunning) {
              this.performHourlyBackup();
            }
          }, 60 * 60 * 1000); // Every hour
        }
      }
    }, msUntilNextHour);
  }

  private async scheduleDailyBackups(): Promise<void> {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 2, 0, 0, 0); // 2 AM tomorrow
    const msUntilTomorrow = tomorrow.getTime() - now.getTime();

    console.log(`[LocationBackup] Scheduling daily backup in ${Math.round(msUntilTomorrow / 1000 / 60 / 60)} hours`);

    this.dailyTimer = setTimeout(async () => {
      if (this.isRunning) {
        await this.performDailyBackup();
        // Schedule next daily backup
        if (this.isRunning) {
          this.dailyTimer = setInterval(() => {
            if (this.isRunning) {
              this.performDailyBackup();
            }
          }, 24 * 60 * 60 * 1000); // Every 24 hours
        }
      }
    }, msUntilTomorrow);
  }

  private async performHourlyBackup(): Promise<void> {
    try {
      console.log('[LocationBackup] 🔄 Starting hourly backup...');
      const startTime = new Date();
      
      // Get data from the last hour
      const oneHourAgo = new Date(startTime.getTime() - 60 * 60 * 1000);
      const backupId = `hourly_${startTime.toISOString().replace(/[:.]/g, '-')}`;
      
      const metrics = await this.createLocationBackup(backupId, 'hourly', oneHourAgo, startTime);
      
      console.log(`[LocationBackup] ✅ Hourly backup completed: ${metrics.totalRecords} records, ${this.formatFileSize(metrics.backupSize)}`);
      this.emit('hourlyBackupCompleted', { backupId, metrics });
      
    } catch (error) {
      console.error('[LocationBackup] Error in hourly backup:', error);
      this.emit('backupError', { type: 'hourly', error });
    }
  }

  private async performDailyBackup(): Promise<void> {
    try {
      console.log('[LocationBackup] 🔄 Starting daily backup...');
      const startTime = new Date();
      
      // Get data from the last 24 hours
      const oneDayAgo = new Date(startTime.getTime() - 24 * 60 * 60 * 1000);
      const backupId = `daily_${startTime.toISOString().substring(0, 10)}`;
      
      const metrics = await this.createLocationBackup(backupId, 'daily', oneDayAgo, startTime);
      
      console.log(`[LocationBackup] ✅ Daily backup completed: ${metrics.totalRecords} records, ${this.formatFileSize(metrics.backupSize)}`);
      this.emit('dailyBackupCompleted', { backupId, metrics });
      
    } catch (error) {
      console.error('[LocationBackup] Error in daily backup:', error);
      this.emit('backupError', { type: 'daily', error });
    }
  }

  public async createManualBackup(fromDate?: Date, toDate?: Date): Promise<string> {
    try {
      const startTime = new Date();
      const endDate = toDate || startTime;
      const beginDate = fromDate || new Date(startTime.getTime() - 24 * 60 * 60 * 1000); // Default: last 24 hours
      
      const backupId = `manual_${startTime.toISOString().replace(/[:.]/g, '-')}`;
      
      console.log(`[LocationBackup] 🔄 Starting manual backup from ${beginDate.toISOString()} to ${endDate.toISOString()}...`);
      
      const metrics = await this.createLocationBackup(backupId, 'manual', beginDate, endDate);
      
      console.log(`[LocationBackup] ✅ Manual backup completed: ${metrics.totalRecords} records, ${this.formatFileSize(metrics.backupSize)}`);
      this.emit('manualBackupCompleted', { backupId, metrics });
      
      return backupId;
    } catch (error) {
      console.error('[LocationBackup] Error in manual backup:', error);
      this.emit('backupError', { type: 'manual', error });
      throw error;
    }
  }

  private async createLocationBackup(
    backupId: string,
    backupType: 'hourly' | 'daily' | 'manual',
    fromDate: Date,
    toDate: Date
  ): Promise<BackupMetrics> {
    const backupStartTime = new Date();
    
    try {
      // Query location data within date range
      const locationData = await db
        .select()
        .from(employeeLocations)
        .where(and(
          gte(employeeLocations.timestamp, fromDate),
          lte(employeeLocations.timestamp, toDate)
        ))
        .orderBy(employeeLocations.timestamp, employeeLocations.employeeId);

      const totalRecords = locationData.length;
      const validRecords = locationData.filter(r => r.validationStatus === 'valid').length;
      const invalidRecords = totalRecords - validRecords;

      console.log(`[LocationBackup] Found ${totalRecords} location records for backup`);

      // Create backup file
      const fileName = `${backupId}.json${this.config.compressionEnabled ? '.gz' : ''}`;
      const filePath = path.join(this.config.backupDirectory, backupType, fileName);
      
      // Prepare backup data
      const backupData = {
        metadata: {
          backupId,
          backupType,
          createdAt: backupStartTime.toISOString(),
          dateRange: {
            from: fromDate.toISOString(),
            to: toDate.toISOString()
          },
          totalRecords,
          validRecords,
          invalidRecords,
          version: '1.0'
        },
        data: locationData
      };

      const jsonData = JSON.stringify(backupData, null, 2);
      let backupSize: number;
      let compressionRatio = 1;

      if (this.config.compressionEnabled) {
        // Write compressed file
        const originalSize = Buffer.byteLength(jsonData, 'utf8');
        await this.writeCompressedFile(filePath, jsonData);
        const compressedSize = (await fs.stat(filePath)).size;
        backupSize = compressedSize;
        compressionRatio = originalSize / compressedSize;
      } else {
        // Write uncompressed file
        await fs.writeFile(filePath, jsonData, 'utf8');
        backupSize = (await fs.stat(filePath)).size;
      }

      // Generate checksum
      const checksumHash = await this.generateFileChecksum(filePath);
      
      // Calculate duration
      const duration = Math.round((new Date().getTime() - backupStartTime.getTime()) / 1000);

      // Store backup metadata in database
      await db.insert(locationBackups).values({
        backupId,
        backupType,
        totalRecords,
        validRecords,
        invalidRecords,
        backupSize,
        compressionRatio: parseFloat(compressionRatio.toFixed(2)),
        backupPath: filePath,
        checksumHash,
        startTime: backupStartTime,
        endTime: new Date(),
        duration,
        status: 'completed'
      });

      const metrics: BackupMetrics = {
        totalRecords,
        validRecords,
        invalidRecords,
        backupSize,
        compressionRatio,
        duration
      };

      return metrics;

    } catch (error) {
      // Update database with failed status
      try {
        await db.insert(locationBackups).values({
          backupId,
          backupType,
          totalRecords: 0,
          validRecords: 0,
          invalidRecords: 0,
          backupSize: 0,
          compressionRatio: 0,
          backupPath: '',
          checksumHash: '',
          startTime: backupStartTime,
          endTime: new Date(),
          duration: Math.round((new Date().getTime() - backupStartTime.getTime()) / 1000),
          status: 'failed',
          errorLog: error instanceof Error ? error.message : 'Unknown error'
        });
      } catch (dbError) {
        console.error('[LocationBackup] Error saving failed backup to database:', dbError);
      }
      
      throw error;
    }
  }

  private async writeCompressedFile(filePath: string, data: string): Promise<void> {
    const gzip = createGzip();
    const writeStream = await fs.open(filePath, 'w');
    
    try {
      await pipeline(
        async function* () {
          yield Buffer.from(data, 'utf8');
        },
        gzip,
        writeStream.createWriteStream()
      );
    } finally {
      await writeStream.close();
    }
  }

  private async generateFileChecksum(filePath: string): Promise<string> {
    const data = await fs.readFile(filePath);
    const hash = crypto.createHash(this.config.checksumAlgorithm);
    hash.update(data);
    return hash.digest('hex');
  }

  private async cleanupOldBackups(): Promise<void> {
    try {
      console.log('[LocationBackup] 🧹 Cleaning up old backups...');
      
      const now = new Date();
      const hourlyThreshold = new Date(now.getTime() - this.config.retentionHours * 60 * 60 * 1000);
      const dailyThreshold = new Date(now.getTime() - this.config.retentionDays * 24 * 60 * 60 * 1000);

      // Get old backups from database
      const oldHourlyBackups = await db
        .select()
        .from(locationBackups)
        .where(and(
          eq(locationBackups.backupType, 'hourly'),
          lte(locationBackups.createdAt, hourlyThreshold)
        ));

      const oldDailyBackups = await db
        .select()
        .from(locationBackups)
        .where(and(
          eq(locationBackups.backupType, 'daily'),
          lte(locationBackups.createdAt, dailyThreshold)
        ));

      const allOldBackups = [...oldHourlyBackups, ...oldDailyBackups];
      
      for (const backup of allOldBackups) {
        try {
          // Delete file if it exists
          if (backup.backupPath) {
            try {
              await fs.unlink(backup.backupPath);
            } catch (fileError) {
              console.warn(`[LocationBackup] Could not delete backup file: ${backup.backupPath}`, fileError);
            }
          }

          // Remove from database
          await db
            .delete(locationBackups)
            .where(eq(locationBackups.id, backup.id));

          console.log(`[LocationBackup] Cleaned up old backup: ${backup.backupId}`);
        } catch (error) {
          console.error(`[LocationBackup] Error cleaning up backup ${backup.backupId}:`, error);
        }
      }

      if (allOldBackups.length > 0) {
        console.log(`[LocationBackup] Cleaned up ${allOldBackups.length} old backups`);
      }

    } catch (error) {
      console.error('[LocationBackup] Error during cleanup:', error);
    }
  }

  public async validateBackup(backupId: string): Promise<{
    isValid: boolean;
    details: any;
  }> {
    try {
      // Get backup metadata from database
      const [backup] = await db
        .select()
        .from(locationBackups)
        .where(eq(locationBackups.backupId, backupId));

      if (!backup) {
        return {
          isValid: false,
          details: { error: 'Backup not found in database' }
        };
      }

      // Check if file exists
      try {
        await fs.access(backup.backupPath);
      } catch {
        return {
          isValid: false,
          details: { error: 'Backup file not found', path: backup.backupPath }
        };
      }

      // Verify checksum
      const currentChecksum = await this.generateFileChecksum(backup.backupPath);
      if (currentChecksum !== backup.checksumHash) {
        return {
          isValid: false,
          details: { 
            error: 'Checksum mismatch',
            expected: backup.checksumHash,
            actual: currentChecksum
          }
        };
      }

      // Get current file size
      const stats = await fs.stat(backup.backupPath);
      if (stats.size !== backup.backupSize) {
        return {
          isValid: false,
          details: {
            error: 'File size mismatch',
            expected: backup.backupSize,
            actual: stats.size
          }
        };
      }

      return {
        isValid: true,
        details: {
          backupId: backup.backupId,
          backupType: backup.backupType,
          fileSize: stats.size,
          checksum: currentChecksum,
          recordCount: backup.totalRecords,
          createdAt: backup.createdAt
        }
      };

    } catch (error) {
      return {
        isValid: false,
        details: { error: error instanceof Error ? error.message : 'Unknown validation error' }
      };
    }
  }

  public async getBackupList(backupType?: 'hourly' | 'daily' | 'manual'): Promise<any[]> {
    try {
      let query = db.select().from(locationBackups).orderBy(desc(locationBackups.createdAt));
      
      if (backupType) {
        query = query.where(eq(locationBackups.backupType, backupType)) as any;
      }

      return await query;
    } catch (error) {
      console.error('[LocationBackup] Error getting backup list:', error);
      return [];
    }
  }

  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  public getStatus(): {
    isRunning: boolean;
    config: LocationBackupConfig;
    nextHourlyBackup: Date | null;
    nextDailyBackup: Date | null;
  } {
    const now = new Date();
    
    return {
      isRunning: this.isRunning,
      config: this.config,
      nextHourlyBackup: this.config.hourlyBackupEnabled 
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0)
        : null,
      nextDailyBackup: this.config.dailyBackupEnabled
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 2, 0, 0, 0)
        : null
    };
  }
}