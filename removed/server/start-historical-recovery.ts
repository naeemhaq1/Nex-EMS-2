import { historicalDataRecoveryService } from './services/historicalDataRecovery';

async function startHistoricalRecovery() {
  console.log('=== STARTING HISTORICAL DATA RECOVERY ===');
  console.log('Target Period: June 30, 2024 - Present');
  console.log('Objective: Recover all missing attendance records\n');
  
  try {
    // Define recovery period
    const startDate = new Date('2024-06-30T00:00:00.000Z');
    const endDate = new Date(); // Current date
    
    console.log(`Recovery Period: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    console.log(`Total Days: ${Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} days`);
    
    // Set up event listeners
    historicalDataRecoveryService.on('batchComplete', (result) => {
      if (result.success) {
        console.log(`✅ Batch completed: ${result.recordsReceived} records recovered in ${result.duration}ms`);
      } else {
        console.log(`❌ Batch failed: ${result.error}`);
      }
    });
    
    historicalDataRecoveryService.on('recoveryComplete', (stats) => {
      console.log('\n🎉 HISTORICAL RECOVERY COMPLETED!');
      console.log('=================================');
      console.log(`Total Records Recovered: ${stats.totalRecordsRecovered}`);
      console.log(`Successful Batches: ${stats.completedBatches}/${stats.totalBatches}`);
      console.log(`Failed Batches: ${stats.failedBatches}`);
      
      if (stats.startTime && stats.endTime) {
        const duration = stats.endTime.getTime() - stats.startTime.getTime();
        console.log(`Total Duration: ${Math.round(duration / 1000)} seconds`);
      }
    });
    
    historicalDataRecoveryService.on('recoveryError', (error) => {
      console.error('❌ Recovery failed:', error);
    });
    
    // Start the recovery process
    console.log('\n🚀 Starting recovery process...');
    await historicalDataRecoveryService.startRecovery(startDate, endDate);
    
  } catch (error) {
    console.error('Failed to start historical recovery:', error);
  }
}

// Start the recovery
startHistoricalRecovery();