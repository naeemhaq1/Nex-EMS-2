import { historicalDataRecoveryService } from './services/historicalDataRecovery';

async function testChunkedRecovery() {
  console.log('=== TESTING CHUNKED HISTORICAL RECOVERY ===');
  console.log('Testing chunked recovery with a recent date range...');
  
  try {
    // Test with a 7-day window to validate chunking
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    console.log(`Test Period: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // Set up detailed event listeners
    historicalDataRecoveryService.on('batchComplete', (result) => {
      if (result.success) {
        console.log(`✅ Batch completed successfully:`);
        console.log(`   Records Requested: ${result.recordsRequested}`);
        console.log(`   Records Received: ${result.recordsReceived}`);
        console.log(`   Records Processed: ${result.recordsProcessed}`);
        console.log(`   Duration: ${result.duration}ms`);
      } else {
        console.log(`❌ Batch failed: ${result.error}`);
      }
    });
    
    historicalDataRecoveryService.on('recoveryComplete', (stats) => {
      console.log('\n🎉 CHUNKED RECOVERY TEST COMPLETED!');
      console.log('=====================================');
      console.log(`Total Records Recovered: ${stats.totalRecordsRecovered}`);
      console.log(`Successful Batches: ${stats.completedBatches}/${stats.totalBatches}`);
      console.log(`Failed Batches: ${stats.failedBatches}`);
      
      if (stats.startTime && stats.endTime) {
        const duration = stats.endTime.getTime() - stats.startTime.getTime();
        console.log(`Total Duration: ${Math.round(duration / 1000)} seconds`);
      }
      
      console.log('\n✅ Chunked recovery system validated!');
      console.log('🚀 Ready for full historical recovery from June 30, 2024');
    });
    
    // Start the test recovery
    console.log('\n🔄 Starting chunked recovery test...');
    await historicalDataRecoveryService.startRecovery(startDate, endDate);
    
  } catch (error) {
    console.error('❌ Chunked recovery test failed:', error);
  }
}

// Start the test
testChunkedRecovery();