import { db } from "./db";
import { employeeRecords, employeePullExt } from "@shared/schema";
import { eq, sql, and, isNull } from "drizzle-orm";

async function populateCnicData() {
  console.log("=== Populating CNIC Data from BioTime API ===\n");
  
  try {
    // First, get statistics before update
    const beforeStats = await db.select({
      totalEmployees: sql<number>`count(*)`,
      withValidCnic: sql<number>`count(*) filter (where LENGTH(${employeeRecords.nationalId}) = 13 AND ${employeeRecords.nationalId} ~ '^[0-9]+$')`,
      missingCnic: sql<number>`count(*) filter (where ${employeeRecords.nationalId} IS NULL OR LENGTH(${employeeRecords.nationalId}) != 13)`
    })
    .from(employeeRecords);
    
    console.log("📊 BEFORE UPDATE:");
    console.log(`   Total Employees: ${beforeStats[0].totalEmployees}`);
    console.log(`   With Valid CNIC: ${beforeStats[0].withValidCnic}`);
    console.log(`   Missing/Invalid CNIC: ${beforeStats[0].missingCnic}`);
    
    // Get all employees with valid CNIC from employee_pull_ext
    const employeesWithCnic = await db.select({
      employeeCode: employeePullExt.employeeCode,
      cnic: sql<string>`all_fields->>'national'`,
      firstName: sql<string>`all_fields->>'first_name'`,
      lastName: sql<string>`all_fields->>'last_name'`,
      department: sql<string>`all_fields->'department'->>'dept_name'`
    })
    .from(employeePullExt)
    .where(sql`all_fields->>'national' IS NOT NULL AND LENGTH(all_fields->>'national') = 13 AND all_fields->>'national' ~ '^[0-9]+$'`);
    
    console.log(`\n🔄 Found ${employeesWithCnic.length} employees with valid CNIC in BioTime data`);
    
    // Update each employee record
    let updatedCount = 0;
    let skippedDuplicates = 0;
    const duplicateCnics = new Map<string, string[]>();
    
    for (const empData of employeesWithCnic) {
      try {
        // Check if this CNIC already exists on a different employee
        const existingWithCnic = await db.select({
          employeeCode: employeeRecords.employeeCode,
          firstName: employeeRecords.firstName,
          lastName: employeeRecords.lastName
        })
        .from(employeeRecords)
        .where(
          and(
            eq(employeeRecords.nationalId, empData.cnic),
            sql`${employeeRecords.employeeCode} != ${empData.employeeCode}`
          )
        );
        
        if (existingWithCnic.length > 0) {
          // Track duplicate CNICs
          if (!duplicateCnics.has(empData.cnic)) {
            duplicateCnics.set(empData.cnic, []);
          }
          duplicateCnics.get(empData.cnic)!.push(empData.employeeCode);
          duplicateCnics.get(empData.cnic)!.push(...existingWithCnic.map(e => e.employeeCode));
          skippedDuplicates++;
          continue;
        }
        
        // Update the employee record
        await db.update(employeeRecords)
          .set({
            nationalId: empData.cnic,
            cnicMissing: 'no'
          })
          .where(eq(employeeRecords.employeeCode, empData.employeeCode));
        
        updatedCount++;
        
        if (updatedCount % 50 === 0) {
          console.log(`   Updated ${updatedCount} records...`);
        }
      } catch (error) {
        console.error(`Error updating employee ${empData.employeeCode}:`, error);
      }
    }
    
    console.log(`\n✅ Successfully updated ${updatedCount} employee records with CNIC`);
    
    if (skippedDuplicates > 0) {
      console.log(`\n⚠️  Skipped ${skippedDuplicates} records due to duplicate CNICs:`);
      for (const [cnic, employees] of duplicateCnics.entries()) {
        const uniqueEmployees = [...new Set(employees)];
        console.log(`   CNIC ${cnic} found in employees: ${uniqueEmployees.join(', ')}`);
      }
    }
    
    // Get statistics after update
    const afterStats = await db.select({
      totalEmployees: sql<number>`count(*)`,
      withValidCnic: sql<number>`count(*) filter (where LENGTH(${employeeRecords.nationalId}) = 13 AND ${employeeRecords.nationalId} ~ '^[0-9]+$')`,
      missingCnic: sql<number>`count(*) filter (where ${employeeRecords.nationalId} IS NULL OR LENGTH(${employeeRecords.nationalId}) != 13)`
    })
    .from(employeeRecords);
    
    console.log("\n📊 AFTER UPDATE:");
    console.log(`   Total Employees: ${afterStats[0].totalEmployees}`);
    console.log(`   With Valid CNIC: ${afterStats[0].withValidCnic} (+${afterStats[0].withValidCnic - beforeStats[0].withValidCnic})`);
    console.log(`   Missing/Invalid CNIC: ${afterStats[0].missingCnic}`);
    
    // Show sample of updated records
    console.log("\n📋 SAMPLE OF UPDATED RECORDS:");
    const sampleUpdated = await db.select({
      employeeCode: employeeRecords.employeeCode,
      firstName: employeeRecords.firstName,
      lastName: employeeRecords.lastName,
      nationalId: employeeRecords.nationalId,
      department: employeeRecords.department
    })
    .from(employeeRecords)
    .where(
      and(
        sql`LENGTH(${employeeRecords.nationalId}) = 13`,
        sql`${employeeRecords.nationalId} ~ '^[0-9]+$'`
      )
    )
    .orderBy(employeeRecords.employeeCode)
    .limit(10);
    
    sampleUpdated.forEach((emp, index) => {
      console.log(`${index + 1}. ${emp.employeeCode} - ${emp.firstName} ${emp.lastName}`);
      console.log(`   CNIC: ${emp.nationalId}`);
      console.log(`   Department: ${emp.department || 'Not specified'}`);
      console.log('');
    });
    
    // Department-wise summary
    console.log("📊 DEPARTMENT-WISE CNIC COMPLETION:");
    const deptStats = await db.select({
      department: employeeRecords.department,
      total: sql<number>`count(*)`,
      withCnic: sql<number>`count(*) filter (where LENGTH(${employeeRecords.nationalId}) = 13)`
    })
    .from(employeeRecords)
    .groupBy(employeeRecords.department)
    .orderBy(sql`count(*) desc`)
    .limit(10);
    
    console.log("\nTop 10 departments:");
    console.log("Department                          | Total | With CNIC | Percentage");
    console.log("------------------------------------|-------|-----------|------------");
    deptStats.forEach(dept => {
      const deptName = (dept.department || 'Unknown').padEnd(35).substring(0, 35);
      const total = dept.total.toString().padStart(5);
      const withCnic = dept.withCnic.toString().padStart(9);
      const percentage = ((dept.withCnic / dept.total) * 100).toFixed(1).padStart(10) + '%';
      console.log(`${deptName} | ${total} | ${withCnic} | ${percentage}`);
    });
    
  } catch (error) {
    console.error("Error populating CNIC data:", error);
  }
}

// Run the population
populateCnicData().then(() => {
  console.log("\n✅ CNIC data population complete!");
  process.exit(0);
}).catch(error => {
  console.error("Script failed:", error);
  process.exit(1);
});