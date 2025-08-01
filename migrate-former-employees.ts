import { db } from "./db";
import { employeeRecords, formerEmployees, attendanceRecords } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config();

async function migrateFormerEmployees() {
  console.log("=== Migrating Former Employees ===");
  console.log(`Date: ${new Date().toISOString()}`);
  console.log("");

  try {
    // First, create the former_employees table
    console.log("Creating former_employees table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS former_employees (
        id SERIAL PRIMARY KEY,
        employee_code VARCHAR(50) NOT NULL UNIQUE,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        email VARCHAR(100),
        mobile VARCHAR(50),
        department VARCHAR(100),
        designation VARCHAR(100),
        date_of_joining TIMESTAMP,
        is_active BOOLEAN DEFAULT false,
        national VARCHAR(50),
        date_of_leaving TIMESTAMP,
        reason_for_leaving TEXT,
        moved_from_employee_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("✓ Former employees table created/verified");

    // Get all employees in "Left-company" department
    const leftEmployees = await db
      .select()
      .from(employeeRecords)
      .where(eq(employeeRecords.department, "Left-company"));

    console.log(`\nFound ${leftEmployees.length} employees in Left-company department`);

    if (leftEmployees.length === 0) {
      console.log("No employees to migrate");
      return;
    }

    // Move each employee to former_employees table
    console.log("\nMigrating employees...");
    let migrated = 0;
    let failed = 0;

    for (const employee of leftEmployees) {
      try {
        // Insert into former_employees
        await db.insert(formerEmployees).values({
          employeeCode: employee.employeeCode,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          mobile: employee.mobile,
          department: employee.department,
          designation: employee.designation,
          dateOfJoining: employee.dateOfJoining,
          isActive: false,
          national: employee.national,
          dateOfLeaving: new Date(), // Set today as leaving date
          reasonForLeaving: "Migrated from Left-company department",
          movedFromEmployeeId: employee.id,
        });

        console.log(`  ✓ Migrated: ${employee.employeeCode} - ${employee.firstName} ${employee.lastName || ""}`);
        migrated++;
      } catch (error: any) {
        console.error(`  ✗ Failed to migrate ${employee.employeeCode}: ${error.message}`);
        failed++;
      }
    }

    console.log(`\nMigration Summary:`);
    console.log(`  ✓ Successfully migrated: ${migrated} employees`);
    console.log(`  ✗ Failed: ${failed} employees`);

    if (migrated > 0) {
      // Update employees to mark them as inactive instead of deleting
      console.log("\nMarking migrated employees as inactive...");
      const updated = await db
        .update(employeeRecords)
        .set({ 
          isActive: false,
          department: "MIGRATED_TO_FORMER_EMPLOYEES" 
        })
        .where(eq(employeeRecords.department, "Left-company"))
        .returning();
      
      console.log(`✓ Marked ${updated.length} employees as inactive`);
      console.log("Note: Employees remain in employee_records for historical data integrity");
    }

    // Update total employee count
    const remainingEmployees = await db.select().from(employeeRecords);
    console.log(`\n✓ Current active employees: ${remainingEmployees.length}`);

    // Show departments without "Left-company"
    const departments = await db
      .selectDistinct({ department: employeeRecords.department })
      .from(employeeRecords);
    
    console.log("\nRemaining departments:");
    departments
      .map(d => d.department)
      .filter(d => d)
      .sort()
      .forEach(dept => console.log(`  - ${dept}`));

  } catch (error) {
    console.error("Migration error:", error);
  }

  process.exit(0);
}

migrateFormerEmployees();