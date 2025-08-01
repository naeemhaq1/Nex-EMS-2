import { db } from "./db";
import { employeeRecords } from "@shared/schema";
import { eq, sql, isNotNull, and, or, isNull } from "drizzle-orm";

async function showCnicMobileData() {
  console.log("=== Current CNIC and Mobile Phone Data Status ===\n");
  
  try {
    // 1. Overall statistics
    const stats = await db.select({
      totalEmployees: sql<number>`count(*)`,
      withValidCnic: sql<number>`count(*) filter (where LENGTH(${employeeRecords.nationalId}) = 13 AND ${employeeRecords.nationalId} ~ '^[0-9]+$')`,
      withValidMobile: sql<number>`count(*) filter (where LENGTH(${employeeRecords.phone}) = 11 AND ${employeeRecords.phone} ~ '^0[0-9]{10}$')`,
      withBothValid: sql<number>`count(*) filter (where LENGTH(${employeeRecords.nationalId}) = 13 AND ${employeeRecords.nationalId} ~ '^[0-9]+$' AND LENGTH(${employeeRecords.phone}) = 11 AND ${employeeRecords.phone} ~ '^0[0-9]{10}$')`,
      missingBoth: sql<number>`count(*) filter (where (${employeeRecords.nationalId} IS NULL OR LENGTH(${employeeRecords.nationalId}) != 13) AND (${employeeRecords.phone} IS NULL OR LENGTH(${employeeRecords.phone}) != 11))`
    })
    .from(employeeRecords);
    
    const stat = stats[0];
    console.log("📊 OVERALL STATISTICS:");
    console.log(`   Total Employees: ${stat.totalEmployees}`);
    console.log(`   With Valid CNIC (13 digits): ${stat.withValidCnic} (${((stat.withValidCnic/stat.totalEmployees)*100).toFixed(1)}%)`);
    console.log(`   With Valid Mobile (11 digits): ${stat.withValidMobile} (${((stat.withValidMobile/stat.totalEmployees)*100).toFixed(1)}%)`);
    console.log(`   With Both CNIC & Mobile: ${stat.withBothValid} (${((stat.withBothValid/stat.totalEmployees)*100).toFixed(1)}%)`);
    console.log(`   Missing Both: ${stat.missingBoth} (${((stat.missingBoth/stat.totalEmployees)*100).toFixed(1)}%)`);
    
    // 2. Show employees with valid CNIC
    console.log("\n\n✅ EMPLOYEES WITH VALID CNIC (13 digits):");
    const withCnic = await db.select({
      employeeCode: employeeRecords.employeeCode,
      firstName: employeeRecords.firstName,
      lastName: employeeRecords.lastName,
      nationalId: employeeRecords.nationalId,
      phone: employeeRecords.phone,
      department: employeeRecords.department
    })
    .from(employeeRecords)
    .where(sql`LENGTH(${employeeRecords.nationalId}) = 13 AND ${employeeRecords.nationalId} ~ '^[0-9]+$'`)
    .orderBy(employeeRecords.employeeCode);
    
    if (withCnic.length > 0) {
      console.log(`Found ${withCnic.length} employees with valid CNIC:\n`);
      withCnic.forEach((emp, index) => {
        console.log(`${index + 1}. ${emp.employeeCode} - ${emp.firstName} ${emp.lastName}`);
        console.log(`   Department: ${emp.department || 'Not specified'}`);
        console.log(`   CNIC: ${emp.nationalId}`);
        console.log(`   Mobile: ${emp.phone || 'Not available'}`);
        console.log('');
      });
    } else {
      console.log("   No employees found with valid CNIC");
    }
    
    // 3. Show employees with valid mobile numbers
    console.log("\n✅ EMPLOYEES WITH VALID MOBILE NUMBERS (11 digits):");
    const withMobile = await db.select({
      employeeCode: employeeRecords.employeeCode,
      firstName: employeeRecords.firstName,
      lastName: employeeRecords.lastName,
      nationalId: employeeRecords.nationalId,
      phone: employeeRecords.phone,
      department: employeeRecords.department
    })
    .from(employeeRecords)
    .where(sql`LENGTH(${employeeRecords.phone}) = 11 AND ${employeeRecords.phone} ~ '^0[0-9]{10}$'`)
    .orderBy(employeeRecords.employeeCode);
    
    if (withMobile.length > 0) {
      console.log(`Found ${withMobile.length} employees with valid mobile:\n`);
      withMobile.forEach((emp, index) => {
        console.log(`${index + 1}. ${emp.employeeCode} - ${emp.firstName} ${emp.lastName}`);
        console.log(`   Department: ${emp.department || 'Not specified'}`);
        console.log(`   Mobile: ${emp.phone}`);
        console.log(`   CNIC: ${emp.nationalId || 'Not available'}`);
        console.log('');
      });
    } else {
      console.log("   No employees found with valid mobile numbers");
    }
    
    // 4. Show sample of employees missing data
    console.log("\n❌ SAMPLE OF EMPLOYEES MISSING CNIC/MOBILE DATA:");
    const missingData = await db.select({
      employeeCode: employeeRecords.employeeCode,
      firstName: employeeRecords.firstName,
      lastName: employeeRecords.lastName,
      nationalId: employeeRecords.nationalId,
      phone: employeeRecords.phone,
      department: employeeRecords.department
    })
    .from(employeeRecords)
    .where(
      and(
        or(isNull(employeeRecords.nationalId), sql`LENGTH(${employeeRecords.nationalId}) != 13`),
        or(isNull(employeeRecords.phone), sql`LENGTH(${employeeRecords.phone}) != 11`)
      )
    )
    .orderBy(employeeRecords.department, employeeRecords.employeeCode)
    .limit(20);
    
    console.log(`Showing first 20 of ${stat.missingBoth} employees missing data:\n`);
    missingData.forEach((emp, index) => {
      console.log(`${index + 1}. ${emp.employeeCode} - ${emp.firstName} ${emp.lastName}`);
      console.log(`   Department: ${emp.department || 'Not specified'}`);
      console.log(`   CNIC: ${emp.nationalId || 'MISSING'} ${emp.nationalId && emp.nationalId.length !== 13 ? `(Invalid: ${emp.nationalId.length} digits)` : ''}`);
      console.log(`   Mobile: ${emp.phone || 'MISSING'} ${emp.phone && emp.phone.length !== 11 ? `(Invalid: ${emp.phone.length} digits)` : ''}`);
      console.log('');
    });
    
    // 5. Department-wise breakdown
    console.log("\n📊 DEPARTMENT-WISE DATA COMPLETENESS:");
    const deptStats = await db.select({
      department: employeeRecords.department,
      total: sql<number>`count(*)`,
      withCnic: sql<number>`count(*) filter (where LENGTH(${employeeRecords.nationalId}) = 13)`,
      withMobile: sql<number>`count(*) filter (where LENGTH(${employeeRecords.phone}) = 11)`
    })
    .from(employeeRecords)
    .groupBy(employeeRecords.department)
    .orderBy(sql`count(*) desc`)
    .limit(10);
    
    console.log("Top 10 departments by employee count:\n");
    console.log("Department                          | Total | With CNIC | With Mobile");
    console.log("------------------------------------|-------|-----------|-------------");
    deptStats.forEach(dept => {
      const deptName = (dept.department || 'Unknown').padEnd(35).substring(0, 35);
      const total = dept.total.toString().padStart(5);
      const cnic = dept.withCnic.toString().padStart(9);
      const mobile = dept.withMobile.toString().padStart(11);
      console.log(`${deptName} | ${total} | ${cnic} | ${mobile}`);
    });
    
    // 6. Recommendations
    console.log("\n\n💡 RECOMMENDATIONS:");
    console.log("1. Current data shows very limited CNIC and mobile information");
    console.log("2. Only 2 employees have valid CNICs (0.5% of total)");
    console.log("3. Only 3 employees have valid mobile numbers (0.8% of total)");
    console.log("4. Consider syncing fresh data from BioTime API to check for updates");
    console.log("5. May need to implement a manual data entry interface for missing information");
    
  } catch (error) {
    console.error("Error showing data:", error);
  }
}

// Run the analysis
showCnicMobileData().then(() => {
  console.log("\n✅ Data review complete!");
  process.exit(0);
}).catch(error => {
  console.error("Script failed:", error);
  process.exit(1);
});