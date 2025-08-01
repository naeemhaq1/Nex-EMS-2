import { db } from "./db";
import { attendancePullExt, attendanceRecords, employeeRecords } from "@shared/schema";
import { and, gte, lt, eq, sql } from "drizzle-orm";

async function processJuly9Attendance() {
  console.log('Processing July 9th attendance data...');
  
  try {
    // Get all July 9th attendance data from pull table
    const july9Data = await db.select()
      .from(attendancePullExt)
      .where(
        and(
          gte(sql`(all_fields->>'punch_time')::timestamp`, '2025-07-09 00:00:00'),
          lt(sql`(all_fields->>'punch_time')::timestamp`, '2025-07-10 00:00:00')
        )
      );
    
    console.log(`Found ${july9Data.length} July 9th records in pull table`);
    
    // Group by employee and day to create attendance records
    const employeeAttendance = new Map<string, any[]>();
    
    for (const record of july9Data) {
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
            eq(attendanceRecords.date, new Date('2025-07-09'))
          )
        );
      
      if (existing.length === 0) {
        // Calculate hours worked
        let hoursWorked = null;
        if (checkOutTime) {
          const diff = checkOutTime.getTime() - checkInTime.getTime();
          hoursWorked = Math.min(12, diff / (1000 * 60 * 60)); // Cap at 12 hours
        }
        
        // Create attendance record
        await db.insert(attendanceRecords).values({
          employeeCode: empCode,
          date: new Date('2025-07-09'),
          checkIn: checkInTime,
          checkOut: checkOutTime,
          status: 'present' as const,
          hoursWorked,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        created++;
      }
      
      processed++;
    }
    
    console.log(`Processed ${processed} employees, created ${created} new attendance records for July 9th`);
    
  } catch (error) {
    console.error('Error processing July 9th attendance:', error);
    throw error;
  }
}

// Run the processing
processJuly9Attendance()
  .then(() => {
    console.log('July 9th attendance processing complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to process July 9th attendance:', error);
    process.exit(1);
  });