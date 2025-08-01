import { db } from "./db";
import { employeeRecords } from "@shared/schema";
import { sql } from "drizzle-orm";

async function analyzeCnicMobileData() {
  console.log("=== Analyzing CNIC and Mobile Number Data ===\n");
  
  try {
    // 1. Check CNIC data status
    const cnicStats = await db.select({
      totalEmployees: sql<number>`count(*)`,
      withValidCnic: sql<number>`count(*) filter (where LENGTH(${employeeRecords.nationalId}) = 13 AND ${employeeRecords.nationalId} ~ '^[0-9]+$')`,
      withInvalidCnic: sql<number>`count(*) filter (where ${employeeRecords.nationalId} IS NOT NULL AND (LENGTH(${employeeRecords.nationalId}) != 13 OR ${employeeRecords.nationalId} !~ '^[0-9]+$'))`,
      missingCnic: sql<number>`count(*) filter (where ${employeeRecords.nationalId} IS NULL)`
    })
    .from(employeeRecords)
    .where(sql`${employeeRecords.firstName} != 'NOC'`);
    
    console.log("📊 CNIC DATA STATUS:");
    console.log(`   Total Employees: ${cnicStats[0].totalEmployees}`);
    console.log(`   With Valid CNIC (13 digits): ${cnicStats[0].withValidCnic}`);
    console.log(`   With Invalid CNIC: ${cnicStats[0].withInvalidCnic}`);
    console.log(`   Missing CNIC: ${cnicStats[0].missingCnic}`);
    console.log(`   Coverage: ${((cnicStats[0].withValidCnic / cnicStats[0].totalEmployees) * 100).toFixed(1)}%`);
    
    // 2. Check Mobile data status
    const mobileStats = await db.select({
      totalEmployees: sql<number>`count(*)`,
      withValidMobile: sql<number>`count(*) filter (where ${employeeRecords.contactNumber} LIKE '03%' AND LENGTH(${employeeRecords.contactNumber}) = 11)`,
      withOtherMobile: sql<number>`count(*) filter (where ${employeeRecords.contactNumber} IS NOT NULL AND (NOT ${employeeRecords.contactNumber} LIKE '03%' OR LENGTH(${employeeRecords.contactNumber}) != 11))`,
      missingMobile: sql<number>`count(*) filter (where ${employeeRecords.contactNumber} IS NULL)`
    })
    .from(employeeRecords)
    .where(sql`${employeeRecords.firstName} != 'NOC'`);
    
    console.log("\n📱 MOBILE NUMBER STATUS:");
    console.log(`   Total Employees: ${mobileStats[0].totalEmployees}`);
    console.log(`   With Valid Mobile (03XXXXXXXXX): ${mobileStats[0].withValidMobile}`);
    console.log(`   With Other Format Mobile: ${mobileStats[0].withOtherMobile}`);
    console.log(`   Missing Mobile: ${mobileStats[0].missingMobile}`);
    console.log(`   Coverage: ${((mobileStats[0].withValidMobile / mobileStats[0].totalEmployees) * 100).toFixed(1)}%`);
    
    // 3. Show sample of employees with valid mobile numbers
    const employeesWithMobile = await db.select({
      employeeCode: employeeRecords.employeeCode,
      firstName: employeeRecords.firstName,
      lastName: employeeRecords.lastName,
      contactNumber: employeeRecords.contactNumber,
      department: employeeRecords.department
    })
    .from(employeeRecords)
    .where(sql`${employeeRecords.contactNumber} LIKE '03%' AND LENGTH(${employeeRecords.contactNumber}) = 11`)
    .limit(10);
    
    if (employeesWithMobile.length > 0) {
      console.log("\n📋 SAMPLE EMPLOYEES WITH VALID MOBILE NUMBERS:");
      employeesWithMobile.forEach(emp => {
        console.log(`   ${emp.employeeCode} - ${emp.firstName} ${emp.lastName || ''} - ${emp.contactNumber} - ${emp.department}`);
      });
    }
    
    // 4. Show sample of employees with CNIC but no mobile
    const employeesWithCnicNoMobile = await db.select({
      employeeCode: employeeRecords.employeeCode,
      firstName: employeeRecords.firstName,
      lastName: employeeRecords.lastName,
      nationalId: employeeRecords.nationalId,
      department: employeeRecords.department
    })
    .from(employeeRecords)
    .where(sql`
      LENGTH(${employeeRecords.nationalId}) = 13 
      AND ${employeeRecords.nationalId} ~ '^[0-9]+$'
      AND (${employeeRecords.contactNumber} IS NULL OR ${employeeRecords.contactNumber} NOT LIKE '03%' OR LENGTH(${employeeRecords.contactNumber}) != 11)
    `)
    .limit(10);
    
    console.log("\n🔍 SAMPLE EMPLOYEES WITH CNIC BUT NO VALID MOBILE:");
    employeesWithCnicNoMobile.forEach(emp => {
      console.log(`   ${emp.employeeCode} - ${emp.firstName} ${emp.lastName || ''} - CNIC: ${emp.nationalId} - Dept: ${emp.department}`);
    });
    
  } catch (error) {
    console.error("Error analyzing data:", error);
  }
}

// Run the analysis
analyzeCnicMobileData().then(() => {
  console.log("\n✅ Analysis complete!");
  process.exit(0);
}).catch(error => {
  console.error("Script failed:", error);
  process.exit(1);
});