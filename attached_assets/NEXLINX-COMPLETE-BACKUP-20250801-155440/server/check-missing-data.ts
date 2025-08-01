import { db } from './db';
import { attendanceRecords, employeeRecords, attendancePullExt } from '@shared/schema';
import { eq, and, gte, lte, sql, desc, count } from 'drizzle-orm';

async function checkMissingData() {
  console.log('=== CHECKING FOR MISSING ATTENDANCE DATA ===');
  
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
  
  console.log(`Checking data for: ${pakistanTime.toDateString()}`);
  console.log(`Time range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);
  
  try {
    // 1. Check raw pull data from BioTime API
    const rawPullDataResult = await db
      .select({ count: count() })
      .from(attendancePullExt)
      .where(and(
        gte(sql`(${attendancePullExt.allFields}->>'punch_time')::timestamp`, startOfDay),
        lte(sql`(${attendancePullExt.allFields}->>'punch_time')::timestamp`, endOfDay)
      ));
    
    const rawPullCount = rawPullDataResult[0].count;
    console.log(`\n1. RAW PULL DATA FROM BIOTIME: ${rawPullCount} records`);
    
    // 2. Check processed attendance records
    const processedRecordsResult = await db
      .select({ count: count() })
      .from(attendanceRecords)
      .where(and(
        gte(attendanceRecords.checkIn, startOfDay),
        lte(attendanceRecords.checkIn, endOfDay)
      ));
    
    const processedCount = processedRecordsResult[0].count;
    console.log(`2. PROCESSED ATTENDANCE RECORDS: ${processedCount} records`);
    
    // 3. Check for recent sync operations
    const recentSyncData = await db
      .select({
        punchTime: sql<string>`${attendancePullExt.allFields}->>'punch_time'`,
        empCode: sql<string>`${attendancePullExt.allFields}->>'emp_code'`,
        terminal: sql<string>`${attendancePullExt.allFields}->>'terminal'`,
        punchState: sql<string>`${attendancePullExt.allFields}->>'punch_state'`
      })
      .from(attendancePullExt)
      .where(and(
        gte(sql`(${attendancePullExt.allFields}->>'punch_time')::timestamp`, startOfDay),
        lte(sql`(${attendancePullExt.allFields}->>'punch_time')::timestamp`, endOfDay)
      ))
      .orderBy(desc(sql`(${attendancePullExt.allFields}->>'punch_time')::timestamp`))
      .limit(20);
    
    console.log(`\n3. RECENT RAW PULL DATA SAMPLE:`);
    recentSyncData.forEach((record, index) => {
      console.log(`${index + 1}. ${record.punchTime} - Emp: ${record.empCode}, Terminal: ${record.terminal}, State: ${record.punchState}`);
    });
    
    // 4. Check for gaps in data processing
    const gapAnalysis = rawPullCount - processedCount;
    console.log(`\n4. DATA PROCESSING GAP: ${gapAnalysis} records not processed`);
    
    if (gapAnalysis > 0) {
      console.log(`⚠️  WARNING: ${gapAnalysis} raw records are not processed into attendance_records table`);
    }
    
    // 5. Check attendance patterns for the last 7 days
    console.log(`\n5. ATTENDANCE PATTERNS (LAST 7 DAYS):`);
    
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    const dailyAttendance = await db
      .select({
        date: sql<string>`DATE(${attendanceRecords.checkIn} AT TIME ZONE 'Asia/Karachi')`,
        uniqueEmployees: sql<number>`COUNT(DISTINCT ${attendanceRecords.employeeCode})`,
        totalRecords: count()
      })
      .from(attendanceRecords)
      .where(gte(attendanceRecords.checkIn, sevenDaysAgo))
      .groupBy(sql`DATE(${attendanceRecords.checkIn} AT TIME ZONE 'Asia/Karachi')`)
      .orderBy(desc(sql`DATE(${attendanceRecords.checkIn} AT TIME ZONE 'Asia/Karachi')`));
    
    dailyAttendance.forEach(record => {
      const date = new Date(record.date);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      const attendanceRate = ((record.uniqueEmployees / 322) * 100).toFixed(1);
      console.log(`${record.date} (${dayName}): ${record.uniqueEmployees} employees (${attendanceRate}%) - ${record.totalRecords} records`);
    });
    
    // 6. Check for Sunday data (should be low)
    const sundayData = dailyAttendance.filter(record => {
      const date = new Date(record.date);
      return date.getDay() === 0; // Sunday
    });
    
    if (sundayData.length > 0) {
      console.log(`\n6. SUNDAY ATTENDANCE (Expected to be low):`);
      sundayData.forEach(record => {
        console.log(`${record.date}: ${record.uniqueEmployees} employees (${((record.uniqueEmployees / 322) * 100).toFixed(1)}%)`);
      });
    }
    
    // 7. Check for specific departments with low attendance
    const departmentAttendance = await db
      .select({
        department: employeeRecords.department,
        totalEmployees: count(),
        attendedEmployees: sql<number>`COUNT(DISTINCT CASE WHEN ${attendanceRecords.checkIn} >= ${startOfDay} AND ${attendanceRecords.checkIn} <= ${endOfDay} THEN ${attendanceRecords.employeeCode} END)`
      })
      .from(employeeRecords)
      .leftJoin(attendanceRecords, eq(employeeRecords.employeeCode, attendanceRecords.employeeCode))
      .where(and(
        eq(employeeRecords.isActive, true),
        eq(employeeRecords.systemAccount, false)
      ))
      .groupBy(employeeRecords.department)
      .having(sql`COUNT(*) > 0`)
      .orderBy(desc(sql`COUNT(*)`));
    
    console.log(`\n7. DEPARTMENT ATTENDANCE BREAKDOWN:`);
    departmentAttendance.slice(0, 15).forEach(dept => {
      const attendanceRate = dept.totalEmployees > 0 ? ((dept.attendedEmployees / dept.totalEmployees) * 100).toFixed(1) : '0.0';
      console.log(`${dept.department}: ${dept.attendedEmployees}/${dept.totalEmployees} (${attendanceRate}%)`);
    });
    
    // 8. Check for sync service status
    console.log(`\n8. DATA SYNC ANALYSIS:`);
    console.log(`- Raw BioTime data: ${rawPullCount} records`);
    console.log(`- Processed records: ${processedCount} records`);
    console.log(`- Processing efficiency: ${processedCount > 0 ? ((processedCount / rawPullCount) * 100).toFixed(1) : '0'}%`);
    
    // 9. Check for recent data sync timestamps
    const lastSyncData = await db
      .select({
        lastPullTime: sql<string>`MAX(${attendancePullExt.allFields}->>'punch_time')`
      })
      .from(attendancePullExt);
    
    const lastProcessedTime = await db
      .select({
        lastProcessedTime: sql<string>`MAX(${attendanceRecords.checkIn})`
      })
      .from(attendanceRecords);
    
    console.log(`\n9. SYNC TIMESTAMPS:`);
    console.log(`Last pulled data: ${lastSyncData[0].lastPullTime}`);
    console.log(`Last processed data: ${lastProcessedTime[0].lastProcessedTime}`);
    
    return {
      rawPullCount,
      processedCount,
      gapAnalysis,
      dailyAttendance,
      departmentAttendance: departmentAttendance.slice(0, 10)
    };
    
  } catch (error) {
    console.error('Error checking missing data:', error);
    throw error;
  }
}

// Run the check
checkMissingData()
  .then(result => {
    console.log('\n=== MISSING DATA ANALYSIS COMPLETED ===');
    if (result.gapAnalysis > 0) {
      console.log(`🔴 CRITICAL: ${result.gapAnalysis} records need to be processed`);
      console.log(`Recommendation: Run attendance processing service to catch up`);
    } else {
      console.log(`✅ All raw data has been processed`);
      console.log(`Issue likely: Actual low attendance or sync timing problems`);
    }
  })
  .catch(error => {
    console.error('Failed to check missing data:', error);
  });