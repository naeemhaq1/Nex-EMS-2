#!/usr/bin/env tsx

import { db } from './db';
import { sql } from 'drizzle-orm';
import { attendanceRecords, biotimeSyncData } from '../shared/schema';

async function processTodayAttendance() {
  console.log('🚀 Processing July 26th attendance data...');
  
  try {
    // Get all biotime_sync_data records for July 26th that don't have corresponding attendance_records
    const unprocessedQuery = await db.execute(sql`
      SELECT bsd.*
      FROM biotime_sync_data bsd
      LEFT JOIN attendance_records ar ON bsd.biotime_id = ar.biotime_id
      WHERE ar.id IS NULL
        AND DATE(bsd.punch_time) = '2025-07-26'
      ORDER BY bsd.punch_time
    `);
    
    const unprocessedRecords = unprocessedQuery.rows;
    console.log(`📊 Found ${unprocessedRecords.length} unprocessed records for July 26th`);
    
    if (unprocessedRecords.length === 0) {
      console.log('✅ No unprocessed records found for July 26th');
      return;
    }
    
    let processed = 0;
    const employeeAttendance = new Map();
    
    // Group records by employee and date
    for (const record of unprocessedRecords) {
      const empCode = record.employee_code;
      const punchTime = new Date(record.punch_time);
      const dateKey = punchTime.toISOString().split('T')[0];
      const key = `${empCode}-${dateKey}`;
      
      if (!employeeAttendance.has(key)) {
        employeeAttendance.set(key, {
          employeeCode: empCode,
          date: dateKey,
          punches: []
        });
      }
      
      employeeAttendance.get(key).punches.push({
        time: punchTime,
        punchState: record.punch_state,
        biotimeId: record.biotime_id,
        source: record.punch_source || 'terminal'
      });
    }
    
    // Process each employee's attendance for the day
    for (const [key, attendance] of employeeAttendance) {
      try {
        const punches = attendance.punches.sort((a, b) => a.time.getTime() - b.time.getTime());
        const firstPunch = punches[0];
        const lastPunch = punches[punches.length - 1];
        
        // Determine check-in and check-out
        let checkIn = null;
        let checkOut = null;
        
        // Find first punch-in (state 0) as check-in
        const firstPunchIn = punches.find(p => p.punchState === '0');
        if (firstPunchIn) {
          checkIn = firstPunchIn.time;
        }
        
        // Find last punch-out (state 1) as check-out  
        const punchOuts = punches.filter(p => p.punchState === '1');
        if (punchOuts.length > 0) {
          checkOut = punchOuts[punchOuts.length - 1].time;
        }
        
        // Calculate hours worked
        let totalHours = 0;
        if (checkIn && checkOut) {
          totalHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
        }
        
        // Create attendance record with only essential fields
        const attendanceData = {
          employeeCode: attendance.employeeCode,
          date: new Date(attendance.date + 'T00:00:00'),
          checkIn: checkIn,
          checkOut: checkOut,
          totalHours: totalHours,
          status: checkIn ? (checkOut ? 'complete' : 'incomplete') : 'absent',
          punchSource: firstPunch.source,
          biotimeId: firstPunch.biotimeId,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Insert into attendance_records
        await db.insert(attendanceRecords).values(attendanceData);
        processed++;
        
        console.log(`✓ Processed ${attendance.employeeCode} - ${checkIn ? 'In: ' + checkIn.toLocaleTimeString() : 'No punch-in'}${checkOut ? ', Out: ' + checkOut.toLocaleTimeString() : ', No punch-out'}`);
        
      } catch (error) {
        console.error(`❌ Error processing ${attendance.employeeCode}:`, error.message);
      }
    }
    
    console.log(`🎉 Successfully processed ${processed} attendance records for July 26th`);
    
  } catch (error) {
    console.error('❌ Error processing today\'s attendance:', error);
    throw error;
  }
}

// Run the processing
processTodayAttendance()
  .then(() => {
    console.log('✅ July 26th attendance processing complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed to process July 26th attendance:', error);
    process.exit(1);
  });