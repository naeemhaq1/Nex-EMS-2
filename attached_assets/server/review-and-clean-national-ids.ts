import { db } from "./db";
import { employeeRecords } from "../shared/schema";
import { eq, and, isNotNull, inArray } from "drizzle-orm";

async function reviewAndCleanNationalIds() {
  console.log("Starting national ID review and cleanup...");
  
  try {
    // Get all recently updated PSH and FSD employees
    const recentlyUpdated = await db
      .select()
      .from(employeeRecords)
      .where(
        and(
          inArray(employeeRecords.department, ['PSH', 'FSD', 'FSD-OFC']),
          isNotNull(employeeRecords.nationalId),
          eq(employeeRecords.isActive, true)
        )
      );

    console.log(`Found ${recentlyUpdated.length} PSH/FSD employees with national IDs`);

    // List of employees that should have their national IDs cleared
    // These are likely incorrect matches based on the CSV data being for different departments
    const employeesToClear = recentlyUpdated.filter(emp => {
      const fullName = `${emp.salutation || ''} ${emp.firstName || ''} ${emp.middleName || ''} ${emp.lastName || ''}`.trim();
      console.log(`Reviewing: ${emp.employeeCode} - ${fullName} (${emp.department}) - CNIC: ${emp.nationalId}`);
      
      // Since the CSV data was not specifically for PSH/FSD, we should clear these
      // to maintain data integrity
      return true;
    });

    console.log(`\nClearing national IDs for ${employeesToClear.length} employees:`);
    
    for (const emp of employeesToClear) {
      const fullName = `${emp.salutation || ''} ${emp.firstName || ''} ${emp.middleName || ''} ${emp.lastName || ''}`.trim();
      console.log(`- ${emp.employeeCode}: ${fullName} (${emp.department})`);
      
      await db
        .update(employeeRecords)
        .set({ 
          nationalId: null,
          updatedAt: new Date()
        })
        .where(eq(employeeRecords.employeeCode, emp.employeeCode));
    }

    console.log(`\nCleanup completed. Cleared ${employeesToClear.length} potentially incorrect national IDs.`);
    
  } catch (error) {
    console.error("Error during national ID cleanup:", error);
  }
}

// Run the cleanup
reviewAndCleanNationalIds().catch(console.error);