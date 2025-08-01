import { db } from './db.js';
import { attendanceRecords, attendancePullExt } from '../shared/schema.js';
import { eq, and, sql, gte, lt, notInArray } from 'drizzle-orm';

async function processJuly8BatchAttendance() {
  console.log('Processing remaining July 8th attendance data in batches...');
  
  try {
    // Get employees who already have July 8th records
    const existingRecords = await db.select({
      employeeCode: attendanceRecords.employeeCode
    })
    .from(attendanceRecords)
    .where(eq(sql`DATE(${attendanceRecords.date})`, '2025-07-08'));
    
    const processedEmployees = existingRecords.map(r => r.employeeCode);
    console.log(`Already processed: ${processedEmployees.length} employees`);
    
    // Get all July 8th attendance data excluding already processed employees
    const query = db.select()
      .from(attendancePullExt)
      .where(
        and(
          gte(sql`(all_fields->>'punch_time')::timestamp`, '2025-07-08 00:00:00'),
          lt(sql`(all_fields->>'punch_time')::timestamp`, '2025-07-09 00:00:00')
        )
      );
    
    const july8Data = processedEmployees.length > 0 
      ? await query.where(and(
          gte(sql`(all_fields->>'punch_time')::timestamp`, '2025-07-08 00:00:00'),
          lt(sql`(all_fields->>'punch_time')::timestamp`, '2025-07-09 00:00:00'),
          notInArray(attendancePullExt.empCode, processedEmployees)
        ))
      : await query;
    
    console.log(`Found ${july8Data.length} records to process`);
    
    // Group by employee
    const employeeAttendance = new Map<string, any[]>();
    
    for (const record of july8Data) {
      const empCode = record.empCode;
      if (!empCode || processedEmployees.includes(empCode)) continue;
      
      if (!employeeAttendance.has(empCode)) {
        employeeAttendance.set(empCode, []);
      }
      employeeAttendance.get(empCode)!.push(record);
    }
    
    console.log(`Processing attendance for ${employeeAttendance.size} remaining employees`);
    
    // Process in batches
    const batchSize = 10;
    const entries = Array.from(employeeAttendance.entries());
    let created = 0;
    
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      const insertData = [];
      
      for (const [empCode, records] of batch) {
        // Sort records by punch time
        records.sort((a, b) => {
          const timeA = new Date(a.allFields.punch_time).getTime();
          const timeB = new Date(b.allFields.punch_time).getTime();
          return timeA - timeB;
        });
        
        // Get first and last punch
        const firstPunch = records[0];
        const checkInTime = new Date(firstPunch.allFields.punch_time);
        
        let checkOutTime: Date | null = null;
        if (records.length > 1) {
          const lastPunch = records[records.length - 1];
          checkOutTime = new Date(lastPunch.allFields.punch_time);
        }
        
        insertData.push({
          employeeCode: empCode,
          date: new Date('2025-07-08'),
          checkIn: checkInTime,
          checkOut: checkOutTime,
          status: 'present' as const,
          hoursWorked: checkOutTime ? 
            Math.min(12, (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)) : 
            null,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      if (insertData.length > 0) {
        await db.insert(attendanceRecords).values(insertData);
        created += insertData.length;
        console.log(`Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(entries.length/batchSize)} - Created ${insertData.length} records`);
      }
    }
    
    console.log(`\nProcessing complete!`);
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

processJuly8BatchAttendance();