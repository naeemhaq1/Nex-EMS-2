import { db } from './db';
import { attendanceRecords, employeeRecords, attendancePullExt } from '@shared/schema';
import { eq, and, gte, lte, sql, desc, count, isNull, ne } from 'drizzle-orm';

async function processMissingAttendance() {
  console.log('=== PROCESSING MISSING ATTENDANCE DATA ===');
  
  try {
    // Get yesterday's date in Pakistan timezone
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    const pakistanTime = new Date(yesterday.toLocaleString("en-US", {timeZone: "Asia/Karachi"}));
    
    const startOfDay = new Date(pakistanTime);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(pakistanTime);
    endOfDay.setHours(23, 59, 59, 999);
    
    console.log(`Processing attendance for: ${pakistanTime.toDateString()}`);
    console.log(`Time range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);
    
    // 1. Get all raw attendance data for yesterday
    const rawAttendanceData = await db
      .select({
        id: attendancePullExt.id,
        punchTime: sql<string>`${attendancePullExt.allFields}->>'punch_time'`,
        empCode: sql<string>`${attendancePullExt.allFields}->>'emp_code'`,
        punchState: sql<string>`${attendancePullExt.allFields}->>'punch_state'`,
        terminal: sql<string>`${attendancePullExt.allFields}->>'terminal'`,
        allFields: attendancePullExt.allFields
      })
      .from(attendancePullExt)
      .where(and(
        gte(sql`(${attendancePullExt.allFields}->>'punch_time')::timestamp`, startOfDay),
        lte(sql`(${attendancePullExt.allFields}->>'punch_time')::timestamp`, endOfDay)
      ))
      .orderBy(sql`(${attendancePullExt.allFields}->>'punch_time')::timestamp`);
    
    console.log(`\n1. Found ${rawAttendanceData.length} raw attendance records`);
    
    // 2. Process punch data by employee
    const employeePunches = new Map();
    
    for (const record of rawAttendanceData) {
      const empCode = record.empCode;
      const punchTime = new Date(record.punchTime);
      const punchState = record.punchState; // 0 = check-in, 1 = check-out
      
      if (!employeePunches.has(empCode)) {
        employeePunches.set(empCode, {
          checkIn: null,
          checkOut: null,
          punches: []
        });
      }
      
      const employeeData = employeePunches.get(empCode);
      employeeData.punches.push({
        time: punchTime,
        state: punchState,
        terminal: record.terminal
      });
      
      // Set first check-in and last check-out
      if (punchState === '0') { // Check-in
        if (!employeeData.checkIn) {
          employeeData.checkIn = punchTime;
        }
      } else if (punchState === '1') { // Check-out
        employeeData.checkOut = punchTime;
      }
    }
    
    console.log(`2. Processed ${employeePunches.size} unique employees`);
    
    // 3. Create attendance records using proper SQL
    console.log('\n3. Creating attendance records...');
    
    let newRecordsCreated = 0;
    let recordsUpdated = 0;
    
    for (const [empCode, punchData] of employeePunches) {
      // Check if employee exists and is active
      const employee = await db
        .select({
          id: employeeRecords.id,
          employeeCode: employeeRecords.employeeCode,
          firstName: employeeRecords.firstName,
          lastName: employeeRecords.lastName,
          isActive: employeeRecords.isActive,
          systemAccount: employeeRecords.systemAccount
        })
        .from(employeeRecords)
        .where(eq(employeeRecords.employeeCode, empCode))
        .limit(1);
      
      if (employee.length === 0) {
        console.log(`Employee ${empCode} not found, skipping`);
        continue;
      }
      
      if (!employee[0].isActive || employee[0].systemAccount) {
        console.log(`Employee ${empCode} is inactive or system account, skipping`);
        continue;
      }
      
      // Check if attendance record already exists using raw SQL
      const existingRecordQuery = `
        SELECT id FROM attendance_records 
        WHERE employee_code = $1 
        AND date::date = $2::date
        LIMIT 1
      `;
      
      const existingRecord = await db.execute(sql.raw(existingRecordQuery, [empCode, startOfDay.toISOString()]));
      
      if (existingRecord.length > 0) {
        console.log(`Record already exists for ${empCode}, skipping`);
        continue;
      }
      
      // Calculate hours worked
      let hoursWorked = null;
      if (punchData.checkIn && punchData.checkOut) {
        const diffMs = punchData.checkOut.getTime() - punchData.checkIn.getTime();
        hoursWorked = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
      }
      
      // Determine status
      let status = 'present';
      if (punchData.checkIn && !punchData.checkOut) {
        status = 'incomplete';
      }
      
      // Create attendance record using raw SQL
      const insertQuery = `
        INSERT INTO attendance_records (
          employee_code, date, check_in, check_out, 
          total_hours, status, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;
      
      const notes = `Processed from ${punchData.punches.length} punch record(s)`;
      const now = new Date();
      
      try {
        await db.execute(sql.raw(insertQuery, [
          empCode,
          startOfDay.toISOString(),
          punchData.checkIn?.toISOString() || null,
          punchData.checkOut?.toISOString() || null,
          hoursWorked,
          status,
          notes,
          now.toISOString(),
          now.toISOString()
        ]));
        
        newRecordsCreated++;
        const employeeName = `${employee[0].firstName} ${employee[0].lastName || ''}`.trim();
        console.log(`✅ Created record for ${empCode} - ${employeeName}`);
        console.log(`   IN: ${punchData.checkIn?.toLocaleTimeString() || 'N/A'}, OUT: ${punchData.checkOut?.toLocaleTimeString() || 'N/A'}, Hours: ${hoursWorked || 'N/A'}`);
        
      } catch (error) {
        console.error(`❌ Failed to create record for ${empCode}:`, error.message);
      }
    }
    
    console.log(`\n4. Processing completed:`);
    console.log(`   - New records created: ${newRecordsCreated}`);
    console.log(`   - Records updated: ${recordsUpdated}`);
    
    // 5. Verify the results
    console.log('\n5. Verifying results...');
    
    const verificationQuery = `
      SELECT 
        COUNT(DISTINCT employee_code) as unique_employees,
        COUNT(*) as total_records
      FROM attendance_records 
      WHERE date::date = $1::date
    `;
    
    const verificationResult = await db.execute(sql.raw(verificationQuery, [startOfDay.toISOString()]));
    const verification = verificationResult[0];
    
    // Get NonBio count
    const nonBioQuery = `
      SELECT COUNT(*) as count
      FROM employee_records 
      WHERE is_active = true 
      AND system_account = false 
      AND non_bio = true
    `;
    
    const nonBioResult = await db.execute(sql.raw(nonBioQuery));
    const nonBioCount = nonBioResult[0].count;
    
    // Calculate final metrics
    const totalEmployees = 322;
    const uniqueAttendees = verification.unique_employees;
    const totalAttendance = uniqueAttendees + nonBioCount;
    const absentees = totalEmployees - totalAttendance;
    const attendanceRate = ((totalAttendance / totalEmployees) * 100).toFixed(1);
    
    console.log(`\n=== FINAL RESULTS ===`);
    console.log(`Date: ${pakistanTime.toDateString()}`);
    console.log(`Total Employees: ${totalEmployees}`);
    console.log(`Unique Punch-ins: ${uniqueAttendees}`);
    console.log(`NonBio Employees: ${nonBioCount}`);
    console.log(`Total Attendance: ${totalAttendance} (${uniqueAttendees} + ${nonBioCount})`);
    console.log(`Absentees: ${absentees}`);
    console.log(`Attendance Rate: ${attendanceRate}%`);
    
    if (parseFloat(attendanceRate) >= 80) {
      console.log(`✅ SUCCESS: Attendance rate is now ${attendanceRate}% (above 80%)`);
    } else {
      console.log(`⚠️  ALERT: Attendance rate is ${attendanceRate}% (below 80%)`);
      console.log(`This may indicate:`);
      console.log(`- Genuine high absenteeism`);
      console.log(`- Missing sync data from BioTime`);
      console.log(`- Field staff not punching in from office`);
    }
    
    return {
      processedEmployees: employeePunches.size,
      newRecordsCreated,
      finalAttendanceRate: parseFloat(attendanceRate),
      uniqueAttendees,
      totalAttendance,
      absentees
    };
    
  } catch (error) {
    console.error('Error processing missing attendance:', error);
    throw error;
  }
}

// Run the processing
processMissingAttendance()
  .then(result => {
    console.log('\n=== MISSING ATTENDANCE PROCESSING COMPLETED ===');
    console.log(`Successfully processed ${result.processedEmployees} employees`);
    console.log(`Created ${result.newRecordsCreated} new attendance records`);
    console.log(`Final attendance rate: ${result.finalAttendanceRate}%`);
    
    if (result.finalAttendanceRate >= 80) {
      console.log('🎉 MISSION ACCOMPLISHED: Attendance rate restored to above 80%!');
    } else {
      console.log('📊 Data processed, but attendance rate still below 80%');
      console.log('This likely reflects actual workforce patterns rather than data issues');
    }
  })
  .catch(error => {
    console.error('Processing failed:', error);
  });