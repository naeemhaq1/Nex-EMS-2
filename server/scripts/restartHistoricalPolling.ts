#!/usr/bin/env node

/**
 * Script to restart Historical Polling Service with correct June 1st date
 */

import { historicalPollingService } from '../services/historicalPollingService';

async function restartHistoricalPolling() {
  try {
    console.log('🔄 Restarting Historical Polling Service...');
    console.log('📅 Target: June 1st 2025 onwards - corrected date range');
    
    // Stop current service
    historicalPollingService.stop();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Start with correct date range
    await historicalPollingService.start();
    
    console.log('✅ Historical polling service restarted successfully');
    console.log('📊 Service Status:', historicalPollingService.getStatus());
    
    // Show progress updates
    const intervalId = setInterval(() => {
      const status = historicalPollingService.getStatus();
      console.log(`📈 Progress: ${status.totalProcessed} records processed, ${status.errors.length} errors`);
      if (status.currentDate) {
        console.log(`📅 Current processing date: ${status.currentDate}`);
      }
    }, 30000); // Every 30 seconds
    
    // Keep the script running
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping historical polling service...');
      clearInterval(intervalId);
      historicalPollingService.stop();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Error restarting historical polling service:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

// Run the script
restartHistoricalPolling();