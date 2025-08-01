import { db } from './db';
import { attendanceRecords, employeeRecords } from '@shared/schema';
import { eq, and, gte, lte, sql, isNotNull, desc } from 'drizzle-orm';

async function investigatePunchData() {
  console.log('=== INVESTIGATING PUNCH DATA ACCURACY ===');
  
  // Get yesterday's date in Pakistan timezone
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  
  const pakistanTime = new Date(yesterday.toLocaleString("en-US", {timeZone: "Asia/Karachi"}));
  
  // Define yesterday's date boundaries
  const startOfDay = new Date(pakistanTime);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(pakistanTime);
  endOfDay.setHours(23, 59, 59, 999);
  
  console.log(`Investigating data for: ${pakistanTime.toDateString()}`);
  console.log(`Time range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);
  
  try {
    // 1. Get all attendance records for yesterday with employee details
    const allAttendanceRecords = await db
      .select({
        id: attendanceRecords.id,
        employeeCode: attendanceRecords.employeeCode,
        checkIn: attendanceRecords.checkIn,
        checkOut: attendanceRecords.checkOut,
        status: attendanceRecords.status,
        notes: attendanceRecords.notes,
        firstName: employeeRecords.firstName,
        lastName: employeeRecords.lastName,
        department: employeeRecords.department,
        isActive: employeeRecords.isActive,
        systemAccount: employeeRecords.systemAccount
      })
      .from(attendanceRecords)
      .innerJoin(employeeRecords, eq(attendanceRecords.employeeCode, employeeRecords.employeeCode))
      .where(and(
        gte(attendanceRecords.checkIn, startOfDay),
        lte(attendanceRecords.checkIn, endOfDay)
      ))
      .orderBy(attendanceRecords.employeeCode, attendanceRecords.checkIn);

    console.log(`\n1. TOTAL ATTENDANCE RECORDS: ${allAttendanceRecords.length}`);
    
    // 2. Filter for active, non-system accounts
    const validRecords = allAttendanceRecords.filter(record => 
      record.isActive && !record.systemAccount
    );
    
    console.log(`2. VALID RECORDS (active, non-system): ${validRecords.length}`);
    
    // 3. Get unique employee codes
    const uniqueEmployeeCodes = [...new Set(validRecords.map(r => r.employeeCode))];
    console.log(`3. UNIQUE EMPLOYEE CODES: ${uniqueEmployeeCodes.length}`);
    
    // 4. Analyze duplicates
    const employeeRecordCounts = validRecords.reduce((acc, record) => {
      acc[record.employeeCode] = (acc[record.employeeCode] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const duplicateEmployees = Object.entries(employeeRecordCounts)
      .filter(([, count]) => count > 1)
      .sort(([, a], [, b]) => b - a);
    
    console.log(`\n4. EMPLOYEES WITH MULTIPLE RECORDS: ${duplicateEmployees.length}`);
    
    // Show top 10 employees with most records
    console.log(`\n=== TOP 10 EMPLOYEES WITH MULTIPLE RECORDS ===`);
    duplicateEmployees.slice(0, 10).forEach(([empCode, count]) => {
      const records = validRecords.filter(r => r.employeeCode === empCode);
      const firstName = records[0]?.firstName || 'Unknown';
      const lastName = records[0]?.lastName || '';
      console.log(`${empCode} - ${firstName} ${lastName}: ${count} records`);
      
      records.forEach((record, index) => {
        const checkInTime = new Date(record.checkIn).toLocaleTimeString();
        const checkOutTime = record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : 'No checkout';
        console.log(`  Record ${index + 1}: IN=${checkInTime}, OUT=${checkOutTime}, Status=${record.status}`);
      });
    });
    
    // 5. Check for different types of statuses
    const statusCounts = validRecords.reduce((acc, record) => {
      acc[record.status || 'unknown'] = (acc[record.status || 'unknown'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`\n=== STATUS BREAKDOWN ===`);
    Object.entries(statusCounts)
      .sort(([, a], [, b]) => b - a)
      .forEach(([status, count]) => {
        console.log(`${status}: ${count} records`);
      });
    
    // 6. Check for records with check-in but no checkout
    const incompleteRecords = validRecords.filter(r => r.checkIn && !r.checkOut);
    console.log(`\n6. INCOMPLETE RECORDS (check-in only): ${incompleteRecords.length}`);
    
    // 7. Check for auto-punchout records
    const autoPunchoutRecords = validRecords.filter(r => r.status === 'auto_punchout');
    console.log(`7. AUTO-PUNCHOUT RECORDS: ${autoPunchoutRecords.length}`);
    
    // 8. Check for manual/regular punch records
    const regularPunchRecords = validRecords.filter(r => r.status === 'present');
    console.log(`8. REGULAR PUNCH RECORDS: ${regularPunchRecords.length}`);
    
    // 9. Investigate why we have duplicate records
    console.log(`\n=== DUPLICATE RECORD ANALYSIS ===`);
    const sampleDuplicateEmployee = duplicateEmployees[0];
    if (sampleDuplicateEmployee) {
      const [empCode] = sampleDuplicateEmployee;
      const duplicateRecords = validRecords.filter(r => r.employeeCode === empCode);
      
      console.log(`\nAnalyzing employee ${empCode}:`);
      duplicateRecords.forEach((record, index) => {
        console.log(`Record ${index + 1}:`);
        console.log(`  ID: ${record.id}`);
        console.log(`  Check-in: ${new Date(record.checkIn).toLocaleString()}`);
        console.log(`  Check-out: ${record.checkOut ? new Date(record.checkOut).toLocaleString() : 'None'}`);
        console.log(`  Status: ${record.status}`);
        console.log(`  Notes: ${record.notes || 'None'}`);
        console.log('');
      });
    }
    
    // 10. Get the actual count using different methods
    console.log(`\n=== DIFFERENT COUNTING METHODS ===`);
    
    // Method 1: Count distinct from query
    const distinctCountResult = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${attendanceRecords.employeeCode})` })
      .from(attendanceRecords)
      .innerJoin(employeeRecords, eq(attendanceRecords.employeeCode, employeeRecords.employeeCode))
      .where(and(
        gte(attendanceRecords.checkIn, startOfDay),
        lte(attendanceRecords.checkIn, endOfDay),
        eq(employeeRecords.isActive, true),
        eq(employeeRecords.systemAccount, false)
      ));
    
    console.log(`Method 1 (SQL DISTINCT): ${distinctCountResult[0].count}`);
    console.log(`Method 2 (JavaScript Set): ${uniqueEmployeeCodes.length}`);
    
    // Method 3: Manual verification
    const manualCount = new Set(
      validRecords.map(r => r.employeeCode)
    ).size;
    console.log(`Method 3 (Manual verification): ${manualCount}`);
    
    // 11. Show some sample unique employees
    console.log(`\n=== SAMPLE UNIQUE EMPLOYEES WHO PUNCHED IN ===`);
    uniqueEmployeeCodes.slice(0, 15).forEach((empCode, index) => {
      const record = validRecords.find(r => r.employeeCode === empCode);
      if (record) {
        const fullName = `${record.firstName} ${record.lastName || ''}`.trim();
        const checkInTime = new Date(record.checkIn).toLocaleTimeString();
        console.log(`${index + 1}. ${empCode} - ${fullName} (${record.department}) - IN: ${checkInTime}`);
      }
    });
    
    return {
      totalRecords: allAttendanceRecords.length,
      validRecords: validRecords.length,
      uniqueEmployees: uniqueEmployeeCodes.length,
      duplicateEmployees: duplicateEmployees.length,
      statusBreakdown: statusCounts,
      distinctSQLCount: distinctCountResult[0].count
    };
    
  } catch (error) {
    console.error('Error investigating punch data:', error);
    throw error;
  }
}

// Run the investigation
investigatePunchData()
  .then(result => {
    console.log('\n=== INVESTIGATION COMPLETED ===');
    console.log(`The correct unique employee count should be: ${result.uniqueEmployees}`);
    console.log(`SQL DISTINCT count confirms: ${result.distinctSQLCount}`);
    console.log(`Issue: ${result.duplicateEmployees} employees have multiple records causing confusion`);
  })
  .catch(error => {
    console.error('Failed to investigate:', error);
  });