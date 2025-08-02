
import { db } from "./db";
import { users, employeeRecords } from "./shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

async function createTestUser() {
  console.log("Creating test user...");
  
  try {
    // First, check if test user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, 'test'))
      .limit(1);
    
    if (existingUser.length > 0) {
      console.log("✅ Test user already exists");
      console.log("Username: test");
      console.log("Password: test");
      return;
    }

    // Check if test employee exists
    let testEmployee = await db
      .select()
      .from(employeeRecords)
      .where(eq(employeeRecords.employeeCode, 'TEST001'))
      .limit(1);

    // Create test employee if it doesn't exist
    if (testEmployee.length === 0) {
      console.log("Creating test employee...");
      await db.insert(employeeRecords).values({
        employeeCode: 'TEST001',
        firstName: 'Test',
        lastName: 'User',
        department: 'IT',
        designation: 'Test Employee',
        isActive: true,
        systemAccount: false
      });
      
      testEmployee = await db
        .select()
        .from(employeeRecords)
        .where(eq(employeeRecords.employeeCode, 'TEST001'))
        .limit(1);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('test', 10);

    // Create test user
    const newUser = await db.insert(users).values({
      username: 'test',
      password: hashedPassword,
      role: 'employee',
      accountType: 'employee',
      employeeId: 'TEST001',
      isActive: true,
      userState: 'Active',
      isTemporaryPassword: false
    }).returning();

    console.log("✅ Test user created successfully!");
    console.log("Username: test");
    console.log("Password: test");
    console.log("Employee Code: TEST001");
    console.log("User ID:", newUser[0].id);
    
  } catch (error) {
    console.error("❌ Error creating test user:", error);
  }
}

createTestUser().catch(console.error);
