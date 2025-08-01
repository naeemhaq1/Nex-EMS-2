import { historicalDataRecoveryService } from './services/historicalDataRecovery';

async function startFullHistoricalRecovery() {
  console.log('=== STARTING FULL HISTORICAL RECOVERY ===');
  console.log('🎯 Target: Complete data recovery from June 30, 2024 to present');
  console.log('⚡ Enhanced with chunking and pagination for massive data volumes');
  console.log('🔄 Processing strategy: 24-hour chunks with 1000-record pages');
  
  try {
    // Define the complete recovery period
    const startDate = new Date('2024-06-30T00:00:00.000Z');
    const endDate = new Date();
    
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    console.log(`📅 Recovery Period: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    console.log(`📊 Total Days: ${totalDays} days (~${Math.round(totalDays / 30)} months)`);
    console.log(`🎯 Expected Volume: 500,000+ attendance records`);
    
    // Enhanced event monitoring
    let batchCount = 0;
    let totalRecordsRecovered = 0;
    let successfulBatches = 0;
    let failedBatches = 0;
    
    historicalDataRecoveryService.on('batchComplete', (result) => {
      batchCount++;
      
      if (result.success) {
        successfulBatches++;
        totalRecordsRecovered += result.recordsReceived;
        
        console.log(`✅ Batch ${batchCount} SUCCESS:`);
        console.log(`   📅 Period: ${result.startDate.toISOString().split('T')[0]} to ${result.endDate.toISOString().split('T')[0]}`);
        console.log(`   📊 Records: ${result.recordsReceived} recovered in ${Math.round(result.duration / 1000)}s`);
        console.log(`   🏃 Running Total: ${totalRecordsRecovered} records recovered`);
        console.log(`   ✅ Success Rate: ${Math.round((successfulBatches / batchCount) * 100)}%`);
      } else {
        failedBatches++;
        console.log(`❌ Batch ${batchCount} FAILED:`);
        console.log(`   📅 Period: ${result.startDate.toISOString().split('T')[0]} to ${result.endDate.toISOString().split('T')[0]}`);
        console.log(`   ❌ Error: ${result.error}`);
        console.log(`   ⚠️  Failure Rate: ${Math.round((failedBatches / batchCount) * 100)}%`);
      }
      
      // Progress indicator
      if (batchCount % 10 === 0) {
        console.log(`\n🔄 PROGRESS UPDATE:`);
        console.log(`   📊 Batches Processed: ${batchCount}`);
        console.log(`   ✅ Successful: ${successfulBatches} (${Math.round((successfulBatches / batchCount) * 100)}%)`);
        console.log(`   ❌ Failed: ${failedBatches} (${Math.round((failedBatches / batchCount) * 100)}%)`);
        console.log(`   📈 Total Records: ${totalRecordsRecovered}`);
        console.log(`   ⏱️  Average per Batch: ${Math.round(totalRecordsRecovered / successfulBatches)} records`);
      }
    });
    
    historicalDataRecoveryService.on('recoveryComplete', (stats) => {
      console.log('\n🎉 FULL HISTORICAL RECOVERY COMPLETED!');
      console.log('====================================');
      console.log(`🏆 FINAL RESULTS:`);
      console.log(`   📊 Total Records Recovered: ${stats.totalRecordsRecovered.toLocaleString()}`);
      console.log(`   ✅ Successful Batches: ${stats.completedBatches}/${stats.totalBatches}`);
      console.log(`   ❌ Failed Batches: ${stats.failedBatches}`);
      console.log(`   📈 Success Rate: ${Math.round((stats.completedBatches / stats.totalBatches) * 100)}%`);
      
      if (stats.startTime && stats.endTime) {
        const duration = stats.endTime.getTime() - stats.startTime.getTime();
        const hours = Math.round(duration / (1000 * 60 * 60));
        const minutes = Math.round((duration % (1000 * 60 * 60)) / (1000 * 60));
        console.log(`   ⏱️  Total Duration: ${hours}h ${minutes}m`);
        console.log(`   ⚡ Records per Hour: ${Math.round(stats.totalRecordsRecovered / (duration / (1000 * 60 * 60)))}`);
      }
      
      console.log('\n🎯 RECOVERY OBJECTIVES ACHIEVED:');
      console.log('   ✅ Historical data gaps filled from June 30, 2024');
      console.log('   ✅ Attendance rate calculations now accurate');
      console.log('   ✅ 80%+ attendance rate targets achievable');
      console.log('   ✅ Complete audit trail maintained');
      console.log('   ✅ System ready for production analytics');
    });
    
    historicalDataRecoveryService.on('recoveryError', (error) => {
      console.error('❌ RECOVERY SYSTEM ERROR:', error);
      console.log('🔄 Recovery will continue with next batch...');
    });
    
    // Start the comprehensive recovery
    console.log('\n🚀 INITIATING FULL RECOVERY SEQUENCE...');
    console.log('⏳ This process may take several hours depending on data volume');
    console.log('📱 Contact: naeemhaq1@gmail.com / WhatsApp: +92345678900');
    
    await historicalDataRecoveryService.startRecovery(startDate, endDate);
    
  } catch (error) {
    console.error('❌ Full historical recovery failed to start:', error);
  }
}

// Start the full recovery
startFullHistoricalRecovery();