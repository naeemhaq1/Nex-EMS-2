import { db } from './db';
import { attendancePullExt, attendanceRecords, employeeRecords } from '../shared/schema';
import { eq, and, sql, isNotNull } from 'drizzle-orm';

/**
 * Reprocess attendance data with CORRECT timestamp + biotime_id duplicate detection
 * This implements the logic documented in ATTENDANCE_PROCESSING_DOCUMENTATION.md
 */
async function reprocessAttendanceCorrect() {
  console.log('[REPROCESS] 🔄 Starting attendance reprocessing with timestamp+biotime_id duplicate detection...');
  
  try {
    // Get all staging records
    const stagingRecords = await db.select().from(attendancePullExt);
    console.log(`[REPROCESS] 📊 Found ${stagingRecords.length} staging records`);
    
    // Get existing processed records to avoid duplicates
    const existingRecords = await db
      .select({
        biotimeId: attendanceRecords.biotimeId,
        checkIn: attendanceRecords.checkIn
      })
      .from(attendanceRecords)
      .where(
        and(
          isNotNull(attendanceRecords.biotimeId),
          isNotNull(attendanceRecords.checkIn)
        )
      );
    
    // Create Set of processed timestamp+biotime_id combinations
    const processedKeys = new Set<string>();
    for (const record of existingRecords) {
      if (record.biotimeId && record.checkIn) {
        const key = `${record.checkIn.toISOString()}|${record.biotimeId}`;
        processedKeys.add(key);
      }
    }
    
    console.log(`[REPROCESS] 🔍 Found ${processedKeys.size} existing processed records`);
    
    let processed = 0;
    let skipped = 0;
    let errors = 0;
    
    // Process each staging record
    for (const stagingRecord of stagingRecords) {
      try {
        const allFields = stagingRecord.allFields as any;
        
        // Extract required fields
        const biotimeId = allFields.id?.toString();
        const punchTime = allFields.punch_time;
        const empCode = allFields.emp_code;
        const punchState = allFields.punch_state;
        const terminalSn = allFields.terminal_sn;
        
        if (!biotimeId || !punchTime || !empCode) {
          console.warn(`[REPROCESS] ⚠️ Skipping record missing required fields: biotime_id=${biotimeId}, punch_time=${punchTime}, emp_code=${empCode}`);
          skipped++;
          continue;
        }
        
        // CRITICAL: Create timestamp+biotime_id duplicate detection key
        const punchTimestamp = new Date(punchTime);
        const duplicateKey = `${punchTimestamp.toISOString()}|${biotimeId}`;
        
        // Check if this exact timestamp+biotime_id combination was already processed
        if (processedKeys.has(duplicateKey)) {
          skipped++;
          continue;
        }
        
        // Find employee record
        const employee = await db
          .select()
          .from(employeeRecords)
          .where(eq(employeeRecords.employeeCode, empCode))
          .limit(1);
        
        if (employee.length === 0) {
          console.warn(`[REPROCESS] ⚠️ Employee not found: ${empCode}`);
          errors++;
          continue;
        }
        
        // Skip access control devices (devices with "lock" in terminal name)
        if (terminalSn && terminalSn.toLowerCase().includes('lock')) {
          console.log(`[REPROCESS] 🚫 Skipping access control device: ${terminalSn}`);
          skipped++;
          continue;
        }
        
        // Create attendance record with required date field
        const attendanceData = {
          biotimeId: biotimeId,
          employeeId: employee[0].id,
          employeeCode: empCode,
          date: punchTimestamp.toISOString().split('T')[0], // Extract date part YYYY-MM-DD
          checkIn: punchState === '0' ? punchTimestamp : null,
          checkOut: punchState === '1' ? punchTimestamp : null,
          terminalSn: terminalSn || null,
          punchState: punchState || null,
          location: null,
          notes: `Processed from staging - punch_state: ${punchState}`,
          status: 'present',
          hoursWorked: null,
        };
        
        await db.insert(attendanceRecords).values(attendanceData);
        
        // Add to processed set
        processedKeys.add(duplicateKey);
        processed++;
        
        if (processed % 100 === 0) {
          console.log(`[REPROCESS] 📈 Processed ${processed} records...`);
        }
        
      } catch (error) {
        console.error(`[REPROCESS] ❌ Error processing record:`, error);
        errors++;
      }
    }
    
    console.log(`[REPROCESS] ✅ COMPLETED:`);
    console.log(`  - Processed: ${processed} records`);
    console.log(`  - Skipped: ${skipped} records (duplicates + access control)`);
    console.log(`  - Errors: ${errors} records`);
    console.log(`  - Total staging records: ${stagingRecords.length}`);
    
    // Verify results
    const totalProcessed = await db
      .select({ count: sql`COUNT(*)` })
      .from(attendanceRecords);
    
    console.log(`[REPROCESS] 🎯 Final attendance_records count: ${totalProcessed[0].count}`);
    
  } catch (error) {
    console.error('[REPROCESS] ❌ Fatal error:', error);
  }
}

// Run the reprocessing
reprocessAttendanceCorrect()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });

export { reprocessAttendanceCorrect };