import { recalculateMetricsForDate } from './services/dailyAttendanceMetrics';

async function recalculateYesterdayMetrics() {
  try {
    // Get yesterday's date in Pakistan timezone
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    const dateString = yesterday.toISOString().split('T')[0];
    
    console.log(`Recalculating metrics for yesterday: ${dateString}`);
    
    await recalculateMetricsForDate(dateString);
    
    console.log('✅ Yesterday metrics recalculated successfully with corrected formula');
  } catch (error) {
    console.error('❌ Error recalculating yesterday metrics:', error);
  }
}

// Run the recalculation
recalculateYesterdayMetrics();