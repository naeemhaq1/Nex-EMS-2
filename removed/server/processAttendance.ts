import { db } from './db';
import { storage } from './storage';

async function processAttendanceData() {
  try {
    console.log('Starting attendance data processing...');
    const processed = await storage.processAttendanceData();
    console.log(`Processed ${processed} attendance records`);
    return processed;
  } catch (error) {
    console.error('Error processing attendance data:', error);
    throw error;
  }
}

// Run the processing
processAttendanceData()
  .then((count) => {
    console.log(`Successfully processed ${count} attendance records`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to process attendance data:', error);
    process.exit(1);
  });