import { intelligentPollingService } from './services/intelligentPollingService';
import { attendanceConsistencyMonitor } from './services/attendanceConsistencyMonitor';

async function startIntelligentPolling() {
  console.log('=== STARTING INTELLIGENT POLLING SYSTEM ===');
  
  try {
    // Configure intelligent polling
    intelligentPollingService.updateConfig({
      intervalMinutes: 5,        // Poll every 5 minutes
      overlapMinutes: 2,         // 2-minute overlap buffer
      retrievalMinutes: 7,       // Retrieve 7 minutes of data
      maxRetries: 3,
      retryDelayMs: 30000,
      minAttendanceRate: 80,
      duplicateCleanupHours: 24
    });

    // Start intelligent polling service
    await intelligentPollingService.start();
    
    // Start consistency monitoring
    await attendanceConsistencyMonitor.start();
    
    // Set up event listeners
    intelligentPollingService.on('pollCompleted', (result) => {
      console.log(`[Main] Poll completed: ${result.recordsPulled} pulled, ${result.recordsProcessed} processed`);
      
      if (result.issues.length > 0) {
        console.log('[Main] Issues detected:');
        result.issues.forEach(issue => console.log(`  - ${issue}`));
      }
    });

    intelligentPollingService.on('pollFailed', (result) => {
      console.error(`[Main] Poll failed with ${result.issues.length} issues`);
      result.issues.forEach(issue => console.error(`  - ${issue}`));
    });

    attendanceConsistencyMonitor.on('consistencyCheck', (metrics) => {
      if (!metrics.isConsistent) {
        console.warn(`[Main] Consistency issues detected: ${metrics.issues.join(', ')}`);
      }
    });

    attendanceConsistencyMonitor.on('consistencyFailure', (metrics) => {
      console.error(`[Main] Critical consistency failure: ${metrics.attendanceRate.toFixed(1)}% attendance rate`);
    });

    console.log('✅ Intelligent polling system started successfully');
    console.log('Configuration:');
    console.log('- Poll every 5 minutes');
    console.log('- Retrieve 7 minutes of data with 2-minute overlap');
    console.log('- Automatic duplicate handling via staging table');
    console.log('- Consistency monitoring with 80% minimum attendance rate');
    console.log('- Extended polling on consecutive failures');
    
    // Keep the process running
    process.on('SIGINT', async () => {
      console.log('\n=== STOPPING INTELLIGENT POLLING SYSTEM ===');
      await intelligentPollingService.stop();
      await attendanceConsistencyMonitor.stop();
      console.log('✅ Intelligent polling system stopped');
      process.exit(0);
    });

    // Test initial poll
    console.log('\n=== PERFORMING INITIAL TEST POLL ===');
    const testResult = await intelligentPollingService.performIntelligentPoll();
    
    if (testResult.success) {
      console.log(`✅ Initial poll successful: ${testResult.recordsPulled} pulled, ${testResult.recordsProcessed} processed`);
    } else {
      console.log(`⚠️  Initial poll had issues: ${testResult.issues.join(', ')}`);
    }

  } catch (error) {
    console.error('❌ Failed to start intelligent polling system:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the system
startIntelligentPolling().catch(error => {
  console.error('Critical error starting intelligent polling:', error);
  process.exit(1);
});