import { db } from "./db";
import { employeeRecords, employeePullExt } from "@shared/schema";
import { eq, sql, and, isNull } from "drizzle-orm";

async function populateCnicBatch() {
  console.log("=== Batch CNIC Population ===\n");
  
  try {
    // Get all employees with valid CNIC from employee_pull_ext that need updating
    const employeesNeedingUpdate = await db.execute(sql`
      SELECT 
        epe.employee_code,
        epe.all_fields->>'national' as cnic
      FROM employee_pull_ext epe
      INNER JOIN employee_records er ON er.employee_code = epe.employee_code
      WHERE 
        epe.all_fields->>'national' IS NOT NULL 
        AND LENGTH(epe.all_fields->>'national') = 13
        AND epe.all_fields->>'national' ~ '^[0-9]+$'
        AND (er.national_id IS NULL OR LENGTH(er.national_id) != 13)
    `);
    
    console.log(`Found ${employeesNeedingUpdate.rows.length} employees needing CNIC update`);
    
    if (employeesNeedingUpdate.rows.length === 0) {
      console.log("No more employees to update!");
      return;
    }
    
    // Update in batches of 20
    const batchSize = 20;
    for (let i = 0; i < employeesNeedingUpdate.rows.length; i += batchSize) {
      const batch = employeesNeedingUpdate.rows.slice(i, i + batchSize);
      
      // Update each employee in the batch
      const updatePromises = batch.map(async (emp: any) => {
        try {
          await db.update(employeeRecords)
            .set({
              nationalId: emp.cnic,
              cnicMissing: 'no'
            })
            .where(eq(employeeRecords.employeeCode, emp.employee_code));
          return { success: true, code: emp.employee_code };
        } catch (error) {
          return { success: false, code: emp.employee_code, error };
        }
      });
      
      const results = await Promise.all(updatePromises);
      const successCount = results.filter(r => r.success).length;
      
      console.log(`Batch ${Math.floor(i/batchSize) + 1}: Updated ${successCount}/${batch.length} records`);
      
      // Small delay between batches to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Final statistics
    const finalStats = await db.select({
      totalEmployees: sql<number>`count(*)`,
      withValidCnic: sql<number>`count(*) filter (where LENGTH(${employeeRecords.nationalId}) = 13 AND ${employeeRecords.nationalId} ~ '^[0-9]+$')`
    })
    .from(employeeRecords)
    .where(sql`${employeeRecords.firstName} != 'NOC'`);
    
    console.log("\n✅ FINAL STATISTICS:");
    console.log(`   Total Employees: ${finalStats[0].totalEmployees}`);
    console.log(`   With Valid CNIC: ${finalStats[0].withValidCnic}`);
    console.log(`   Coverage: ${((finalStats[0].withValidCnic / finalStats[0].totalEmployees) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error("Error in batch update:", error);
  }
}

// Run the batch population
populateCnicBatch().then(() => {
  console.log("\n✅ Batch CNIC population complete!");
  process.exit(0);
}).catch(error => {
  console.error("Script failed:", error);
  process.exit(1);
});