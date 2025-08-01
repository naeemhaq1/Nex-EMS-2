import { db } from './db.js';
import { attendanceRecords, attendancePullExt } from '../shared/schema.js';
import { eq, and, sql, gte, lt, desc, isNull } from 'drizzle-orm';

async function processJuly8Attendance() {
  console.log('Processing July 8th attendance data...');
  
  try {
    // Get all July 8th attendance data from pull table
    const july8Data = await db.select()
      .from(attendancePullExt)
      .where(
        and(
          gte(sql`(all_fields->>'punch_time')::timestamp`, '2025-07-08 00:00:00'),
          lt(sql`(all_fields->>'punch_time')::timestamp`, '2025-07-09 00:00:00')
        )
      );
    
    console.log(`Found ${july8Data.length} July 8th records in pull table`);
    
    // Group by employee and day to create attendance records
    const employeeAttendance = new Map<string, any[]>();
    
    for (const record of july8Data) {
      const empCode = record.empCode;
      if (!empCode) continue;
      
      if (!employeeAttendance.has(empCode)) {
        employeeAttendance.set(empCode, []);
      }
      employeeAttendance.get(empCode)!.push(record);
    }
    
    console.log(`Processing attendance for ${employeeAttendance.size} employees`);
    
    let processed = 0;
    let created = 0;
    
    for (const [empCode, records] of employeeAttendance) {
      // Sort records by punch time
      records.sort((a, b) => {
        const timeA = new Date(a.allFields.punch_time).getTime();
        const timeB = new Date(b.allFields.punch_time).getTime();
        return timeA - timeB;
      });
      
      // Get first punch as check-in
      const firstPunch = records[0];
      const checkInTime = new Date(firstPunch.allFields.punch_time);
      
      // Get last punch as check-out (if different from first)
      let checkOutTime: Date | null = null;
      if (records.length > 1) {
        const lastPunch = records[records.length - 1];
        checkOutTime = new Date(lastPunch.allFields.punch_time);
      }
      
      // Check if record already exists
      const existing = await db.select()
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.employeeCode, empCode),
            eq(sql`DATE(${attendanceRecords.date})`, '2025-07-08')
          )
        )
        .limit(1);
      
      if (existing.length === 0) {
        // Create new attendance record
        await db.insert(attendanceRecords).values({
          employeeCode: empCode,
          date: new Date('2025-07-08'),
          checkIn: checkInTime,
          checkOut: checkOutTime,
          status: 'present',
          hoursWorked: checkOutTime ? 
            Math.min(12, (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)) : 
            null,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        created++;
      }
      
      processed++;
      if (processed % 50 === 0) {
        console.log(`Processed ${processed}/${employeeAttendance.size} employees...`);
      }
    }
    
    console.log(`\nProcessing complete!`);
    console.log(`- Total employees processed: ${processed}`);
    console.log(`- New records created: ${created}`);
    
    // Check final count
    const july8Records = await db.select({
      count: sql<number>`count(*)`
    })
    .from(attendanceRecords)
    .where(eq(sql`DATE(${attendanceRecords.date})`, '2025-07-08'));
    
    console.log(`\nTotal July 8th records in attendance_records: ${july8Records[0].count}`);
    
  } catch (error) {
    console.error('Error processing attendance:', error);
  }
  
  process.exit(0);
}

processJuly8Attendance();