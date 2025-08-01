import { db } from './db';
import { attendanceRecords, employeeRecords } from '@shared/schema';
import { eq, and, gte, lte, sql, isNull, count, countDistinct } from 'drizzle-orm';

async function debugYesterdayAttendance() {
  console.log('=== DEBUGGING YESTERDAY\'S ATTENDANCE CALCULATION ===');
  
  // Get yesterday's date in Pakistan timezone
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  
  const pakistanTime = new Date(yesterday.toLocaleString("en-US", {timeZone: "Asia/Karachi"}));
  console.log(`Yesterday in Pakistan timezone: ${pakistanTime.toDateString()}`);
  
  // Define yesterday's date boundaries in Pakistan timezone
  const startOfDay = new Date(pakistanTime);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(pakistanTime);
  endOfDay.setHours(23, 59, 59, 999);
  
  console.log(`Start of day (Pakistan): ${startOfDay.toISOString()}`);
  console.log(`End of day (Pakistan): ${endOfDay.toISOString()}`);
  
  try {
    // 1. Get total active employees
    const totalEmployeesResult = await db
      .select({ count: count() })
      .from(employeeRecords)
      .where(and(
        eq(employeeRecords.isActive, true),
        eq(employeeRecords.systemAccount, false)
      ));
    
    const totalEmployees = totalEmployeesResult[0].count;
    console.log(`\n1. TOTAL ACTIVE EMPLOYEES: ${totalEmployees}`);
    
    // 2. Get NonBio employees
    const nonBioResult = await db
      .select({ count: count() })
      .from(employeeRecords)
      .where(and(
        eq(employeeRecords.isActive, true),
        eq(employeeRecords.systemAccount, false),
        eq(employeeRecords.nonBio, true)
      ));
    
    const nonBioEmployees = nonBioResult[0].count;
    console.log(`2. NON-BIO EMPLOYEES: ${nonBioEmployees}`);
    
    // 3. Get actual attendance records for yesterday
    const attendanceResult = await db
      .select({
        employeeCode: attendanceRecords.employeeCode,
        checkIn: attendanceRecords.checkIn,
        checkOut: attendanceRecords.checkOut,
        status: attendanceRecords.status
      })
      .from(attendanceRecords)
      .where(and(
        gte(attendanceRecords.checkIn, startOfDay),
        lte(attendanceRecords.checkIn, endOfDay)
      ))
      .orderBy(attendanceRecords.employeeCode);
    
    console.log(`\n3. ACTUAL ATTENDANCE RECORDS FOR YESTERDAY: ${attendanceResult.length}`);
    
    // 4. Count unique employees who punched in
    const uniquePunchIns = new Set(attendanceResult.map(r => r.employeeCode)).size;
    console.log(`4. UNIQUE EMPLOYEES WHO PUNCHED IN: ${uniquePunchIns}`);
    
    // 5. Count completed attendance (both check-in and check-out)
    const completedAttendance = attendanceResult.filter(r => r.checkIn && r.checkOut).length;
    console.log(`5. COMPLETED ATTENDANCE (both in & out): ${completedAttendance}`);
    
    // 6. Count incomplete attendance (check-in only)
    const incompleteAttendance = attendanceResult.filter(r => r.checkIn && !r.checkOut).length;
    console.log(`6. INCOMPLETE ATTENDANCE (check-in only): ${incompleteAttendance}`);
    
    // 7. Show current calculation logic
    console.log(`\n=== CURRENT CALCULATION LOGIC ===`);
    console.log(`Total Employees: ${totalEmployees}`);
    console.log(`NonBio Employees: ${nonBioEmployees}`);
    console.log(`Unique Punch-ins: ${uniquePunchIns}`);
    console.log(`Total Attendance = Unique Punch-ins + NonBio = ${uniquePunchIns} + ${nonBioEmployees} = ${uniquePunchIns + nonBioEmployees}`);
    console.log(`Absent = Total Employees - Total Attendance = ${totalEmployees} - ${uniquePunchIns + nonBioEmployees} = ${totalEmployees - (uniquePunchIns + nonBioEmployees)}`);
    
    // 8. Show sample attendance records
    console.log(`\n=== SAMPLE ATTENDANCE RECORDS ===`);
    attendanceResult.slice(0, 10).forEach((record, index) => {
      const checkInTime = record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : 'N/A';
      const checkOutTime = record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : 'N/A';
      console.log(`${index + 1}. ${record.employeeCode}: IN=${checkInTime}, OUT=${checkOutTime}, Status=${record.status}`);
    });
    
    // 9. Check which employees are being counted as absent
    const attendedEmployeeCodes = new Set(attendanceResult.map(r => r.employeeCode));
    
    // Get all active employees
    const allActiveEmployees = await db
      .select({
        employeeCode: employeeRecords.employeeCode,
        firstName: employeeRecords.firstName,
        lastName: employeeRecords.lastName,
        department: employeeRecords.department,
        nonBio: employeeRecords.nonBio
      })
      .from(employeeRecords)
      .where(and(
        eq(employeeRecords.isActive, true),
        eq(employeeRecords.systemAccount, false)
      ))
      .orderBy(employeeRecords.department, employeeRecords.employeeCode);
    
    // Find employees who didn't attend and aren't NonBio
    const absentEmployees = allActiveEmployees.filter(emp => 
      !attendedEmployeeCodes.has(emp.employeeCode) && !emp.nonBio
    );
    
    console.log(`\n=== ABSENT EMPLOYEES ANALYSIS ===`);
    console.log(`Total employees who didn't punch in: ${allActiveEmployees.length - attendedEmployeeCodes.size}`);
    console.log(`NonBio employees (counted as present): ${nonBioEmployees}`);
    console.log(`Actual absent employees: ${absentEmployees.length}`);
    
    // Show department breakdown of absent employees
    const departmentBreakdown = absentEmployees.reduce((acc, emp) => {
      acc[emp.department] = (acc[emp.department] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`\n=== DEPARTMENT BREAKDOWN OF ABSENT EMPLOYEES ===`);
    Object.entries(departmentBreakdown)
      .sort(([,a], [,b]) => b - a)
      .forEach(([dept, count]) => {
        console.log(`${dept}: ${count} employees`);
      });
    
    // Show sample of absent employees
    console.log(`\n=== SAMPLE ABSENT EMPLOYEES ===`);
    absentEmployees.slice(0, 15).forEach((emp, index) => {
      const fullName = `${emp.firstName} ${emp.lastName || ''}`.trim();
      console.log(`${index + 1}. ${emp.employeeCode} - ${fullName} (${emp.department})`);
    });
    
    // 10. Check if there are any attendance records with different date patterns
    console.log(`\n=== ATTENDANCE RECORD DATE ANALYSIS ===`);
    
    // Get attendance records for the last 3 days
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(today.getDate() - 3);
    
    const recentAttendance = await db
      .select({
        date: sql<string>`DATE(${attendanceRecords.checkIn} AT TIME ZONE 'Asia/Karachi')`,
        count: count()
      })
      .from(attendanceRecords)
      .where(gte(attendanceRecords.checkIn, threeDaysAgo))
      .groupBy(sql`DATE(${attendanceRecords.checkIn} AT TIME ZONE 'Asia/Karachi')`)
      .orderBy(sql`DATE(${attendanceRecords.checkIn} AT TIME ZONE 'Asia/Karachi') DESC`);
    
    console.log('Recent attendance by date:');
    recentAttendance.forEach(record => {
      console.log(`  ${record.date}: ${record.count} attendance records`);
    });
    
    return {
      totalEmployees,
      nonBioEmployees,
      uniquePunchIns,
      completedAttendance,
      incompleteAttendance,
      absentCount: absentEmployees.length,
      departmentBreakdown,
      sampleAbsentEmployees: absentEmployees.slice(0, 10)
    };
    
  } catch (error) {
    console.error('Error debugging yesterday\'s attendance:', error);
    throw error;
  }
}

// Run the debug analysis
debugYesterdayAttendance()
  .then(result => {
    console.log('\n=== DEBUGGING COMPLETED ===');
    console.log(`Final calculation: ${result.totalEmployees} total - ${result.uniquePunchIns + result.nonBioEmployees} attended = ${result.absentCount} absent`);
  })
  .catch(error => {
    console.error('Failed to debug attendance:', error);
  });