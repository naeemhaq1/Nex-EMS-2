import { db } from './db';
import { attendancePullExt, attendanceRecords, employeeRecords } from '@shared/schema';
import { eq, and, gte, sql } from 'drizzle-orm';

async function quickProcessJulyData() {
  try {
    console.log('Quick processing July 7th data...');
    
    // Get July 7th raw attendance data
    const julyRecords = await db
      .select()
      .from(attendancePullExt)
      .where(
        and(
          gte(sql`(all_fields->>'punch_time')::timestamp`, '2025-07-07 00:00:00'),
          sql`(all_fields->>'punch_time')::timestamp < '2025-07-08 00:00:00'`
        )
      )
      .limit(1000);
    
    console.log(`Found ${julyRecords.length} records for July 7th`);
    
    let processed = 0;
    
    for (const record of julyRecords) {
      try {
        const attendance = record.allFields as any;
        
        // Skip lock devices
        if (attendance.terminal_alias && attendance.terminal_alias.toLowerCase().includes('lock')) {
          continue;
        }
        
        const emp_code = attendance.emp_code;
        const punch_time = attendance.punch_time;
        
        if (!emp_code || !punch_time) continue;
        
        // Get employee
        const [employee] = await db
          .select()
          .from(employeeRecords)
          .where(eq(employeeRecords.employeeCode, emp_code))
          .limit(1);
        
        if (!employee) continue;
        
        const checkTime = new Date(punch_time);
        const dateOnly = new Date(checkTime.toISOString().split('T')[0]);
        
        // Check if record already exists
        const existing = await db
          .select()
          .from(attendanceRecords)
          .where(
            and(
              eq(attendanceRecords.employeeId, employee.id),
              eq(attendanceRecords.date, dateOnly)
            )
          )
          .limit(1);
        
        if (existing.length === 0) {
          // Create a basic attendance record
          await db.insert(attendanceRecords).values({
            employeeId: employee.id,
            employeeCode: emp_code,
            date: dateOnly,
            checkIn: checkTime,
            totalHours: '8.00',
            regularHours: '8.00',
            overtimeHours: '0.00',
            lateMinutes: 0,
            status: 'present',
          });
          processed++;
        }
      } catch (error) {
        console.error('Error processing record:', error);
      }
    }
    
    console.log(`Processed ${processed} July 7th records`);
    return processed;
  } catch (error) {
    console.error('Error in quick processing:', error);
    throw error;
  }
}

quickProcessJulyData()
  .then((count) => {
    console.log(`Successfully processed ${count} records`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });