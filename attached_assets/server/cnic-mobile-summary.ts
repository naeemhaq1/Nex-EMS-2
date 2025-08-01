#!/usr/bin/env tsx
// Script to generate summary report of CNIC and mobile data coverage

import dotenv from 'dotenv';
import { db } from './db.js';
import { employeePullExt } from '../shared/schema.js';
import { sql } from 'drizzle-orm';

dotenv.config();

async function generateSummaryReport() {
  console.log('=== NEXLINX SMART EMS - CNIC & MOBILE DATA SUMMARY ===\n');

  // Overall statistics
  const stats = await db.select({
    totalEmployees: sql<string>`COUNT(*)`,
    employeesWithCnic: sql<string>`COUNT(CASE WHEN national IS NOT NULL AND national != '' THEN 1 END)`,
    employeesWithMobile: sql<string>`COUNT(CASE WHEN mobile IS NOT NULL AND mobile != '' AND mobile LIKE '03%' AND LENGTH(mobile) = 11 THEN 1 END)`,
    employeesWithContactTel: sql<string>`COUNT(CASE WHEN contact_tel IS NOT NULL AND contact_tel != '' THEN 1 END)`,
    employeesWithAnyPhone: sql<string>`COUNT(CASE WHEN (mobile IS NOT NULL AND mobile != '') OR (contact_tel IS NOT NULL AND contact_tel != '') THEN 1 END)`
  })
  .from(employeePullExt)
  .where(sql`emp_code IS NOT NULL`);

  const total = parseInt(stats[0].totalEmployees);
  const cnicCount = parseInt(stats[0].employeesWithCnic);
  const mobileCount = parseInt(stats[0].employeesWithMobile);
  const contactCount = parseInt(stats[0].employeesWithContactTel);
  const anyPhoneCount = parseInt(stats[0].employeesWithAnyPhone);

  console.log('OVERALL COVERAGE:');
  console.log(`Total Employees: ${total}`);
  console.log(`CNIC Coverage: ${cnicCount} (${(cnicCount/total*100).toFixed(1)}%)`);
  console.log(`Valid Mobile Coverage: ${mobileCount} (${(mobileCount/total*100).toFixed(1)}%)`);
  console.log(`Contact Tel Coverage: ${contactCount} (${(contactCount/total*100).toFixed(1)}%)`);
  console.log(`Any Phone Coverage: ${anyPhoneCount} (${(anyPhoneCount/total*100).toFixed(1)}%)\n`);

  // Department breakdown
  console.log('DEPARTMENT BREAKDOWN:');
  const deptStats = await db.execute(sql`
    SELECT 
      department->>'dept_name' as department,
      COUNT(*) as total,
      COUNT(CASE WHEN national IS NOT NULL AND national != '' THEN 1 END) as has_cnic,
      COUNT(CASE WHEN mobile IS NOT NULL AND mobile != '' AND mobile LIKE '03%' AND LENGTH(mobile) = 11 THEN 1 END) as has_mobile
    FROM employee_pull_ext
    WHERE emp_code IS NOT NULL
    GROUP BY department->>'dept_name'
    ORDER BY COUNT(*) DESC
    LIMIT 15
  `);

  for (const dept of deptStats.rows) {
    const deptTotal = parseInt(dept.total as string);
    const deptCnic = parseInt(dept.has_cnic as string);
    const deptMobile = parseInt(dept.has_mobile as string);
    console.log(`${dept.department || 'No Department'}: ${deptTotal} employees | CNIC: ${deptCnic} (${(deptCnic/deptTotal*100).toFixed(0)}%) | Mobile: ${deptMobile} (${(deptMobile/deptTotal*100).toFixed(0)}%)`);
  }

  // Sample of valid mobile numbers
  console.log('\nVALID MOBILE NUMBERS FOUND:');
  const validMobiles = await db.execute(sql`
    SELECT emp_code, first_name, last_name, mobile, department->>'dept_name' as department
    FROM employee_pull_ext
    WHERE mobile IS NOT NULL 
      AND mobile != '' 
      AND mobile LIKE '03%' 
      AND LENGTH(mobile) = 11
    LIMIT 10
  `);

  for (const emp of validMobiles.rows) {
    console.log(`${emp.emp_code}: ${emp.first_name} ${emp.last_name} - ${emp.mobile} (${emp.department})`);
  }

  // Data quality issues
  console.log('\nDATA QUALITY ISSUES:');
  const invalidMobiles = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM employee_pull_ext
    WHERE mobile IS NOT NULL 
      AND mobile != '' 
      AND (mobile NOT LIKE '03%' OR LENGTH(mobile) != 11)
  `);
  console.log(`Invalid mobile formats: ${invalidMobiles.rows[0].count}`);

  const cnicInMobile = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM employee_pull_ext
    WHERE mobile IS NOT NULL 
      AND mobile != '' 
      AND LENGTH(mobile) = 13
      AND mobile ~ '^[0-9]+$'
  `);
  console.log(`CNICs stored in mobile field: ${cnicInMobile.rows[0].count}`);

  console.log('\n=== END OF REPORT ===');
  process.exit(0);
}

generateSummaryReport().catch(error => {
  console.error('Error generating report:', error);
  process.exit(1);
});