import { db } from "./db";
import { employeeRecords, employeePullExt } from "@shared/schema";
import { eq, sql, isNull, and } from "drizzle-orm";

async function updateCnicData() {
  console.log("Starting CNIC data update...");
  
  try {
    // First, get all employee pull data with their national field
    const pullData = await db
      .select({
        employeeCode: employeePullExt.employeeCode,
        allFields: employeePullExt.allFields
      })
      .from(employeePullExt);
    
    console.log(`Found ${pullData.length} employee records in pull table`);
    
    let updatedCount = 0;
    let cnicFoundCount = 0;
    let cnicMissingCount = 0;
    
    // Process each employee
    for (const record of pullData) {
      if (!record.employeeCode) continue;
      
      const allFields = record.allFields as any;
      const nationalId = allFields?.national || null;
      
      // Clean and normalize the CNIC (remove dashes and spaces)
      const cleanedCnic = nationalId ? nationalId.toString().replace(/[-\s]/g, '').trim() : null;
      
      // Determine if CNIC is missing
      const cnicMissing = !cleanedCnic || cleanedCnic === '' ? 'yes' : 'no';
      
      // Update the employee record
      const result = await db
        .update(employeeRecords)
        .set({
          nationalId: cleanedCnic || null,
          cnicMissing: cnicMissing
        })
        .where(eq(employeeRecords.employeeCode, record.employeeCode));
      
      if (cleanedCnic) {
        cnicFoundCount++;
      } else {
        cnicMissingCount++;
      }
      
      updatedCount++;
      
      if (updatedCount % 50 === 0) {
        console.log(`Processed ${updatedCount} employees...`);
      }
    }
    
    console.log("\n=== CNIC Update Summary ===");
    console.log(`Total employees processed: ${updatedCount}`);
    console.log(`Employees with CNIC: ${cnicFoundCount}`);
    console.log(`Employees missing CNIC: ${cnicMissingCount}`);
    
    // Verify the update by checking a few records
    const sampleRecords = await db
      .select({
        employeeCode: employeeRecords.employeeCode,
        firstName: employeeRecords.firstName,
        nationalId: employeeRecords.nationalId,
        cnicMissing: employeeRecords.cnicMissing
      })
      .from(employeeRecords)
      .limit(10);
    
    console.log("\nSample of updated records:");
    console.log(sampleRecords);
    
  } catch (error) {
    console.error("Error updating CNIC data:", error);
  }
}

// Run the update
updateCnicData().then(() => {
  console.log("\nCNIC update completed!");
  process.exit(0);
}).catch((error) => {
  console.error("Failed to update CNIC data:", error);
  process.exit(1);
});