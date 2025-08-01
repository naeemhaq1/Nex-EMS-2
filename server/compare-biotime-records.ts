import { db } from './db';
import { attendancePullExt, attendanceRecords } from '@shared/schema';
import { and, gte, lte, sql } from 'drizzle-orm';
import { BioTimeService } from './services/biotimeService';

async function compareBioTimeRecords() {
  console.log('=== COMPARING BIOTIME API vs DATABASE RECORDS ===');
  
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
    
    console.log(`\nAnalyzing data for: ${pakistanTime.toDateString()}`);
    console.log(`Time range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);
    
    // 1. Check our staging table (attendance_pull_ext)
    console.log('\n1. CHECKING OUR STAGING TABLE (attendance_pull_ext)');
    const stagingRecords = await db
      .select({
        id: attendancePullExt.id,
        punchTime: sql<string>`${attendancePullExt.allFields}->>'punch_time'`,
        empCode: sql<string>`${attendancePullExt.allFields}->>'emp_code'`,
        punchState: sql<string>`${attendancePullExt.allFields}->>'punch_state'`,
        terminal: sql<string>`${attendancePullExt.allFields}->>'terminal'`
      })
      .from(attendancePullExt)
      .where(and(
        gte(sql`(${attendancePullExt.allFields}->>'punch_time')::timestamp`, startOfDay),
        lte(sql`(${attendancePullExt.allFields}->>'punch_time')::timestamp`, endOfDay)
      ))
      .orderBy(sql`(${attendancePullExt.allFields}->>'punch_time')::timestamp`);
    
    console.log(`Found ${stagingRecords.length} records in staging table`);
    
    // Count unique employees in staging
    const uniqueEmployeesStaging = new Set(stagingRecords.map(r => r.empCode)).size;
    console.log(`Unique employees in staging: ${uniqueEmployeesStaging}`);
    
    // 2. Check our processed table (attendance_records)
    console.log('\n2. CHECKING OUR PROCESSED TABLE (attendance_records)');
    const processedRecords = await db
      .select({
        id: attendanceRecords.id,
        employeeCode: attendanceRecords.employeeCode,
        checkIn: attendanceRecords.checkIn,
        checkOut: attendanceRecords.checkOut,
        status: attendanceRecords.status
      })
      .from(attendanceRecords)
      .where(and(
        gte(attendanceRecords.date, startOfDay),
        lte(attendanceRecords.date, endOfDay)
      ));
    
    console.log(`Found ${processedRecords.length} records in processed table`);
    console.log(`Unique employees in processed: ${processedRecords.length}`);
    
    // 3. Query BioTime API directly
    console.log('\n3. QUERYING BIOTIME API DIRECTLY');
    const bioTimeService = new BioTimeService();
    
    // Fix SSL certificate issue
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    
    try {
      const authenticated = await bioTimeService.authenticate();
      if (!authenticated) {
        console.log('❌ BioTime authentication failed');
        return;
      }
      
      console.log('✅ BioTime authentication successful');
      
      // Pull data from BioTime for yesterday
      const biotimeResult = await bioTimeService.pullAttendanceData(startOfDay, endOfDay);
      
      if (biotimeResult.success) {
        console.log(`✅ BioTime API returned ${biotimeResult.recordsPulled} records`);
      } else {
        console.log(`❌ BioTime API failed: ${biotimeResult.error}`);
      }
      
      // Get the actual data from BioTime API using direct call
      const axios = require('axios');
      const startStr = startOfDay.toISOString().replace('T', ' ').replace('Z', '');
      const endStr = endOfDay.toISOString().replace('T', ' ').replace('Z', '');
      
      const response = await axios.get(
        `${process.env.BIOTIME_API_URL}iclock/api/transactions/`,
        {
          params: {
            start_time: startStr,
            end_time: endStr,
            page_size: 2000 // Larger page size to get all records
          },
          headers: {
            'Authorization': `JWT ${(bioTimeService as any).authToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000,
          httpsAgent: new (require('https')).Agent({ rejectUnauthorized: false })
        }
      );
      
      if (response.data && response.data.data) {
        const biotimeRecords = response.data.data;
        console.log(`📡 BioTime API actual records: ${biotimeRecords.length}`);
        
        // Count unique employees from BioTime
        const uniqueEmployeesBioTime = new Set(biotimeRecords.map(r => r.emp_code)).size;
        console.log(`Unique employees from BioTime: ${uniqueEmployeesBioTime}`);
        
        // Show sample of BioTime data
        console.log('\n📊 SAMPLE BIOTIME RECORDS:');
        biotimeRecords.slice(0, 5).forEach((record, index) => {
          console.log(`${index + 1}. Employee: ${record.emp_code}, Time: ${record.punch_time}, State: ${record.punch_state}, Terminal: ${record.terminal}`);
        });
        
        // 4. COMPARISON ANALYSIS
        console.log('\n4. COMPARISON ANALYSIS');
        console.log('=' .repeat(60));
        console.log(`BioTime API Records:     ${biotimeRecords.length}`);
        console.log(`Our Staging Records:     ${stagingRecords.length}`);
        console.log(`Our Processed Records:   ${processedRecords.length}`);
        console.log('-'.repeat(60));
        console.log(`BioTime Unique Employees: ${uniqueEmployeesBioTime}`);
        console.log(`Staging Unique Employees: ${uniqueEmployeesStaging}`);
        console.log(`Processed Unique Employees: ${processedRecords.length}`);
        console.log('=' .repeat(60));
        
        // Calculate missing data
        const missingFromStaging = biotimeRecords.length - stagingRecords.length;
        const missingFromProcessed = uniqueEmployeesBioTime - processedRecords.length;
        
        console.log('\n5. MISSING DATA ANALYSIS');
        if (missingFromStaging > 0) {
          console.log(`🚨 MISSING ${missingFromStaging} records from staging table`);
          console.log(`   This indicates polling is missing data from BioTime API`);
        } else if (missingFromStaging < 0) {
          console.log(`ℹ️  We have ${Math.abs(missingFromStaging)} MORE records in staging than BioTime returned`);
          console.log(`   This could indicate duplicate records in our staging table`);
        } else {
          console.log(`✅ Staging table has same number of records as BioTime API`);
        }
        
        if (missingFromProcessed > 0) {
          console.log(`🚨 MISSING ${missingFromProcessed} employee records from processed table`);
          console.log(`   This indicates processing is failing to convert staging data`);
        } else {
          console.log(`✅ Processed table has correct number of employee records`);
        }
        
        // Check for time gaps that might indicate missing data
        console.log('\n6. TIME GAP ANALYSIS');
        const biotimeTimes = biotimeRecords.map(r => new Date(r.punch_time)).sort((a, b) => a.getTime() - b.getTime());
        const stagingTimes = stagingRecords.map(r => new Date(r.punchTime)).sort((a, b) => a.getTime() - b.getTime());
        
        console.log(`BioTime time range: ${biotimeTimes[0]?.toISOString()} to ${biotimeTimes[biotimeTimes.length - 1]?.toISOString()}`);
        console.log(`Staging time range: ${stagingTimes[0]?.toISOString()} to ${stagingTimes[stagingTimes.length - 1]?.toISOString()}`);
        
        // Look for time gaps > 30 minutes
        let timeGaps = 0;
        for (let i = 1; i < biotimeTimes.length; i++) {
          const gap = biotimeTimes[i].getTime() - biotimeTimes[i-1].getTime();
          if (gap > 30 * 60 * 1000) { // 30 minutes
            timeGaps++;
          }
        }
        
        console.log(`Time gaps > 30 minutes in BioTime data: ${timeGaps}`);
        
        // 7. RECOMMENDATIONS
        console.log('\n7. RECOMMENDATIONS');
        console.log('=' .repeat(60));
        
        if (missingFromStaging > 0) {
          console.log(`🎯 POLLING OVERLAP STRATEGY NEEDED:`);
          console.log(`   - Current 5-minute intervals are missing ${missingFromStaging} records`);
          console.log(`   - Implement 7-minute retrieval with 2-minute overlap`);
          console.log(`   - This will ensure all data is captured during polling`);
        }
        
        if (missingFromProcessed > 0) {
          console.log(`🎯 PROCESSING IMPROVEMENTS NEEDED:`);
          console.log(`   - Fix processing pipeline to handle all staging records`);
          console.log(`   - Implement duplicate handling in processing`);
        }
        
        if (timeGaps > 0) {
          console.log(`🎯 EXTENDED POLLING NEEDED:`);
          console.log(`   - ${timeGaps} time gaps detected in BioTime data`);
          console.log(`   - Consider hourly extended polling to fill gaps`);
        }
        
        console.log('\n✅ ANALYSIS COMPLETE');
        console.log(`The intelligent polling overlap strategy is ${missingFromStaging > 0 ? 'REQUIRED' : 'OPTIONAL'}`);
        
      } else {
        console.log('❌ No data returned from BioTime API');
      }
      
    } catch (error) {
      console.error('❌ BioTime API error:', error.message);
    }
    
  } catch (error) {
    console.error('Error comparing records:', error);
  }
}

// Run the comparison
compareBioTimeRecords()
  .then(() => {
    console.log('\n🎉 Record comparison completed');
  })
  .catch(error => {
    console.error('Comparison failed:', error);
  });