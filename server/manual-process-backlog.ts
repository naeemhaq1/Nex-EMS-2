import { db } from './db';
import { biotimeSyncData, attendanceRecords } from '../shared/schema';
import { sql, eq } from 'drizzle-orm';

// Manual processing script for unprocessed biotime_sync_data records
async function processUnprocessedBacklog(): Promise<void> {
    console.log('[Manual Backlog] 🚀 Starting manual processing of unprocessed BioTime data...');
    
    try {
        // Get count of unprocessed records
        const countResult = await db.execute(sql`
            SELECT COUNT(*) as count FROM biotime_sync_data 
            WHERE processed = false OR processed IS NULL
        `);
        
        const totalUnprocessed = parseInt(countResult.rows[0]?.count || '0');
        console.log(`[Manual Backlog] 📊 Found ${totalUnprocessed} unprocessed records`);
        
        if (totalUnprocessed === 0) {
            console.log('[Manual Backlog] ✅ No unprocessed records found');
            return;
        }
        
        let processedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        
        // Process in batches of 100
        const batchSize = 100;
        let offset = 0;
        
        while (offset < totalUnprocessed) {
            console.log(`[Manual Backlog] 🔄 Processing batch ${Math.floor(offset/batchSize) + 1}/${Math.ceil(totalUnprocessed/batchSize)}...`);
            
            // Get unprocessed records
            const unprocessedRecords = await db.execute(sql`
                SELECT * FROM biotime_sync_data 
                WHERE processed = false OR processed IS NULL
                ORDER BY punch_time ASC
                LIMIT ${batchSize}
                OFFSET ${offset}
            `);
            
            for (const record of unprocessedRecords.rows) {
                try {
                    const empCode = record.employee_code || record.emp_code;
                    const punchTime = new Date(record.punch_time);
                    const biotimeId = record.biotime_id?.toString();
                    
                    if (!empCode || !punchTime || !biotimeId) {
                        console.log(`[Manual Backlog] ⚠️ Skipping record with missing data: empCode=${empCode}, biotimeId=${biotimeId}`);
                        skippedCount++;
                        continue;
                    }
                    
                    // Check if already exists in attendance_records
                    const existingAttendance = await db.select()
                        .from(attendanceRecords)
                        .where(eq(attendanceRecords.biotimeId, biotimeId))
                        .limit(1);
                    
                    if (existingAttendance.length > 0) {
                        console.log(`[Manual Backlog] ⚪ Already processed: ${biotimeId}`);
                        skippedCount++;
                        // Mark as processed in biotime_sync_data
                        await db.update(biotimeSyncData)
                            .set({ processed: true, processedAt: new Date() })
                            .where(eq(biotimeSyncData.biotimeId, biotimeId));
                        continue;
                    }
                    
                    // Determine punch type and date
                    const date = new Date(punchTime.getFullYear(), punchTime.getMonth(), punchTime.getDate());
                    
                    // Insert into attendance_records
                    await db.insert(attendanceRecords).values({
                        biotimeId: biotimeId,
                        employeeCode: empCode,
                        date: date,
                        checkIn: punchTime,
                        status: 'present',
                        latitude: record.latitude ? parseFloat(record.latitude) : null,
                        longitude: record.longitude ? parseFloat(record.longitude) : null,
                        punchSource: record.mobile ? 'mobile_app' : 'terminal',
                        locationSource: 'N',
                        bluetoothDeviceId: null,
                        deviceInfo: null,
                        notes: `Processed from BioTime sync data - ${record.punch_state || 'unknown'} punch`
                    }).onConflictDoNothing();
                    
                    // Mark as processed in biotime_sync_data
                    await db.update(biotimeSyncData)
                        .set({ processed: true, processedAt: new Date() })
                        .where(eq(biotimeSyncData.biotimeId, biotimeId));
                    
                    processedCount++;
                    
                    if (processedCount % 50 === 0) {
                        console.log(`[Manual Backlog] 📈 Progress: ${processedCount} processed, ${skippedCount} skipped`);
                    }
                    
                } catch (error: any) {
                    console.error(`[Manual Backlog] ❌ Error processing record ${record.biotime_id}:`, error.message);
                    errorCount++;
                }
            }
            
            offset += batchSize;
        }
        
        console.log(`[Manual Backlog] ✅ COMPLETED: ${processedCount} processed, ${skippedCount} skipped, ${errorCount} errors`);
        
        // Final count verification
        const finalCountResult = await db.execute(sql`
            SELECT COUNT(*) as count FROM biotime_sync_data 
            WHERE processed = false OR processed IS NULL
        `);
        
        const remainingUnprocessed = parseInt(finalCountResult.rows[0]?.count || '0');
        console.log(`[Manual Backlog] 📊 Remaining unprocessed: ${remainingUnprocessed}`);
        
    } catch (error) {
        console.error('[Manual Backlog] ❌ Error during manual processing:', error);
        throw error;
    }
}

// Run the manual processing
processUnprocessedBacklog()
    .then(() => {
        console.log('[Manual Backlog] 🎉 Manual processing completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('[Manual Backlog] 💥 Manual processing failed:', error);
        process.exit(1);
    });