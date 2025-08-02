
import { db } from "./db";
import { users, employeeRecords } from "./shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

async function createSimpleTestUser() {
  try {
    console.log("Creating simple test user...");
    
    // Check if user already exists
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.username, "test"))
      .limit(1);
    
    if (existingUser.length > 0) {
      console.log("✓ Test user already exists");
      console.log("  Username: test");
      console.log("  Password: test");
      console.log("  Role: employee");
      return;
    }
    
    // Find an active employee to link to
    const [sampleEmployee] = await db
      .select({
        employeeCode: employeeRecords.employeeCode,
        firstName: employeeRecords.firstName,
        lastName: employeeRecords.lastName,
        department: employeeRecords.department
      })
      .from(employeeRecords)
      .where(eq(employeeRecords.isActive, true))
      .limit(1);
    
    if (!sampleEmployee) {
      console.log("❌ No active employees found to link to");
      return;
    }
    
    console.log(`Found employee: ${sampleEmployee.firstName} ${sampleEmployee.lastName} (${sampleEmployee.employeeCode})`);
    
    // Hash the password
    const hashedPassword = await bcrypt.hash("test", 10);
    
    // Create test user
    const [testUser] = await db.insert(users).values({
      username: "test",
      password: hashedPassword,
      role: "employee",
      isActive: true,
      employeeId: sampleEmployee.employeeCode,
      accountType: "employee",
      isTemporaryPassword: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    console.log("✅ Test user created successfully:");
    console.log(`   Username: test`);
    console.log(`   Password: test`);
    console.log(`   Role: employee`);
    console.log(`   ID: ${testUser.id}`);
    console.log(`   Linked to Employee: ${sampleEmployee.firstName} ${sampleEmployee.lastName} (${sampleEmployee.employeeCode})`);
    
  } catch (error) {
    console.error("❌ Error creating test user:", error);
  }
}

// Run the script
createSimpleTestUser().then(() => {
  console.log("✅ Test user creation completed");
  process.exit(0);
}).catch(error => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});
