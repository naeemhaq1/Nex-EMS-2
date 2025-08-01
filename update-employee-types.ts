import { db } from "./db";
import { employeeRecords } from "@shared/schema";
import { eq, or, sql } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config();

async function updateEmployeeTypes() {
  console.log("=== Updating Employee Types ===");
  console.log(`Date: ${new Date().toISOString()}\n`);

  try {
    // First, update all employees in SafeCity departments to Contracted
    console.log("Updating SafeCity departments to Contracted...");
    const contractedUpdate = await db
      .update(employeeRecords)
      .set({ empType: "Contracted" })
      .where(
        or(
          eq(employeeRecords.department, "LHE-Safecity"),
          eq(employeeRecords.department, "LHE-Safecity-Drivers")
        )
      )
      .returning();

    console.log(`✓ Updated ${contractedUpdate.length} employees to Contracted`);

    // Update all other active employees to Full-time (if not already set)
    console.log("\nUpdating all other departments to Full-time...");
    const fullTimeUpdate = await db
      .update(employeeRecords)
      .set({ empType: "Full-time" })
      .where(
        sql`${employeeRecords.department} NOT IN ('LHE-Safecity', 'LHE-Safecity-Drivers', 'MIGRATED_TO_FORMER_EMPLOYEES') 
            AND ${employeeRecords.isActive} = true`
      )
      .returning();

    console.log(`✓ Updated ${fullTimeUpdate.length} employees to Full-time`);

    // Get summary statistics
    const [contractedCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(employeeRecords)
      .where(eq(employeeRecords.empType, "Contracted"));

    const [fullTimeCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(employeeRecords)
      .where(eq(employeeRecords.empType, "Full-time"));

    console.log("\n=== Summary ===");
    console.log(`Total Contracted employees: ${contractedCount.count}`);
    console.log(`Total Full-time employees: ${fullTimeCount.count}`);

    // Show breakdown by department
    console.log("\n=== Department Breakdown ===");
    const departmentBreakdown = await db
      .select({
        department: employeeRecords.department,
        empType: employeeRecords.empType,
        count: sql<number>`count(*)::int`
      })
      .from(employeeRecords)
      .where(eq(employeeRecords.isActive, true))
      .groupBy(employeeRecords.department, employeeRecords.empType)
      .orderBy(employeeRecords.department);

    departmentBreakdown.forEach(dept => {
      console.log(`${dept.department}: ${dept.empType} - ${dept.count} employees`);
    });

    console.log("\n✓ Employee type update completed successfully!");

  } catch (error) {
    console.error("Error updating employee types:", error);
    process.exit(1);
  }
}

// Run the update
updateEmployeeTypes().then(() => process.exit(0));