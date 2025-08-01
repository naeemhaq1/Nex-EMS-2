import { db } from "../db";
import { users, employeeRecords } from "../../shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

async function createTestUser() {
  try {
    console.log("Creating test user...");
    
    // First, find an active employee to link to
    const [sampleEmployee] = await db
      .select({
        id: employeeRecords.id,
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
      process.exit(1);
    }
    
    console.log(`Found employee: ${sampleEmployee.firstName} ${sampleEmployee.lastName} (${sampleEmployee.employeeCode})`);
    
    // Hash the password
    const hashedPassword = await bcrypt.hash("test", 10);
    
    // Create test user
    const [testUser] = await db.insert(users).values({
      username: "test",
      password: hashedPassword,
      role: "staff",
      isActive: true,
      employeeId: sampleEmployee.id
    }).returning();
    
    console.log("✅ Test user created successfully:");
    console.log(`   Username: test`);
    console.log(`   Password: test`);
    console.log(`   Role: staff`);
    console.log(`   ID: ${testUser.id}`);
    console.log(`   Linked to Employee: ${sampleEmployee.firstName} ${sampleEmployee.lastName} (${sampleEmployee.employeeCode})`);
    
  } catch (error) {
    console.error("❌ Error creating test user:", error);
    process.exit(1);
  }
}

createTestUser().then(() => {
  console.log("✅ Test user creation completed");
  process.exit(0);
});