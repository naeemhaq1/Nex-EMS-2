#!/usr/bin/env node

/**
 * Test Script for Unified Metrics Recalculator
 * 
 * Tests the recalculator with a small date range for verification
 */

require('dotenv').config();
const { UnifiedMetricsRecalculator } = require('./unified-metrics-recalculator.cjs');

async function testRecalculator() {
  console.log('🧪 TESTING UNIFIED METRICS RECALCULATOR');
  console.log('========================================');
  console.log('');

  // Test with last 7 days for quick verification
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);

  const startDate = weekAgo.toISOString().split('T')[0];
  const endDate = today.toISOString().split('T')[0];

  console.log(`📅 Testing with date range: ${startDate} to ${endDate}`);
  console.log('⏱️  This should complete quickly for testing purposes');
  console.log('');

  const recalculator = new UnifiedMetricsRecalculator({
    processId: `test_${Date.now()}`,
    startDate: startDate,
    endDate: endDate,
    forceRecalculation: true
  });

  try {
    const result = await recalculator.run();
    
    console.log('\n✅ TEST COMPLETED SUCCESSFULLY');
    console.log('================================');
    console.log(`📊 Records Processed: ${result.stats.attendanceRecordsProcessed}`);
    console.log(`📈 Metrics Recalculated: ${result.stats.metricsRecalculated}`);
    console.log(`👥 Employees Processed: ${result.stats.employeesProcessed}`);
    console.log(`📅 Days Processed: ${result.stats.daysProcessed}`);
    console.log(`⏱️  Duration: ${result.duration ? Math.round(result.duration / 1000) : 'N/A'} seconds`);
    
    if (result.errors > 0) {
      console.log(`⚠️  Errors encountered: ${result.errors}`);
    }

    return result.success;

  } catch (error) {
    console.error('❌ TEST FAILED:', error);
    return false;
  }
}

// Run test if called directly
if (require.main === module) {
  testRecalculator().then(success => {
    console.log(`\n🎯 TEST ${success ? 'PASSED' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testRecalculator };