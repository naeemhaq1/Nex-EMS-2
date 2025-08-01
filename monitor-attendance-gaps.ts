import { db } from './db.js';
import { attendanceRecords, attendancePullExt, employeeRecords } from '../shared/schema.js';
import { eq, and, sql, gte, lt, notInArray, isNotNull } from 'drizzle-orm';

async function monitorAttendanceGaps() {
  console.log('Monitoring attendance data gaps...\n');
  
  try {
    // Get date range of available data
    const dateRange = await db.select({
      minDate: sql<string>`MIN(DATE((all_fields->>'punch_time')::timestamp))`,
      maxDate: sql<string>`MAX(DATE((all_fields->>'punch_time')::timestamp))`,
      totalRecords: sql<number>`COUNT(*)`
    })
    .from(attendancePullExt);
    
    console.log(`Pull Table Data Range: ${dateRange[0].minDate} to ${dateRange[0].maxDate}`);
    console.log(`Total Pull Records: ${dateRange[0].totalRecords}\n`);
    
    // Compare pull data vs processed data for last 7 days
    console.log('Daily Comparison (Last 7 Days):');
    console.log('Date       | Pull Employees | Pull Records | Processed Employees | Processed Records | Gap');
    console.log('-----------|----------------|--------------|---------------------|-------------------|-----');
    
    const query = sql`
      WITH date_series AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '6 days',
          CURRENT_DATE,
          '1 day'::interval
        )::date AS date
      ),
      pull_data AS (
        SELECT 
          DATE((all_fields->>'punch_time')::timestamp) as date,
          COUNT(DISTINCT emp_code) as employees,
          COUNT(*) as records
        FROM attendance_pull_ext
        WHERE (all_fields->>'punch_time')::date >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY DATE((all_fields->>'punch_time')::timestamp)
      ),
      processed_data AS (
        SELECT 
          DATE(date) as date,
          COUNT(DISTINCT employee_code) as employees,
          COUNT(*) as records
        FROM attendance_records
        WHERE DATE(date) >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY DATE(date)
      )
      SELECT 
        ds.date,
        COALESCE(pd.employees, 0) as pull_employees,
        COALESCE(pd.records, 0) as pull_records,
        COALESCE(pr.employees, 0) as processed_employees,
        COALESCE(pr.records, 0) as processed_records
      FROM date_series ds
      LEFT JOIN pull_data pd ON ds.date = pd.date
      LEFT JOIN processed_data pr ON ds.date = pr.date
      ORDER BY ds.date DESC
    `;
    
    const comparison = await db.execute(query);
    
    for (const row of comparison.rows as any[]) {
      const gap = row.pull_employees - row.processed_employees;
      const gapIndicator = gap > 0 ? `❌ ${gap}` : gap === 0 && row.pull_employees > 0 ? '✅' : '-';
      const dateStr = typeof row.date === 'string' ? row.date : new Date(row.date).toISOString().split('T')[0];
      
      console.log(
        `${dateStr} | ${String(row.pull_employees).padStart(14)} | ${String(row.pull_records).padStart(12)} | ${String(row.processed_employees).padStart(19)} | ${String(row.processed_records).padStart(17)} | ${gapIndicator}`
      );
    }
    
    // Find employees with missing attendance records
    console.log('\n\nMissing Employee Details (Employees in pull but not in processed):');
    
    const missingQuery = sql`
      WITH recent_dates AS (
        SELECT DISTINCT DATE((all_fields->>'punch_time')::timestamp) as date
        FROM attendance_pull_ext
        WHERE (all_fields->>'punch_time')::date >= CURRENT_DATE - INTERVAL '3 days'
      ),
      pull_employees AS (
        SELECT 
          DATE((all_fields->>'punch_time')::timestamp) as date,
          emp_code,
          COUNT(*) as punch_count,
          MIN((all_fields->>'punch_time')::timestamp) as first_punch,
          MAX((all_fields->>'punch_time')::timestamp) as last_punch
        FROM attendance_pull_ext
        WHERE (all_fields->>'punch_time')::date >= CURRENT_DATE - INTERVAL '3 days'
        GROUP BY DATE((all_fields->>'punch_time')::timestamp), emp_code
      ),
      processed_employees AS (
        SELECT 
          DATE(date) as date,
          employee_code
        FROM attendance_records
        WHERE DATE(date) >= CURRENT_DATE - INTERVAL '3 days'
      )
      SELECT 
        pe.date,
        pe.emp_code,
        pe.punch_count,
        pe.first_punch,
        pe.last_punch,
        e.first_name,
        e.last_name,
        e.department
      FROM pull_employees pe
      LEFT JOIN processed_employees pr ON pe.date = pr.date AND pe.emp_code = pr.employee_code
      LEFT JOIN employee_records e ON pe.emp_code = e.employee_code
      WHERE pr.employee_code IS NULL
      ORDER BY pe.date DESC, pe.emp_code
      LIMIT 20
    `;
    
    const missing = await db.execute(missingQuery);
    
    if (missing.rows.length > 0) {
      console.log('\nDate       | Employee Code | Name                    | Department      | Punches | First Punch         | Last Punch');
      console.log('-----------|---------------|-------------------------|-----------------|---------|---------------------|--------------------');
      
      for (const emp of missing.rows as any[]) {
        const name = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Unknown';
        const dateStr = typeof emp.date === 'string' ? emp.date : new Date(emp.date).toISOString().split('T')[0];
        console.log(
          `${dateStr} | ${emp.emp_code.padEnd(13)} | ${name.padEnd(23)} | ${(emp.department || '-').padEnd(15)} | ${String(emp.punch_count).padStart(7)} | ${new Date(emp.first_punch).toLocaleTimeString()} | ${new Date(emp.last_punch).toLocaleTimeString()}`
        );
      }
    } else {
      console.log('No missing employee records found in the last 3 days.');
    }
    
    // Check for data quality issues
    console.log('\n\nData Quality Checks:');
    
    // Check for employees without punch_time
    const noPunchTime = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM attendance_pull_ext
      WHERE all_fields->>'punch_time' IS NULL
    `);
    console.log(`Records without punch_time: ${(noPunchTime.rows[0] as any).count}`);
    
    // Check for employees without emp_code
    const noEmpCode = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM attendance_pull_ext
      WHERE emp_code IS NULL OR emp_code = ''
    `);
    console.log(`Records without emp_code: ${(noEmpCode.rows[0] as any).count}`);
    
    // Active employees check
    const activeEmployees = await db.select({
      count: sql<number>`count(*)`
    })
    .from(employeeRecords)
    .where(and(
      eq(employeeRecords.isActive, true),
      sql`first_name != 'NOC'`
    ));
    
    console.log(`\nTotal Active Employees (excluding NOC): ${activeEmployees[0].count}`);
    
  } catch (error) {
    console.error('Error monitoring attendance gaps:', error);
  }
  
  process.exit(0);
}

monitorAttendanceGaps();