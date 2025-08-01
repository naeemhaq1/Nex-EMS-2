#!/usr/bin/env node

/**
 * Daily Backup System
 * 
 * Backs up attendance records daily at 00:15 for the preceding day
 * Compresses and stores in daily-backups folder
 * Sends email notification on failure
 * 
 * Schedule: Daily at 00:15 (15 minutes after midnight)
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const { format, subDays } = require('date-fns');
const zlib = require('zlib');
const { promisify } = require('util');
const nodemailer = require('nodemailer');

const gzip = promisify(zlib.gzip);

class DailyBackupSystem {
  constructor() {
    this.backupDate = format(subDays(new Date(), 1), 'yyyy-MM-dd'); // Previous day
    this.backupDir = path.join(process.cwd(), 'backups', 'daily-backups');
    this.errors = [];
    this.backupStats = {
      attendanceRecords: 0,
      employeeRecords: 0,
      biometricExemptions: 0,
      compressedSize: 0,
      originalSize: 0
    };
  }

  async run() {
    console.log('💾 DAILY BACKUP SYSTEM');
    console.log('======================');
    console.log(`📅 Backup Date: ${this.backupDate}`);
    console.log(`⏰ Run Time: ${new Date().toISOString()}`);
    console.log('');

    try {
      // Step 1: Create backup directory
      await this.ensureBackupDirectory();

      // Step 2: Generate backup data
      const backupData = await this.generateBackupData();

      // Step 3: Compress and save backup
      const backupFile = await this.compressAndSaveBackup(backupData);

      // Step 4: Verify backup integrity
      await this.verifyBackupIntegrity(backupFile);

      // Step 5: Cleanup old backups (keep last 30 days)
      await this.cleanupOldBackups();

      console.log('\n✅ DAILY BACKUP COMPLETED SUCCESSFULLY');
      return this.generateSummary();

    } catch (error) {
      console.error('❌ DAILY BACKUP FAILED:', error);
      this.errors.push(`Critical backup error: ${error.message}`);
      
      // Send failure notification
      await this.sendFailureNotification(error);
      
      return this.generateSummary();
    }
  }

  async ensureBackupDirectory() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      console.log(`📁 Backup directory ready: ${this.backupDir}`);
    } catch (error) {
      throw new Error(`Failed to create backup directory: ${error.message}`);
    }
  }

  async generateBackupData() {
    console.log('📊 GENERATING BACKUP DATA');
    console.log('=========================');

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    try {
      const backupData = {
        metadata: {
          backupDate: this.backupDate,
          generatedAt: new Date().toISOString(),
          type: 'daily-backup',
          version: '1.0'
        },
        data: {}
      };

      // Backup attendance records for the specific day
      console.log(`🎯 Backing up attendance records for ${this.backupDate}...`);
      const attendanceResult = await pool.query(`
        SELECT * FROM attendance_records 
        WHERE DATE(date) = $1
        ORDER BY employee_code, date
      `, [this.backupDate]);

      backupData.data.attendance_records = attendanceResult.rows;
      this.backupStats.attendanceRecords = attendanceResult.rows.length;
      console.log(`   ✅ Attendance records: ${attendanceResult.rows.length}`);

      // Backup employee records (current state for reference)
      console.log('👥 Backing up current employee records...');
      const employeeResult = await pool.query(`
        SELECT * FROM employee_records 
        WHERE is_active = true
        ORDER BY employee_code
      `);

      backupData.data.employee_records = employeeResult.rows;
      this.backupStats.employeeRecords = employeeResult.rows.length;
      console.log(`   ✅ Employee records: ${employeeResult.rows.length}`);

      // Backup biometric exemptions (current state)
      console.log('🔐 Backing up biometric exemptions...');
      const exemptionsResult = await pool.query(`
        SELECT * FROM biometric_exemptions
        ORDER BY created_at
      `);

      backupData.data.biometric_exemptions = exemptionsResult.rows;
      this.backupStats.biometricExemptions = exemptionsResult.rows.length;
      console.log(`   ✅ Biometric exemptions: ${exemptionsResult.rows.length}`);

      // Add daily summary statistics
      console.log('📈 Generating daily summary...');
      const summaryResult = await pool.query(`
        SELECT 
          COUNT(*) as total_records,
          COUNT(DISTINCT employee_code) as unique_employees,
          COUNT(CASE WHEN check_in IS NOT NULL THEN 1 END) as punch_ins,
          COUNT(CASE WHEN check_out IS NOT NULL THEN 1 END) as punch_outs,
          ROUND(AVG(total_hours), 2) as avg_hours,
          SUM(overtime_hours) as total_overtime
        FROM attendance_records 
        WHERE DATE(date) = $1
      `, [this.backupDate]);

      backupData.data.daily_summary = summaryResult.rows[0];
      console.log(`   ✅ Daily summary generated`);

      return backupData;

    } finally {
      await pool.end();
    }
  }

  async compressAndSaveBackup(backupData) {
    console.log('\n🗜️  COMPRESSING AND SAVING BACKUP');
    console.log('=================================');

    const jsonData = JSON.stringify(backupData, null, 2);
    this.backupStats.originalSize = Buffer.byteLength(jsonData, 'utf8');

    // Compress the data
    const compressedData = await gzip(jsonData);
    this.backupStats.compressedSize = compressedData.length;

    const compressionRatio = ((this.backupStats.originalSize - this.backupStats.compressedSize) / this.backupStats.originalSize * 100).toFixed(1);

    console.log(`📊 Original size: ${(this.backupStats.originalSize / 1024).toFixed(2)} KB`);
    console.log(`📦 Compressed size: ${(this.backupStats.compressedSize / 1024).toFixed(2)} KB`);
    console.log(`⚡ Compression ratio: ${compressionRatio}%`);

    // Save compressed backup
    const filename = `daily-backup-${this.backupDate}.json.gz`;
    const backupFile = path.join(this.backupDir, filename);

    await fs.writeFile(backupFile, compressedData);
    console.log(`💾 Backup saved: ${backupFile}`);

    return backupFile;
  }

  async verifyBackupIntegrity(backupFile) {
    console.log('\n🔍 VERIFYING BACKUP INTEGRITY');
    console.log('=============================');

    try {
      // Read and decompress
      const compressedData = await fs.readFile(backupFile);
      const decompressedData = await promisify(zlib.gunzip)(compressedData);
      const backupData = JSON.parse(decompressedData.toString());

      // Verify structure
      if (!backupData.metadata || !backupData.data) {
        throw new Error('Invalid backup structure');
      }

      // Verify record counts
      const attendanceCount = backupData.data.attendance_records?.length || 0;
      const employeeCount = backupData.data.employee_records?.length || 0;
      const exemptionsCount = backupData.data.biometric_exemptions?.length || 0;

      console.log(`✅ Attendance records verified: ${attendanceCount}`);
      console.log(`✅ Employee records verified: ${employeeCount}`);
      console.log(`✅ Exemption records verified: ${exemptionsCount}`);
      console.log(`✅ Backup integrity confirmed`);

    } catch (error) {
      throw new Error(`Backup integrity verification failed: ${error.message}`);
    }
  }

  async cleanupOldBackups() {
    console.log('\n🧹 CLEANING UP OLD BACKUPS');
    console.log('==========================');

    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(file => file.startsWith('daily-backup-') && file.endsWith('.json.gz'));

      // Keep last 30 days
      const cutoffDate = subDays(new Date(), 30);
      let deletedCount = 0;

      for (const file of backupFiles) {
        const match = file.match(/daily-backup-(\d{4}-\d{2}-\d{2})\.json\.gz/);
        if (match) {
          const fileDate = new Date(match[1]);
          if (fileDate < cutoffDate) {
            await fs.unlink(path.join(this.backupDir, file));
            deletedCount++;
            console.log(`🗑️  Deleted old backup: ${file}`);
          }
        }
      }

      console.log(`✅ Cleanup completed: ${deletedCount} old backups removed`);
      console.log(`📦 Total backups retained: ${backupFiles.length - deletedCount}`);

    } catch (error) {
      console.warn(`⚠️  Cleanup warning: ${error.message}`);
    }
  }

  async sendFailureNotification(error) {
    console.log('\n📧 SENDING FAILURE NOTIFICATION');
    console.log('===============================');

    try {
      // Only send email if SENDGRID_API_KEY is available
      if (!process.env.SENDGRID_API_KEY) {
        console.log('⚠️  SENDGRID_API_KEY not configured - skipping email notification');
        return;
      }

      const transporter = nodemailer.createTransporter({
        service: 'SendGrid',
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY
        }
      });

      const mailOptions = {
        from: 'system@nexlinx.net.pk',
        to: 'naeemhaq1@gmail.com',
        subject: `🚨 Daily Backup Failure - ${this.backupDate}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc3545;">🚨 Daily Backup System Failure</h2>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3>Backup Details</h3>
              <ul>
                <li><strong>Date:</strong> ${this.backupDate}</li>
                <li><strong>Time:</strong> ${new Date().toISOString()}</li>
                <li><strong>System:</strong> Daily Backup System</li>
              </ul>
            </div>

            <div style="background-color: #f8d7da; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3>Error Details</h3>
              <p><strong>Error:</strong> ${error.message}</p>
              <p><strong>Stack:</strong> ${error.stack || 'Not available'}</p>
            </div>

            <div style="background-color: #d1ecf1; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3>Next Steps</h3>
              <ol>
                <li>Check database connectivity</li>
                <li>Verify backup directory permissions</li>
                <li>Review system logs for additional details</li>
                <li>Run manual backup: <code>node scripts/daily-backup-system.js</code></li>
              </ol>
            </div>

            <p style="margin-top: 30px; color: #6c757d; font-size: 14px;">
              This is an automated notification from the Nexlinx Daily Backup System.
            </p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log('✅ Failure notification sent to naeemhaq1@gmail.com');

    } catch (emailError) {
      console.error('❌ Failed to send email notification:', emailError.message);
    }
  }

  generateSummary() {
    console.log('\n📋 DAILY BACKUP SUMMARY');
    console.log('=======================');
    console.log(`📅 Backup Date: ${this.backupDate}`);
    console.log(`⏰ Completed: ${new Date().toISOString()}`);
    console.log('');

    // Backup statistics
    console.log('📊 BACKUP STATISTICS');
    console.log('   ┌─────────────────────────────────────────────────────');
    console.log(`   │ Attendance Records: ${this.backupStats.attendanceRecords}`);
    console.log(`   │ Employee Records: ${this.backupStats.employeeRecords}`);
    console.log(`   │ Biometric Exemptions: ${this.backupStats.biometricExemptions}`);
    console.log(`   │ Original Size: ${(this.backupStats.originalSize / 1024).toFixed(2)} KB`);
    console.log(`   │ Compressed Size: ${(this.backupStats.compressedSize / 1024).toFixed(2)} KB`);
    console.log('   └─────────────────────────────────────────────────────');

    // Errors
    if (this.errors.length > 0) {
      console.log(`\n❌ ERRORS: ${this.errors.length}`);
      this.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    const success = this.errors.length === 0;
    console.log(`\n${success ? '✅' : '❌'} BACKUP ${success ? 'COMPLETED' : 'FAILED'}`);
    
    return {
      backupDate: this.backupDate,
      success: success,
      stats: this.backupStats,
      errors: this.errors.length,
      errorDetails: this.errors
    };
  }
}

// Run the backup if called directly
if (require.main === module) {
  const backup = new DailyBackupSystem();
  backup.run().then(result => {
    console.log('\n🎯 BACKUP RESULT:', JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = { DailyBackupSystem };