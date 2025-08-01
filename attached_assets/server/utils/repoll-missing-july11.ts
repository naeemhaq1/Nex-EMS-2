import { bioTimeService } from '../services/biotimeService';
import { db } from '../db';
import { attendancePullExt } from '@shared/schema';
import { sql } from 'drizzle-orm';

/**
 * Re-poll missing data for July 11th, 2025
 * Analysis shows only 230 records vs expected 450-500 for a Friday
 */

async function repollMissingJuly11() {
  console.log('🔄 Starting targeted re-poll for July 11th, 2025 missing data...');
  
  try {
    // Define July 11th time range (full day in Pakistan timezone)
    const july11Start = new Date('2025-07-11T00:00:00+05:00'); // PKT timezone
    const july11End = new Date('2025-07-11T23:59:59+05:00');
    
    console.log(`📅 Re-polling range: ${july11Start.toISOString()} to ${july11End.toISOString()}`);
    
    // Get current record count for July 11th
    const currentCount = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM attendance_pull_ext 
      WHERE DATE(all_fields->>'punch_time') = '2025-07-11'
    `);
    
    const currentRecordCount = parseInt(currentCount.rows[0].count || '0');
    console.log(`📊 Current July 11th records: ${currentRecordCount}`);
    
    // Get list of existing biotime_ids for July 11th to avoid duplicates
    const existingBiotimeIds = await db.execute(sql`
      SELECT biotime_id 
      FROM attendance_pull_ext 
      WHERE DATE(all_fields->>'punch_time') = '2025-07-11'
      AND biotime_id IS NOT NULL
    `);
    
    const existingIds = new Set(existingBiotimeIds.rows.map(row => row.biotime_id));
    console.log(`🔍 Found ${existingIds.size} existing biotime_ids for July 11th`);
    
    // Re-poll the data with fixed duplicate detection
    const pullResult = await bioTimeService.pullAttendanceData(july11Start, july11End);
    
    if (pullResult.success) {
      console.log(`✅ Re-poll successful: ${pullResult.recordsPulled} new records added`);
      
      // Get updated count
      const newCount = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM attendance_pull_ext 
        WHERE DATE(all_fields->>'punch_time') = '2025-07-11'
      `);
      
      const newRecordCount = parseInt(newCount.rows[0].count || '0');
      const recordsAdded = newRecordCount - currentRecordCount;
      console.log(`📈 Records added: ${recordsAdded} (${currentRecordCount} → ${newRecordCount})`);
      
      // Show breakdown of new data
      const breakdown = await db.execute(sql`
        SELECT 
          COUNT(*) as total_records,
          COUNT(DISTINCT emp_code) as unique_employees,
          COUNT(CASE WHEN all_fields->>'punch_state' = '0' THEN 1 END) as punch_ins,
          COUNT(CASE WHEN all_fields->>'punch_state' = '1' THEN 1 END) as punch_outs
        FROM attendance_pull_ext 
        WHERE DATE(all_fields->>'punch_time') = '2025-07-11'
      `);
      
      console.log(`📊 Updated July 11th summary:`, breakdown.rows[0]);
      
    } else {
      console.error(`❌ Re-poll failed: ${pullResult.error}`);
    }
    
  } catch (error) {
    console.error('❌ Re-poll script failed:', error);
  }
}

// Run the re-poll
repollMissingJuly11().then(() => {
  console.log('🏁 Re-poll script completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Re-poll script error:', error);
  process.exit(1);
});