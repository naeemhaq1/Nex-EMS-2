import { timestampBasedPollingService } from './services/timestampBasedPollingService';
import { aggregateDataGapDetector } from './services/aggregateDataGapDetector';

async function startTimestampPolling() {
  console.log('=== STARTING TIMESTAMP-BASED POLLING SYSTEM ===');
  
  try {
    // Start the timestamp-based polling service
    console.log('\n1. STARTING TIMESTAMP-BASED POLLING');
    await timestampBasedPollingService.start();
    
    // Start the gap detector
    console.log('\n2. STARTING AGGREGATE GAP DETECTOR');
    await aggregateDataGapDetector.start();
    
    // Get initial status
    console.log('\n3. CHECKING SYSTEM STATUS');
    const pollingStatus = await timestampBasedPollingService.getStatus();
    console.log('Polling Status:', {
      isRunning: pollingStatus.isRunning,
      intervalMinutes: pollingStatus.pollingIntervalMinutes,
      totalRecords: pollingStatus.totalRecordsInDatabase,
      lastTimestamp: pollingStatus.lastRecordTimestamp
    });
    
    // Detect any existing gaps
    console.log('\n4. DETECTING EXISTING DATA GAPS');
    const gapSummary = await aggregateDataGapDetector.getGapSummary();
    console.log('Gap Summary:', gapSummary);
    
    if (gapSummary.totalMissingRecords > 0) {
      console.log('\n5. CALCULATING OPTIMAL RECOVERY STRATEGY');
      const optimalWindow = await aggregateDataGapDetector.calculateOptimalPollingWindow();
      console.log('Optimal Strategy:', optimalWindow);
    }
    
    // Perform initial test poll
    console.log('\n6. PERFORMING INITIAL TEST POLL');
    const testResult = await timestampBasedPollingService.triggerManualPoll();
    console.log('Test Poll Result:', {
      success: testResult.success,
      recordsPulled: testResult.recordsPulled,
      recordsProcessed: testResult.recordsProcessed,
      error: testResult.error
    });
    
    console.log('\n✅ TIMESTAMP-BASED POLLING SYSTEM STARTED');
    console.log('Features:');
    console.log('  🎯 Exact timestamp continuation (no gaps, no duplicates)');
    console.log('  📊 Automatic gap detection and recovery');
    console.log('  ⚡ Efficient API usage (only new records)');
    console.log('  🔄 Handles network outages gracefully');
    console.log('  📈 Real-time monitoring and alerts');
    
    // Keep the process running
    console.log('\n📡 System is now running...');
    console.log('Press Ctrl+C to stop');
    
    // Set up graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down timestamp-based polling...');
      await timestampBasedPollingService.stop();
      await aggregateDataGapDetector.stop();
      console.log('✅ Shutdown complete');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Failed to start timestamp-based polling:', error);
    process.exit(1);
  }
}

// Start the system
startTimestampPolling();