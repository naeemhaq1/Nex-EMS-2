#!/usr/bin/env node

/**
 * Test Script for Biometric Exemption Monitor
 * 
 * This script tests the daily monitoring system to ensure it works correctly
 * before setting up cron jobs. It simulates various scenarios.
 */

import { config } from 'dotenv';
config();

import { BiometricExemptionMonitor } from './daily-biometric-exemption-monitor.js';
import { DailyDeviceSync } from './daily-device-sync.js';

class BiometricMonitorTester {
  constructor() {
    this.testResults = {
      deviceSync: null,
      exemptionMonitor: null,
      errors: []
    };
  }

  async runTests() {
    console.log('🧪 BIOMETRIC MONITORING SYSTEM TEST');
    console.log('===================================');
    console.log(`⏰ Test Start: ${new Date().toISOString()}`);
    console.log('');

    try {
      // Test 1: Device Synchronization
      await this.testDeviceSync();

      // Test 2: Exemption Monitoring
      await this.testExemptionMonitor();

      // Test 3: Generate Test Report
      this.generateTestReport();

    } catch (error) {
      console.error('💥 CRITICAL TEST ERROR:', error);
      this.testResults.errors.push(`Critical error: ${error.message}`);
    }

    return this.testResults;
  }

  async testDeviceSync() {
    console.log('🔧 TEST 1: DEVICE SYNCHRONIZATION');
    console.log('=================================');

    try {
      const deviceSync = new DailyDeviceSync();
      const result = await deviceSync.run();
      
      this.testResults.deviceSync = result;
      
      if (result.status === 'SUCCESS') {
        console.log('✅ Device sync test PASSED');
      } else {
        console.log('⚠️  Device sync test WARNING - check device availability');
      }

    } catch (error) {
      console.error('❌ Device sync test FAILED:', error);
      this.testResults.errors.push(`Device sync error: ${error.message}`);
    }

    console.log('');
  }

  async testExemptionMonitor() {
    console.log('👥 TEST 2: EXEMPTION MONITORING');
    console.log('===============================');

    try {
      const exemptionMonitor = new BiometricExemptionMonitor();
      const result = await exemptionMonitor.run();
      
      this.testResults.exemptionMonitor = result;
      
      if (result.errors === 0) {
        console.log('✅ Exemption monitor test PASSED');
      } else {
        console.log('⚠️  Exemption monitor test completed with warnings');
      }

    } catch (error) {
      console.error('❌ Exemption monitor test FAILED:', error);
      this.testResults.errors.push(`Exemption monitor error: ${error.message}`);
    }

    console.log('');
  }

  generateTestReport() {
    console.log('📋 TEST EXECUTION REPORT');
    console.log('========================');
    
    // Device sync results
    if (this.testResults.deviceSync) {
      console.log('🔧 DEVICE SYNC RESULTS:');
      console.log(`   Status: ${this.testResults.deviceSync.status}`);
      console.log(`   Total Devices: ${this.testResults.deviceSync.totalDevices}`);
      console.log(`   Active Devices: ${this.testResults.deviceSync.activeDevices}`);
      console.log(`   Errors: ${this.testResults.deviceSync.errors}`);
      console.log('');
    }

    // Exemption monitor results
    if (this.testResults.exemptionMonitor) {
      console.log('👥 EXEMPTION MONITOR RESULTS:');
      console.log(`   Exemptions Removed: ${this.testResults.exemptionMonitor.exemptionsRemoved}`);
      console.log(`   Exemptions Kept: ${this.testResults.exemptionMonitor.exemptionsKept}`);
      console.log(`   Errors: ${this.testResults.exemptionMonitor.errors}`);
      console.log('');
    }

    // Overall test status
    const overallStatus = this.testResults.errors.length === 0 ? 'PASSED' : 'FAILED';
    console.log(`🎯 OVERALL TEST STATUS: ${overallStatus}`);
    
    if (this.testResults.errors.length > 0) {
      console.log('❌ TEST ERRORS:');
      this.testResults.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    console.log('');
    console.log('🚀 SYSTEM READINESS:');
    
    const deviceReady = this.testResults.deviceSync?.activeDevices > 0;
    const monitorReady = this.testResults.exemptionMonitor?.errors === 0;
    
    console.log(`   Device Sync: ${deviceReady ? '✅ Ready' : '❌ Not Ready'}`);
    console.log(`   Exemption Monitor: ${monitorReady ? '✅ Ready' : '❌ Not Ready'}`);
    
    if (deviceReady && monitorReady) {
      console.log('');
      console.log('🎉 SYSTEM READY FOR CRON DEPLOYMENT!');
      console.log('');
      console.log('📝 NEXT STEPS:');
      console.log('   1. Run: chmod +x scripts/setup-cron-jobs.sh');
      console.log('   2. Run: ./scripts/setup-cron-jobs.sh');
      console.log('   3. Monitor: tail -f logs/cron/*.log');
    } else {
      console.log('');
      console.log('⚠️  SYSTEM NOT READY - Fix issues before deployment');
    }
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new BiometricMonitorTester();
  tester.runTests()
    .then(results => {
      const exitCode = results.errors.length > 0 ? 1 : 0;
      console.log(`\n🏁 Tests completed with exit code: ${exitCode}`);
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('💥 FATAL TEST ERROR:', error);
      process.exit(1);
    });
}

export { BiometricMonitorTester };