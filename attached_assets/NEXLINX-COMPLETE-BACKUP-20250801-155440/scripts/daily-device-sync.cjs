#!/usr/bin/env node

/**
 * Daily Device Synchronization Script
 * 
 * This script runs daily to:
 * 1. Fetch latest biometric devices from BioTime API
 * 2. Update device status and information
 * 3. Log device health and connectivity status
 * 4. Prepare for biometric exemption monitoring
 * 
 * Schedule: Daily at 5:30 AM (before exemption monitor)
 */

import { config } from 'dotenv';
config();

import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, sql } from 'drizzle-orm';
import { format } from 'date-fns';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

class DailyDeviceSync {
  constructor() {
    this.syncDate = format(new Date(), 'yyyy-MM-dd');
    this.devicesFound = [];
    this.devicesActive = [];
    this.devicesInactive = [];
    this.errors = [];
  }

  async run() {
    console.log('🔧 DAILY DEVICE SYNCHRONIZATION');
    console.log('================================');
    console.log(`📅 Sync Date: ${this.syncDate}`);
    console.log(`⏰ Start Time: ${new Date().toISOString()}`);
    console.log('');

    try {
      // Step 1: Fetch devices from BioTime API
      await this.fetchBioTimeDevices();

      // Step 2: Update device database records
      await this.updateDeviceRecords();

      // Step 3: Check device health status
      await this.checkDeviceHealth();

      // Step 4: Generate sync summary
      return this.generateSummary();

    } catch (error) {
      console.error('❌ CRITICAL ERROR in DailyDeviceSync:', error);
      this.errors.push(`Critical system error: ${error.message}`);
      return this.generateSummary();
    } finally {
      await pool.end();
    }
  }

  async fetchBioTimeDevices() {
    console.log('🔍 FETCHING DEVICES FROM BIOTIME API');
    console.log('====================================');

    try {
      // Import DeviceDiscoveryService dynamically
      const { DeviceDiscoveryService } = await import('../server/services/deviceDiscovery.js');
      const deviceDiscovery = new DeviceDiscoveryService();

      console.log('🌐 Connecting to BioTime API...');
      const deviceData = await deviceDiscovery.discoverDevices();

      if (!deviceData || !deviceData.devices) {
        throw new Error('No device data received from BioTime API');
      }

      this.devicesFound = deviceData.devices;
      console.log(`✅ Successfully fetched ${this.devicesFound.length} devices`);

      // Categorize devices by status
      this.devicesActive = this.devicesFound.filter(device => device.is_active);
      this.devicesInactive = this.devicesFound.filter(device => !device.is_active);

      console.log(`   📱 Active Devices: ${this.devicesActive.length}`);
      console.log(`   📴 Inactive Devices: ${this.devicesInactive.length}`);

      // Log device details
      if (this.devicesActive.length > 0) {
        console.log('\n📱 ACTIVE DEVICES:');
        this.devicesActive.forEach((device, index) => {
          console.log(`   ${index + 1}. ${device.alias || device.terminal_name}`);
          console.log(`      ID: ${device.id} | IP: ${device.ip_address}`);
          console.log(`      Area: ${device.area_name || 'Unknown'}`);
          console.log(`      Users: ${device.user_count} | Transactions: ${device.transaction_count}`);
        });
      }

      if (this.devicesInactive.length > 0) {
        console.log('\n📴 INACTIVE DEVICES:');
        this.devicesInactive.forEach((device, index) => {
          console.log(`   ${index + 1}. ${device.alias || device.terminal_name}`);
          console.log(`      ID: ${device.id} | IP: ${device.ip_address}`);
          console.log(`      Last Activity: ${device.last_activity}`);
        });
      }

    } catch (error) {
      console.error('❌ Failed to fetch BioTime devices:', error);
      this.errors.push(`BioTime API error: ${error.message}`);
      this.devicesFound = [];
    }
  }

  async updateDeviceRecords() {
    console.log('\n💾 UPDATING DEVICE RECORDS');
    console.log('===========================');

    if (this.devicesFound.length === 0) {
      console.log('⚠️  No devices to update');
      return;
    }

    try {
      // Create or update devices table record for sync tracking
      await this.createDeviceSyncRecord();

      console.log(`✅ Device records updated successfully`);
      console.log(`   📊 Total Devices: ${this.devicesFound.length}`);
      console.log(`   ✅ Active: ${this.devicesActive.length}`);
      console.log(`   ❌ Inactive: ${this.devicesInactive.length}`);

    } catch (error) {
      console.error('❌ Failed to update device records:', error);
      this.errors.push(`Database update error: ${error.message}`);
    }
  }

  async createDeviceSyncRecord() {
    try {
      // Create a daily sync log in database
      await db.execute(sql`
        INSERT INTO device_sync_log (
          sync_date,
          total_devices,
          active_devices,
          inactive_devices,
          device_details,
          created_at
        ) VALUES (
          ${this.syncDate},
          ${this.devicesFound.length},
          ${this.devicesActive.length},
          ${this.devicesInactive.length},
          ${JSON.stringify(this.devicesFound)},
          NOW()
        )
        ON CONFLICT (sync_date) 
        DO UPDATE SET
          total_devices = EXCLUDED.total_devices,
          active_devices = EXCLUDED.active_devices,
          inactive_devices = EXCLUDED.inactive_devices,
          device_details = EXCLUDED.device_details,
          updated_at = NOW()
      `);
    } catch (error) {
      // If table doesn't exist, create it
      if (error.message.includes('relation "device_sync_log" does not exist')) {
        await this.createDeviceSyncTable();
        // Retry the insert
        await this.createDeviceSyncRecord();
      } else {
        throw error;
      }
    }
  }

  async createDeviceSyncTable() {
    console.log('📋 Creating device_sync_log table...');
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS device_sync_log (
        id SERIAL PRIMARY KEY,
        sync_date DATE UNIQUE NOT NULL,
        total_devices INTEGER NOT NULL DEFAULT 0,
        active_devices INTEGER NOT NULL DEFAULT 0,
        inactive_devices INTEGER NOT NULL DEFAULT 0,
        device_details JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    console.log('✅ device_sync_log table created');
  }

  async checkDeviceHealth() {
    console.log('\n🏥 DEVICE HEALTH CHECK');
    console.log('======================');

    if (this.devicesActive.length === 0) {
      console.log('⚠️  WARNING: No active devices found!');
      this.errors.push('No active biometric devices available');
      return;
    }

    // Check device connectivity and transaction counts
    const healthyDevices = [];
    const concernedDevices = [];

    this.devicesActive.forEach(device => {
      const lastActivity = new Date(device.last_activity);
      const hoursSinceActivity = (new Date() - lastActivity) / (1000 * 60 * 60);

      const deviceHealth = {
        device: device,
        hoursSinceActivity: Math.round(hoursSinceActivity * 100) / 100,
        transactionCount: device.transaction_count || 0,
        userCount: device.user_count || 0,
        isHealthy: hoursSinceActivity < 24 && device.transaction_count > 0
      };

      if (deviceHealth.isHealthy) {
        healthyDevices.push(deviceHealth);
      } else {
        concernedDevices.push(deviceHealth);
      }
    });

    console.log(`✅ Healthy Devices: ${healthyDevices.length}`);
    console.log(`⚠️  Devices of Concern: ${concernedDevices.length}`);

    if (concernedDevices.length > 0) {
      console.log('\n⚠️  DEVICES REQUIRING ATTENTION:');
      concernedDevices.forEach((device, index) => {
        console.log(`   ${index + 1}. ${device.device.alias || device.device.terminal_name}`);
        console.log(`      Last Activity: ${device.hoursSinceActivity} hours ago`);
        console.log(`      Transactions: ${device.transactionCount}`);
        console.log(`      Users: ${device.userCount}`);
      });
    }

    // Log critical alerts
    if (healthyDevices.length === 0) {
      this.errors.push('CRITICAL: No healthy biometric devices found');
    } else if (healthyDevices.length < 3) {
      this.errors.push(`WARNING: Only ${healthyDevices.length} healthy devices available`);
    }
  }

  generateSummary() {
    console.log('\n📋 DEVICE SYNC SUMMARY');
    console.log('======================');
    console.log(`📅 Date: ${this.syncDate}`);
    console.log(`⏰ Completed: ${new Date().toISOString()}`);
    console.log('');

    console.log(`📊 DEVICE STATISTICS:`);
    console.log(`   Total Devices Found: ${this.devicesFound.length}`);
    console.log(`   Active Devices: ${this.devicesActive.length}`);
    console.log(`   Inactive Devices: ${this.devicesInactive.length}`);

    if (this.errors.length > 0) {
      console.log(`\n❌ ISSUES DETECTED: ${this.errors.length}`);
      this.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    const syncStatus = this.devicesActive.length > 0 ? 'SUCCESS' : 'WARNING';
    console.log(`\n🎯 SYNC STATUS: ${syncStatus}`);

    return {
      syncDate: this.syncDate,
      totalDevices: this.devicesFound.length,
      activeDevices: this.devicesActive.length,
      inactiveDevices: this.devicesInactive.length,
      errors: this.errors.length,
      status: syncStatus,
      details: {
        devices: this.devicesFound,
        errors: this.errors
      }
    };
  }
}

// Run the sync if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const deviceSync = new DailyDeviceSync();
  deviceSync.run()
    .then(summary => {
      console.log('\n🎯 SYNC EXECUTION SUMMARY:');
      console.log(`   Status: ${summary.status}`);
      console.log(`   Total Devices: ${summary.totalDevices}`);
      console.log(`   Active Devices: ${summary.activeDevices}`);
      console.log(`   Errors: ${summary.errors}`);
      process.exit(summary.errors > 0 && summary.activeDevices === 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('💥 FATAL ERROR:', error);
      process.exit(1);
    });
}

export { DailyDeviceSync };