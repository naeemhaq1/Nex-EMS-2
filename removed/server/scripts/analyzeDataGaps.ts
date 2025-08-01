#!/usr/bin/env node

/**
 * Script to analyze data gaps from June 1st onwards
 */

import { targetedGapFiller } from '../services/targetedGapFiller';

async function analyzeDataGaps() {
  try {
    console.log('🔍 Analyzing data gaps from June 1st onwards...');
    
    // Get gap analysis
    const analysis = await targetedGapFiller.getGapAnalysis();
    
    console.log('📊 DATA GAP ANALYSIS:');
    console.log(`  Total Records: ${analysis.totalRecords}`);
    console.log(`  Total Gaps: ${analysis.totalGaps}`);
    console.log(`  Contiguity: ${analysis.contiguity}%`);
    console.log(`  Date Range: ${analysis.dateRange}`);
    
    if (analysis.contiguity < 50) {
      console.log('⚠️  LOW CONTIGUITY DETECTED - Starting targeted gap filling...');
      
      const result = await targetedGapFiller.fillGapsFromJune1st();
      
      console.log('📈 GAP FILLING RESULTS:');
      console.log(`  Date Range: ${result.dateRange}`);
      console.log(`  Gaps Before: ${result.gapsBefore}`);
      console.log(`  Gaps After: ${result.gapsAfter}`);
      console.log(`  Records Added: ${result.recordsAdded}`);
      console.log(`  Contiguity Improvement: +${result.contiguityImprovement.toFixed(1)}%`);
      
      console.log('✅ Gap filling completed successfully!');
    } else {
      console.log('✅ Data contiguity is acceptable');
    }
    
  } catch (error) {
    console.error('❌ Error analyzing data gaps:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

// Run the script
analyzeDataGaps();