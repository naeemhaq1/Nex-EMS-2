const { db } = require('./db.ts');
const { sql } = require('drizzle-orm');
const { biotimeSyncData, attendanceRecords } = require('../shared/schema.ts');

async function processUnprocessedData() {
  console.log('🚀 Processing any unprocessed BioTime data to attendance_records...');
  
  try {
    // Get all biotime_sync_data records that don't have corresponding attendance_records
    const unprocessedQuery = await db.execute(sql`
      SELECT bsd.*
      FROM biotime_sync_data bsd
      LEFT JOIN attendance_records ar ON bsd.biotime_id = ar.biotime_id
      WHERE ar.id IS NULL
        AND DATE(bsd.punch_time) IN ('2025-07-20', '2025-07-21')
      ORDER BY bsd.punch_time
    `);
    
    const unprocessedRecords = unprocessedQuery.rows;
    console.log(`📊 Found ${unprocessedRecords.length} unprocessed records for July 20-21`);
    
    let processed = 0;
    
    for (const record of unprocessedRecords) {
      try {
        const empCode = record.employee_code;
        const punchTime = new Date(record.punch_time);
        const biotimeId = record.biotime_id;
        const dateKey = punchTime.toISOString().split('T')[0];
        
        if (!empCode || !punchTime || !biotimeId) {
          console.log(`⚠️ Skipping record with missing data: empCode=${empCode}, biotimeId=${biotimeId}`);
          continue;
        }
        
        // Check if we have an existing attendance record for this employee on this date
        const existingQuery = await db.execute(sql`
          SELECT id FROM attendance_records 
          WHERE employee_code = ${empCode} 
            AND DATE(date) = ${dateKey}
        `);
        
        if (existingQuery.rows.length > 0) {
          // Update existing record with punch-out if this could be a punch-out
          const attendanceId = existingQuery.rows[0].id;
          await db.execute(sql`
            UPDATE attendance_records 
            SET check_out = ${punchTime},
                biotime_id = ${biotimeId},
                last_updated = CURRENT_TIMESTAMP
            WHERE id = ${attendanceId}
          `);
          console.log(`⬆️ Updated punch-out for ${empCode} on ${dateKey}`);
        } else {
          // Create new attendance record
          await db.execute(sql`
            INSERT INTO attendance_records 
            (employee_code, date, check_in, status, hours_worked, biotime_id, notes, last_updated)
            VALUES (${empCode}, ${punchTime}, ${punchTime}, 'present', 0, ${biotimeId}, 
                    'Processed from BioTime ID: ' || ${biotimeId}, CURRENT_TIMESTAMP)
          `);
          console.log(`➕ Created new attendance record for ${empCode} on ${dateKey}`);
        }
        
        processed++;
        
      } catch (error) {
        console.error(`❌ Error processing record ${record.biotime_id}:`, error.message);
      }
    }
    
    console.log(`✅ IMMEDIATE PROCESSING COMPLETE: Processed ${processed} records for July 20-21`);
    
    // Verify the results
    const verifyQuery = await db.execute(sql`
      SELECT DATE(date) as date, COUNT(*) as count
      FROM attendance_records 
      WHERE DATE(date) IN ('2025-07-20', '2025-07-21')
      GROUP BY DATE(date)
      ORDER BY date
    `);
    
    console.log('📊 Final attendance_records count for July 20-21:', verifyQuery.rows);
    
  } catch (error) {
    console.error('❌ Error processing unprocessed data:', error);
    throw error;
  }
}

// Run immediately if called directly
if (require.main === module) {
  processUnprocessedData()
    .then(() => {
      console.log('✅ Manual processing completed successfully');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Manual processing failed:', err);
      process.exit(1);
    });
}

module.exports = { processUnprocessedData };