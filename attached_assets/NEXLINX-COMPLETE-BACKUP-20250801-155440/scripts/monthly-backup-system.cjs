#!/usr/bin/env node

/**
 * Monthly Backup System
 * 
 * Backs up all monthly data at the end of each month
 * Creates full SQL dump with complete restore capability
 * Compresses and stores in monthly-backups folder
 * Sends email notification on failure
 * 
 * Schedule: Monthly on last day at 23:45
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const { format, endOfMonth, startOfMonth, subMonths } = require('date-fns');
const zlib = require('zlib');
const { promisify } = require('util');
const { exec } = require('child_process');
const nodemailer = require('nodemailer');

const gzip = promisify(zlib.gzip);
const execAsync = promisify(exec);

class MonthlyBackupSystem {
  constructor() {
    // Backup for the completed month (previous month)
    const lastMonth = subMonths(new Date(), 1);
    this.backupMonth = format(lastMonth, 'yyyy-MM');
    this.backupYear = format(lastMonth, 'yyyy');
    this.monthName = format(lastMonth, 'MMMM yyyy');
    this.backupDir = path.join(process.cwd(), 'backups', 'monthly-backups');
    this.errors = [];
    this.backupStats = {
      attendanceRecords: 0,
      employeeRecords: 0,
      biometricExemptions: 0,
      systemAlerts: 0,
      whatsappMessages: 0,
      sqlDumpSize: 0,
      compressedSize: 0,
      compressionRatio: 0
    };
  }

  async run() {
    console.log('🗄️  MONTHLY BACKUP SYSTEM');
    console.log('=========================');
    console.log(`📅 Backup Month: ${this.monthName}`);
    console.log(`⏰ Run Time: ${new Date().toISOString()}`);
    console.log('');

    try {
      // Step 1: Create backup directory
      await this.ensureBackupDirectory();

      // Step 2: Generate comprehensive SQL dump
      const sqlDumpFile = await this.generateSQLDump();

      // Step 3: Generate JSON data backup
      const jsonData = await this.generateJSONBackup();

      // Step 4: Create comprehensive backup package
      const backupPackage = await this.createBackupPackage(sqlDumpFile, jsonData);

      // Step 5: Verify backup integrity
      await this.verifyBackupIntegrity(backupPackage);

      // Step 6: Cleanup old monthly backups (keep last 24 months)
      await this.cleanupOldBackups();

      console.log('\n✅ MONTHLY BACKUP COMPLETED SUCCESSFULLY');
      return this.generateSummary();

    } catch (error) {
      console.error('❌ MONTHLY BACKUP FAILED:', error);
      this.errors.push(`Critical backup error: ${error.message}`);
      
      // Send failure notification
      await this.sendFailureNotification(error);
      
      return this.generateSummary();
    }
  }

  async ensureBackupDirectory() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      console.log(`📁 Monthly backup directory ready: ${this.backupDir}`);
    } catch (error) {
      throw new Error(`Failed to create backup directory: ${error.message}`);
    }
  }

  async generateSQLDump() {
    console.log('🗃️  GENERATING COMPLETE SQL DUMP');
    console.log('================================');

    const dumpFile = path.join(this.backupDir, `monthly-sql-dump-${this.backupMonth}.sql`);
    
    try {
      // Parse DATABASE_URL for pg_dump
      const dbUrl = new URL(process.env.DATABASE_URL);
      const dbConfig = {
        host: dbUrl.hostname,
        port: dbUrl.port || 5432,
        database: dbUrl.pathname.slice(1), // Remove leading /
        username: dbUrl.username,
        password: dbUrl.password
      };

      console.log(`🔗 Connecting to database: ${dbConfig.database}@${dbConfig.host}`);

      // Generate complete SQL dump with schema and data
      const pgDumpCommand = [
        'pg_dump',
        `--host=${dbConfig.host}`,
        `--port=${dbConfig.port}`,
        `--username=${dbConfig.username}`,
        `--dbname=${dbConfig.database}`,
        '--verbose',
        '--clean',
        '--create',
        '--if-exists',
        '--format=plain',
        '--no-owner',
        '--no-privileges',
        `--file=${dumpFile}`
      ].join(' ');

      // Set password via environment variable
      const env = { ...process.env, PGPASSWORD: dbConfig.password };

      console.log('⚡ Executing pg_dump...');
      await execAsync(pgDumpCommand, { env, timeout: 300000 }); // 5 minute timeout

      // Get file size
      const stats = await fs.stat(dumpFile);
      this.backupStats.sqlDumpSize = stats.size;

      console.log(`✅ SQL dump completed: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`📄 File: ${path.basename(dumpFile)}`);

      return dumpFile;

    } catch (error) {
      throw new Error(`SQL dump generation failed: ${error.message}`);
    }
  }

  async generateJSONBackup() {
    console.log('\n📊 GENERATING JSON DATA BACKUP');
    console.log('==============================');

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    try {
      const startDate = format(startOfMonth(new Date(`${this.backupMonth}-01`)), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(`${this.backupMonth}-01`)), 'yyyy-MM-dd');

      console.log(`📅 Date range: ${startDate} to ${endDate}`);

      const backupData = {
        metadata: {
          backupMonth: this.backupMonth,
          monthName: this.monthName,
          dateRange: { startDate, endDate },
          generatedAt: new Date().toISOString(),
          type: 'monthly-backup',
          version: '1.0'
        },
        monthlyData: {}
      };

      // Monthly attendance records
      console.log('📋 Backing up monthly attendance records...');
      const attendanceResult = await pool.query(`
        SELECT * FROM attendance_records 
        WHERE date >= $1 AND date <= $2
        ORDER BY employee_code, date
      `, [startDate, endDate]);

      backupData.monthlyData.attendance_records = attendanceResult.rows;
      this.backupStats.attendanceRecords = attendanceResult.rows.length;
      console.log(`   ✅ Attendance records: ${attendanceResult.rows.length}`);

      // Employee records snapshot for the month
      console.log('👥 Backing up employee records snapshot...');
      const employeeResult = await pool.query(`
        SELECT * FROM employee_records 
        ORDER BY employee_code
      `);

      backupData.monthlyData.employee_records = employeeResult.rows;
      this.backupStats.employeeRecords = employeeResult.rows.length;
      console.log(`   ✅ Employee records: ${employeeResult.rows.length}`);

      // Biometric exemptions for the month
      console.log('🔐 Backing up biometric exemptions...');
      const exemptionsResult = await pool.query(`
        SELECT * FROM biometric_exemptions
        WHERE created_at >= $1 AND created_at <= $2 || ' 23:59:59'
        ORDER BY created_at
      `, [startDate, endDate]);

      backupData.monthlyData.biometric_exemptions = exemptionsResult.rows;
      this.backupStats.biometricExemptions = exemptionsResult.rows.length;
      console.log(`   ✅ Biometric exemptions: ${exemptionsResult.rows.length}`);

      // System alerts for the month
      console.log('🚨 Backing up system alerts...');
      const alertsResult = await pool.query(`
        SELECT * FROM system_alerts
        WHERE created_at >= $1 AND created_at <= $2 || ' 23:59:59'
        ORDER BY created_at
      `, [startDate, endDate]);

      backupData.monthlyData.system_alerts = alertsResult.rows;
      this.backupStats.systemAlerts = alertsResult.rows.length;
      console.log(`   ✅ System alerts: ${alertsResult.rows.length}`);

      // WhatsApp messages for the month
      console.log('💬 Backing up WhatsApp messages...');
      const whatsappResult = await pool.query(`
        SELECT * FROM whatsapp_messages
        WHERE created_at >= $1 AND created_at <= $2 || ' 23:59:59'
        ORDER BY created_at
      `, [startDate, endDate]);

      backupData.monthlyData.whatsapp_messages = whatsappResult.rows;
      this.backupStats.whatsappMessages = whatsappResult.rows.length;
      console.log(`   ✅ WhatsApp messages: ${whatsappResult.rows.length}`);

      // Monthly statistics
      console.log('📈 Generating monthly statistics...');
      const statsResult = await pool.query(`
        SELECT 
          COUNT(*) as total_attendance_records,
          COUNT(DISTINCT employee_code) as unique_employees,
          COUNT(CASE WHEN check_in IS NOT NULL THEN 1 END) as total_punch_ins,
          COUNT(CASE WHEN check_out IS NOT NULL THEN 1 END) as total_punch_outs,
          ROUND(AVG(total_hours), 2) as avg_daily_hours,
          SUM(overtime_hours) as total_overtime_hours,
          SUM(regular_hours) as total_regular_hours
        FROM attendance_records 
        WHERE date >= $1 AND date <= $2
      `, [startDate, endDate]);

      backupData.monthlyData.monthly_statistics = statsResult.rows[0];
      console.log(`   ✅ Monthly statistics generated`);

      return backupData;

    } finally {
      await pool.end();
    }
  }

  async createBackupPackage(sqlDumpFile, jsonData) {
    console.log('\n📦 CREATING COMPREHENSIVE BACKUP PACKAGE');
    console.log('========================================');

    // Create complete backup package
    const packageData = {
      sql_dump: await fs.readFile(sqlDumpFile, 'utf8'),
      json_backup: jsonData,
      metadata: {
        created_at: new Date().toISOString(),
        backup_month: this.backupMonth,
        backup_type: 'monthly-comprehensive',
        sql_dump_size: this.backupStats.sqlDumpSize,
        restoration_instructions: {
          sql_restore: 'psql -h hostname -U username -d database < monthly-sql-dump.sql',
          requirements: ['PostgreSQL 12+', 'Node.js 18+', 'npm packages restored'],
          notes: 'Complete database restoration with schema and data'
        }
      }
    };

    console.log('🗜️  Compressing backup package...');
    const packageJson = JSON.stringify(packageData, null, 2);
    const originalSize = Buffer.byteLength(packageJson, 'utf8');
    
    const compressedData = await gzip(packageJson);
    const compressedSize = compressedData.length;
    
    this.backupStats.compressedSize = compressedSize;
    this.backupStats.compressionRatio = ((originalSize - compressedSize) / originalSize * 100);

    console.log(`📊 Original size: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📦 Compressed size: ${(compressedSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`⚡ Compression ratio: ${this.backupStats.compressionRatio.toFixed(1)}%`);

    // Save compressed package
    const packageFile = path.join(this.backupDir, `monthly-backup-${this.backupMonth}.json.gz`);
    await fs.writeFile(packageFile, compressedData);

    // Clean up temporary SQL dump
    await fs.unlink(sqlDumpFile);

    console.log(`💾 Monthly backup package saved: ${path.basename(packageFile)}`);
    return packageFile;
  }

  async verifyBackupIntegrity(backupFile) {
    console.log('\n🔍 VERIFYING BACKUP INTEGRITY');
    console.log('=============================');

    try {
      // Read and decompress
      const compressedData = await fs.readFile(backupFile);
      const decompressedData = await promisify(zlib.gunzip)(compressedData);
      const backupPackage = JSON.parse(decompressedData.toString());

      // Verify package structure
      if (!backupPackage.sql_dump || !backupPackage.json_backup || !backupPackage.metadata) {
        throw new Error('Invalid backup package structure');
      }

      // Verify SQL dump content
      if (!backupPackage.sql_dump.includes('CREATE DATABASE') || !backupPackage.sql_dump.includes('PostgreSQL database dump')) {
        throw new Error('Invalid SQL dump content');
      }

      // Verify JSON data structure
      const jsonBackup = backupPackage.json_backup;
      if (!jsonBackup.metadata || !jsonBackup.monthlyData) {
        throw new Error('Invalid JSON backup structure');
      }

      console.log(`✅ SQL dump verified: ${(backupPackage.sql_dump.length / 1024).toFixed(2)} KB`);
      console.log(`✅ JSON data verified: ${Object.keys(jsonBackup.monthlyData).length} data types`);
      console.log(`✅ Metadata verified: ${jsonBackup.metadata.type}`);
      console.log(`✅ Backup integrity confirmed`);

    } catch (error) {
      throw new Error(`Backup integrity verification failed: ${error.message}`);
    }
  }

  async cleanupOldBackups() {
    console.log('\n🧹 CLEANING UP OLD MONTHLY BACKUPS');
    console.log('==================================');

    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(file => file.startsWith('monthly-backup-') && file.endsWith('.json.gz'));

      // Keep last 24 months (2 years)
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - 24);
      let deletedCount = 0;

      for (const file of backupFiles) {
        const match = file.match(/monthly-backup-(\d{4}-\d{2})\.json\.gz/);
        if (match) {
          const fileDate = new Date(`${match[1]}-01`);
          if (fileDate < cutoffDate) {
            await fs.unlink(path.join(this.backupDir, file));
            deletedCount++;
            console.log(`🗑️  Deleted old backup: ${file}`);
          }
        }
      }

      console.log(`✅ Cleanup completed: ${deletedCount} old backups removed`);
      console.log(`📦 Total monthly backups retained: ${backupFiles.length - deletedCount}`);

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
        subject: `🚨 Monthly Backup Failure - ${this.monthName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc3545;">🚨 Monthly Backup System Failure</h2>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3>Backup Details</h3>
              <ul>
                <li><strong>Month:</strong> ${this.monthName}</li>
                <li><strong>Time:</strong> ${new Date().toISOString()}</li>
                <li><strong>System:</strong> Monthly Backup System</li>
                <li><strong>Type:</strong> Comprehensive SQL + JSON backup</li>
              </ul>
            </div>

            <div style="background-color: #f8d7da; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3>Error Details</h3>
              <p><strong>Error:</strong> ${error.message}</p>
              <p><strong>Stack:</strong> ${error.stack || 'Not available'}</p>
            </div>

            <div style="background-color: #d1ecf1; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3>Critical Action Required</h3>
              <ol>
                <li>Check PostgreSQL service status</li>
                <li>Verify pg_dump utility availability</li>
                <li>Check database connectivity and permissions</li>
                <li>Ensure sufficient disk space in /backups/monthly-backups</li>
                <li>Run manual backup: <code>node scripts/monthly-backup-system.js</code></li>
              </ol>
            </div>

            <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3>⚠️ Important Notice</h3>
              <p>Monthly backups are critical for compliance and disaster recovery. 
              Please resolve this issue immediately to ensure data integrity.</p>
            </div>

            <p style="margin-top: 30px; color: #6c757d; font-size: 14px;">
              This is an automated notification from the Nexlinx Monthly Backup System.
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
    console.log('\n📋 MONTHLY BACKUP SUMMARY');
    console.log('=========================');
    console.log(`📅 Backup Month: ${this.monthName}`);
    console.log(`⏰ Completed: ${new Date().toISOString()}`);
    console.log('');

    // Backup statistics
    console.log('📊 BACKUP STATISTICS');
    console.log('   ┌─────────────────────────────────────────────────────');
    console.log(`   │ Attendance Records: ${this.backupStats.attendanceRecords}`);
    console.log(`   │ Employee Records: ${this.backupStats.employeeRecords}`);
    console.log(`   │ Biometric Exemptions: ${this.backupStats.biometricExemptions}`);
    console.log(`   │ System Alerts: ${this.backupStats.systemAlerts}`);
    console.log(`   │ WhatsApp Messages: ${this.backupStats.whatsappMessages}`);
    console.log(`   │ SQL Dump Size: ${(this.backupStats.sqlDumpSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   │ Compressed Size: ${(this.backupStats.compressedSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   │ Compression Ratio: ${this.backupStats.compressionRatio.toFixed(1)}%`);
    console.log('   └─────────────────────────────────────────────────────');

    // Errors
    if (this.errors.length > 0) {
      console.log(`\n❌ ERRORS: ${this.errors.length}`);
      this.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    const success = this.errors.length === 0;
    console.log(`\n${success ? '✅' : '❌'} MONTHLY BACKUP ${success ? 'COMPLETED' : 'FAILED'}`);
    
    return {
      backupMonth: this.backupMonth,
      monthName: this.monthName,
      success: success,
      stats: this.backupStats,
      errors: this.errors.length,
      errorDetails: this.errors
    };
  }
}

// Run the backup if called directly
if (require.main === module) {
  const backup = new MonthlyBackupSystem();
  backup.run().then(result => {
    console.log('\n🎯 MONTHLY BACKUP RESULT:', JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = { MonthlyBackupSystem };