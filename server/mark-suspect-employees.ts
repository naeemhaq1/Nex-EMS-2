import { db } from "./db";
import { employeeRecords } from "../shared/schema";
import { eq } from "drizzle-orm";

async function markSuspectEmployees() {
  console.log("Starting to mark suspect employees...");
  
  // Based on the image, these are the employee codes to mark as suspect
  const suspectEmployeeCodes = [
    "10070501", // Muhammad Raza
    "10070502", // Muhammad Zeeshan  
    "10070503", // Muhammad Awais Raza
    "10070504"  // Muhammad Ahmad Nisar
  ];
  
  try {
    let updatedCount = 0;
    
    for (const empCode of suspectEmployeeCodes) {
      console.log(`Processing employee code: ${empCode}`);
      
      // Find and update the employee
      const result = await db
        .update(employeeRecords)
        .set({
          suspect: true,
          susreason: "duplicate",
          updatedAt: new Date()
        })
        .where(eq(employeeRecords.employeeCode, empCode))
        .returning({ employeeCode: employeeRecords.employeeCode, firstName: employeeRecords.firstName, lastName: employeeRecords.lastName });
      
      if (result.length > 0) {
        console.log(`  ✓ Marked as suspect: ${result[0].employeeCode} - ${result[0].firstName} ${result[0].lastName}`);
        updatedCount++;
      } else {
        console.log(`  ✗ Employee not found: ${empCode}`);
      }
    }
    
    console.log(`\n=== Suspect Employee Update Summary ===`);
    console.log(`Total employees to mark: ${suspectEmployeeCodes.length}`);
    console.log(`Successfully marked as suspect: ${updatedCount}`);
    console.log(`Not found: ${suspectEmployeeCodes.length - updatedCount}`);
    
  } catch (error) {
    console.error("Error marking suspect employees:", error);
  }
}

// Run the update
markSuspectEmployees().catch(console.error);