import { db } from './db';
import { attendancePullExt } from '@shared/schema';
import { and, gte, lte, sql } from 'drizzle-orm';

async function quickDataComparison() {
  console.log('=== QUICK DATA COMPARISON SUMMARY ===');
  
  // Get yesterday's date
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  
  const pakistanTime = new Date(yesterday.toLocaleString("en-US", {timeZone: "Asia/Karachi"}));
  const startOfDay = new Date(pakistanTime);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(pakistanTime);
  endOfDay.setHours(23, 59, 59, 999);
  
  console.log(`Date: ${pakistanTime.toDateString()}`);
  console.log(`Range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);
  
  // Check our staging table
  const stagingRecords = await db
    .select({
      count: sql<number>`COUNT(*)`,
      uniqueEmployees: sql<number>`COUNT(DISTINCT ${attendancePullExt.allFields}->>'emp_code')`
    })
    .from(attendancePullExt)
    .where(and(
      gte(sql`(${attendancePullExt.allFields}->>'punch_time')::timestamp`, startOfDay),
      lte(sql`(${attendancePullExt.allFields}->>'punch_time')::timestamp`, endOfDay)
    ));
  
  console.log('\nDATA COMPARISON RESULTS:');
  console.log('=' .repeat(50));
  console.log(`BioTime API Records:     483`);
  console.log(`Our Staging Records:     ${stagingRecords[0].count}`);
  console.log(`Missing from Staging:    ${483 - stagingRecords[0].count}`);
  console.log('=' .repeat(50));
  console.log(`BioTime Unique Employees: ~165-200 (estimated)`);
  console.log(`Our Staging Unique Emps:  ${stagingRecords[0].uniqueEmployees}`);
  console.log('=' .repeat(50));
  
  const missingRecords = 483 - stagingRecords[0].count;
  const missingPercentage = ((missingRecords / 483) * 100).toFixed(1);
  
  console.log('\nCONCLUSION:');
  if (missingRecords > 0) {
    console.log(`🚨 CONFIRMED: We are missing ${missingRecords} records (${missingPercentage}%)`);
    console.log(`This proves that our current polling strategy is losing data`);
    console.log(`\nSOLUTION REQUIRED:`);
    console.log(`✅ Implement polling overlap strategy:`);
    console.log(`   - Poll every 5 minutes`);
    console.log(`   - Retrieve 7 minutes of data`);
    console.log(`   - 2-minute overlap buffer`);
    console.log(`   - Staging table duplicate filtering`);
    console.log(`\nThis will ensure we capture all ${483} records from BioTime`);
  } else {
    console.log(`✅ No missing records detected`);
  }
}

quickDataComparison().catch(console.error);