import { db } from "./db";
import { sql } from "drizzle-orm";

/**
 * Direct SQL update for punch type classification
 * This approach is more efficient and avoids ORM issues
 */
export async function sqlUpdatePunchTypes() {
  console.log('[SQLPunchType] Starting SQL punch type update...');
  
  try {
    // Create a temporary table to store punch type classifications
    await db.execute(sql`
      CREATE TEMPORARY TABLE temp_punch_types AS
      WITH daily_employee_records AS (
        SELECT 
          ar.id,
          ar.employee_code,
          ar.date,
          ar.check_in,
          ar.check_out,
          COALESCE(s.start_hour, 9) as shift_start_hour,
          COALESCE(s.start_minute, 0) as shift_start_minute,
          COALESCE(s.end_hour, 17) as shift_end_hour,
          COALESCE(s.end_minute, 0) as shift_end_minute,
          ROW_NUMBER() OVER (
            PARTITION BY ar.employee_code, ar.date, 
            CASE WHEN ar.check_in IS NOT NULL THEN 'checkin' ELSE 'checkout' END
            ORDER BY COALESCE(ar.check_in, ar.check_out)
          ) as daily_sequence
        FROM attendance_records ar
        LEFT JOIN employee_records er ON ar.employee_code = er.employee_code
        LEFT JOIN shifts s ON er.shift_id = s.id
        WHERE ar.date >= CURRENT_DATE - INTERVAL '90 days'
      ),
      punch_classifications AS (
        SELECT 
          id,
          employee_code,
          date,
          check_in,
          check_out,
          shift_start_hour,
          shift_start_minute,
          shift_end_hour,
          shift_end_minute,
          daily_sequence,
          
          -- Calculate expected shift start and end times
          DATE_TRUNC('day', date) + 
            INTERVAL '1 hour' * shift_start_hour + 
            INTERVAL '1 minute' * shift_start_minute as expected_start,
          
          DATE_TRUNC('day', date) + 
            INTERVAL '1 hour' * shift_end_hour + 
            INTERVAL '1 minute' * shift_end_minute as expected_end,
          
          -- Calculate time differences in minutes
          CASE 
            WHEN check_in IS NOT NULL THEN
              EXTRACT(EPOCH FROM (check_in - (
                DATE_TRUNC('day', date) + 
                INTERVAL '1 hour' * shift_start_hour + 
                INTERVAL '1 minute' * shift_start_minute
              ))) / 60
            ELSE NULL
          END as checkin_diff_minutes,
          
          CASE 
            WHEN check_out IS NOT NULL THEN
              EXTRACT(EPOCH FROM (check_out - (
                DATE_TRUNC('day', date) + 
                INTERVAL '1 hour' * shift_end_hour + 
                INTERVAL '1 minute' * shift_end_minute
              ))) / 60
            ELSE NULL
          END as checkout_diff_minutes
          
        FROM daily_employee_records
      )
      
      SELECT 
        id,
        employee_code,
        date,
        check_in,
        check_out,
        daily_sequence,
        checkin_diff_minutes,
        checkout_diff_minutes,
        
        -- Classify punch types based on business rules
        CASE 
          -- Check-in classifications
          WHEN check_in IS NOT NULL THEN
            CASE 
              WHEN daily_sequence = 1 THEN
                CASE 
                  WHEN checkin_diff_minutes <= 30 AND checkin_diff_minutes >= -30 THEN 'standard_checkin'
                  WHEN checkin_diff_minutes < -30 THEN 'early_checkin'
                  ELSE 'standard_checkin'  -- Late but still treated as standard
                END
              ELSE 'interim_checkin'  -- Additional check-in after first
            END
          
          -- Check-out classifications
          WHEN check_out IS NOT NULL THEN
            CASE 
              WHEN daily_sequence = 1 THEN
                CASE 
                  WHEN checkout_diff_minutes < -30 THEN 'early_checkout'
                  WHEN checkout_diff_minutes > 60 THEN 'late_checkout'
                  ELSE 'standard_checkout'
                END
              ELSE 'interim_checkout'  -- Additional check-out after first
            END
          
          ELSE 'standard_checkout'  -- Default case
        END as punch_type
        
      FROM punch_classifications
    `);
    
    console.log('[SQLPunchType] ✅ Created temporary punch type classifications');
    
    // Update the main attendance_records table
    const updateResult = await db.execute(sql`
      UPDATE attendance_records 
      SET punch_type = temp_punch_types.punch_type
      FROM temp_punch_types
      WHERE attendance_records.id = temp_punch_types.id
    `);
    
    console.log('[SQLPunchType] ✅ Updated attendance_records with punch types');
    
    // Get statistics
    const stats = await db.execute(sql`
      SELECT 
        punch_type,
        COUNT(*) as count
      FROM temp_punch_types
      GROUP BY punch_type
      ORDER BY count DESC
    `);
    
    console.log('[SQLPunchType] ✅ Punch Type Statistics:');
    for (const row of stats.rows) {
      console.log(`[SQLPunchType]   ${row.punch_type}: ${row.count}`);
    }
    
    // Get total updated count
    const totalResult = await db.execute(sql`
      SELECT COUNT(*) as total FROM temp_punch_types
    `);
    
    const totalUpdated = totalResult.rows[0].total;
    console.log(`[SQLPunchType] ✅ Total records updated: ${totalUpdated}`);
    
    // Clean up temporary table
    await db.execute(sql`DROP TABLE temp_punch_types`);
    
    return { 
      success: true, 
      updated: totalUpdated,
      stats: stats.rows.reduce((acc, row) => {
        acc[row.punch_type] = row.count;
        return acc;
      }, {} as Record<string, number>)
    };
    
  } catch (error) {
    console.error('[SQLPunchType] Error:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  sqlUpdatePunchTypes()
    .then((result) => {
      console.log('✅ SQL punch type update completed:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ SQL punch type update failed:', error);
      process.exit(1);
    });
}