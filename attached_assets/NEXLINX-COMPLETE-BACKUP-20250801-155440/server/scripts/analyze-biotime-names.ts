import { db } from "../db";
import { employeeRecords, attendancePullExt } from "../../shared/schema";
import { eq } from "drizzle-orm";

async function analyzeBioTimeNames() {
  try {
    console.log("🔍 ANALYZING BIOTIME VS EMPLOYEE RECORD NAME MISMATCHES");
    console.log("=" .repeat(60));
    
    // Get recent BioTime data with names
    const bioTimeRecords = await db
      .select({
        empCode: attendancePullExt.empCode,
        firstName: attendancePullExt.firstName,
        lastName: attendancePullExt.lastName
      })
      .from(attendancePullExt)
      .where(eq(attendancePullExt.empCode, "10090308")) // Start with one example
      .limit(5);
    
    console.log("\n📊 SAMPLE BIOTIME RECORDS:");
    bioTimeRecords.forEach(record => {
      console.log(`   ${record.empCode}: "${record.firstName}" "${record.lastName}"`);
    });
    
    // Get all employee records
    const employeeRecordsData = await db
      .select({
        employeeCode: employeeRecords.employeeCode,
        firstName: employeeRecords.firstName,
        lastName: employeeRecords.lastName,
        department: employeeRecords.department
      })
      .from(employeeRecords)
      .where(eq(employeeRecords.isActive, true))
      .limit(10);
    
    console.log("\n📊 SAMPLE EMPLOYEE RECORDS:");
    employeeRecordsData.forEach(record => {
      console.log(`   ${record.employeeCode}: "${record.firstName}" "${record.lastName}" (${record.department})`);
    });
    
    // Get BioTime name patterns for all employees
    const bioTimeNamePatterns = await db
      .select({
        empCode: attendancePullExt.empCode,
        firstName: attendancePullExt.firstName,
        lastName: attendancePullExt.lastName
      })
      .from(attendancePullExt)
      .groupBy(attendancePullExt.empCode, attendancePullExt.firstName, attendancePullExt.lastName)
      .limit(50);
    
    console.log("\n📋 BIOTIME NAME PATTERNS (50 samples):");
    bioTimeNamePatterns.forEach(record => {
      console.log(`   ${record.empCode}: "${record.firstName}" "${record.lastName}"`);
    });
    
    // Find mismatches between BioTime and employee records
    console.log("\n🔍 CHECKING FOR NAME MISMATCHES:");
    
    const mismatches = [];
    
    for (const bioTimeRecord of bioTimeNamePatterns) {
      const employeeRecord = employeeRecordsData.find(emp => 
        emp.employeeCode === bioTimeRecord.empCode
      );
      
      if (employeeRecord) {
        const firstNameMatch = employeeRecord.firstName?.toLowerCase().trim() === bioTimeRecord.firstName?.toLowerCase().trim();
        const lastNameMatch = employeeRecord.lastName?.toLowerCase().trim() === bioTimeRecord.lastName?.toLowerCase().trim();
        
        if (!firstNameMatch || !lastNameMatch) {
          mismatches.push({
            empCode: bioTimeRecord.empCode,
            bioTimeFirst: bioTimeRecord.firstName,
            bioTimeLast: bioTimeRecord.lastName,
            employeeFirst: employeeRecord.firstName,
            employeeLast: employeeRecord.lastName
          });
        }
      }
    }
    
    console.log(`\n⚠️  FOUND ${mismatches.length} NAME MISMATCHES:`);
    mismatches.forEach(mismatch => {
      console.log(`   ${mismatch.empCode}:`);
      console.log(`      BioTime: "${mismatch.bioTimeFirst}" "${mismatch.bioTimeLast}"`);
      console.log(`      Employee: "${mismatch.employeeFirst}" "${mismatch.employeeLast}"`);
      console.log("");
    });
    
    // Check for employees that were recently corrected
    const recentlyFixed = [
      "10090521", "10090700", "10090692", "10070564", "10090328",
      "10070544", "10090705", "10090691", "10070545", "10090699"
    ];
    
    console.log("\n🔧 CHECKING RECENTLY FIXED EMPLOYEES:");
    
    for (const empCode of recentlyFixed) {
      const bioTimeData = bioTimeNamePatterns.find(bt => bt.empCode === empCode);
      const employeeData = employeeRecordsData.find(emp => emp.employeeCode === empCode);
      
      if (bioTimeData && employeeData) {
        console.log(`   ${empCode}:`);
        console.log(`      BioTime: "${bioTimeData.firstName}" "${bioTimeData.lastName}"`);
        console.log(`      Employee: "${employeeData.firstName}" "${employeeData.lastName}"`);
        
        if (bioTimeData.firstName !== employeeData.firstName || bioTimeData.lastName !== employeeData.lastName) {
          console.log(`      ⚠️  MISMATCH DETECTED`);
        } else {
          console.log(`      ✅ MATCH`);
        }
      } else {
        console.log(`   ${empCode}: No BioTime data found`);
      }
    }
    
  } catch (error) {
    console.error("❌ Error analyzing BioTime names:", error);
    process.exit(1);
  }
}

analyzeBioTimeNames().then(() => {
  console.log("\n✅ BioTime name analysis completed");
  process.exit(0);
});