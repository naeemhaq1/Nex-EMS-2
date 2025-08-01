import { db } from "./db";
import { sql } from "drizzle-orm";

/**
 * Direct SQL update for timing analysis fields
 */
export async function sqlTimingUpdate() {
  console.log('[SQLTiming] Starting direct SQL timing update...');
  
  try {
    // Update timing analysis fields using direct SQL for better performance
    const result = await db.execute(sql`
      UPDATE attendance_records 
      SET 
        -- Calculate expected arrival time (9:00 AM default or shift start time)
        expected_arrival = DATE_TRUNC('day', date) + 
          INTERVAL '1 hour' * COALESCE(
            (SELECT s.start_hour FROM employee_records er 
             JOIN shifts s ON er.shift_id = s.id 
             WHERE er.employee_code = attendance_records.employee_code), 
            9
          ) + 
          INTERVAL '1 minute' * COALESCE(
            (SELECT s.start_minute FROM employee_records er 
             JOIN shifts s ON er.shift_id = s.id 
             WHERE er.employee_code = attendance_records.employee_code), 
            0
          ),
        
        -- Calculate expected departure time (5:00 PM default or shift end time)
        expected_departure = DATE_TRUNC('day', date) + 
          INTERVAL '1 hour' * COALESCE(
            (SELECT s.end_hour FROM employee_records er 
             JOIN shifts s ON er.shift_id = s.id 
             WHERE er.employee_code = attendance_records.employee_code), 
            17
          ) + 
          INTERVAL '1 minute' * COALESCE(
            (SELECT s.end_minute FROM employee_records er 
             JOIN shifts s ON er.shift_id = s.id 
             WHERE er.employee_code = attendance_records.employee_code), 
            0
          ),
        
        -- Set actual arrival to check_in time
        actual_arrival = check_in,
        
        -- Set actual departure to check_out time
        actual_departure = check_out,
        
        -- Calculate timing differences and statuses
        timing_processed = true,
        timing_processed_at = NOW()
      
      WHERE timing_processed = false 
        AND check_in IS NOT NULL 
        AND date >= CURRENT_DATE - INTERVAL '90 days'
    `);
    
    console.log('[SQLTiming] ✅ Updated expected arrival/departure times');
    
    // Update arrival status and timing fields
    await db.execute(sql`
      UPDATE attendance_records 
      SET 
        -- Calculate arrival timing differences in minutes
        early_minutes = CASE 
          WHEN check_in < expected_arrival THEN 
            EXTRACT(EPOCH FROM (expected_arrival - check_in)) / 60 
          ELSE 0 
        END,
        
        late_minutes = CASE 
          WHEN check_in > expected_arrival + INTERVAL '30 minutes' THEN 
            EXTRACT(EPOCH FROM (check_in - expected_arrival)) / 60 
          ELSE 0 
        END,
        
        grace_minutes = CASE 
          WHEN check_in > expected_arrival 
            AND check_in <= expected_arrival + INTERVAL '30 minutes' THEN 
            EXTRACT(EPOCH FROM (check_in - expected_arrival)) / 60 
          ELSE 0 
        END,
        
        -- Set arrival status
        arrival_status = CASE 
          WHEN check_in < expected_arrival THEN 'early'
          WHEN check_in = expected_arrival THEN 'on_time'
          WHEN check_in <= expected_arrival + INTERVAL '30 minutes' THEN 'grace'
          ELSE 'late'
        END
      
      WHERE timing_processed = true 
        AND check_in IS NOT NULL 
        AND expected_arrival IS NOT NULL
        AND date >= CURRENT_DATE - INTERVAL '90 days'
    `);
    
    console.log('[SQLTiming] ✅ Updated arrival timing fields');
    
    // Update departure status and timing fields
    await db.execute(sql`
      UPDATE attendance_records 
      SET 
        -- Calculate departure timing differences in minutes
        early_departure_minutes = CASE 
          WHEN check_out IS NOT NULL AND check_out < expected_departure THEN 
            EXTRACT(EPOCH FROM (expected_departure - check_out)) / 60 
          ELSE 0 
        END,
        
        late_departure_minutes = CASE 
          WHEN check_out IS NOT NULL AND check_out > expected_departure + INTERVAL '30 minutes' THEN 
            EXTRACT(EPOCH FROM (check_out - expected_departure)) / 60 
          ELSE 0 
        END,
        
        -- Set departure status
        departure_status = CASE 
          WHEN check_out IS NULL THEN 'incomplete'
          WHEN check_out < expected_departure THEN 'early'
          WHEN check_out <= expected_departure + INTERVAL '30 minutes' THEN 'on_time'
          ELSE 'late'
        END
      
      WHERE timing_processed = true 
        AND expected_departure IS NOT NULL
        AND date >= CURRENT_DATE - INTERVAL '90 days'
    `);
    
    console.log('[SQLTiming] ✅ Updated departure timing fields');
    
    // Update the main late_minutes field to match arrival late_minutes
    await db.execute(sql`
      UPDATE attendance_records 
      SET late_minutes = CASE 
        WHEN arrival_status = 'late' THEN EXTRACT(EPOCH FROM (check_in - expected_arrival)) / 60 
        ELSE 0 
      END
      WHERE timing_processed = true 
        AND date >= CURRENT_DATE - INTERVAL '90 days'
    `);
    
    console.log('[SQLTiming] ✅ Updated main late_minutes field');
    
    // Get final count of processed records
    const finalCount = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM attendance_records 
      WHERE timing_processed = true 
        AND date >= CURRENT_DATE - INTERVAL '90 days'
    `);
    
    console.log('[SQLTiming] ✅ Completed SQL timing update');
    console.log(`[SQLTiming] Total processed records: ${finalCount.rows[0].count}`);
    
    return { success: true, processed: finalCount.rows[0].count };
    
  } catch (error) {
    console.error('[SQLTiming] Error:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  sqlTimingUpdate()
    .then((result) => {
      console.log('✅ SQL timing update completed:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ SQL timing update failed:', error);
      process.exit(1);
    });
}