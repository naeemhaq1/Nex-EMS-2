import { db } from "../db";
import { users, employeeRecords } from "../../shared/schema";
import { eq, and, isNull } from "drizzle-orm";
import bcrypt from "bcrypt";

async function generateUniqueUsername(firstName: string, lastName: string): Promise<string> {
  // Clean the names (remove extra spaces, special characters)
  const cleanFirst = firstName.trim().replace(/[^a-zA-Z]/g, '');
  const cleanLast = lastName.trim().replace(/[^a-zA-Z]/g, '');
  
  // Get first character of last name
  const lastInitial = cleanLast.charAt(0).toUpperCase();
  
  // Try different random numbers until we find a unique username
  for (let attempt = 0; attempt < 10; attempt++) {
    const randomNum = Math.floor(Math.random() * 9) + 1;
    const username = `${cleanFirst}_${lastInitial}${randomNum}`;
    
    // Check if username already exists
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    
    if (existingUser.length === 0) {
      return username;
    }
  }
  
  // If we couldn't find a unique username after 10 attempts, use timestamp
  const timestamp = Date.now().toString().slice(-3);
  return `${cleanFirst}_${lastInitial}${timestamp}`;
}

async function createEmployeeUsernames() {
  try {
    console.log("Finding employees without user accounts...");
    
    // Get all active employees
    const allEmployees = await db
      .select({
        id: employeeRecords.id,
        employeeCode: employeeRecords.employeeCode,
        firstName: employeeRecords.firstName,
        lastName: employeeRecords.lastName,
        department: employeeRecords.department,
        designation: employeeRecords.designation
      })
      .from(employeeRecords)
      .where(eq(employeeRecords.isActive, true))
      .limit(50); // Process in batches of 50
    
    // Get existing users (employeeId is text field storing employee codes)
    const existingUsers = await db
      .select({
        employeeId: users.employeeId
      })
      .from(users);
    
    // Filter employees who don't have user accounts
    const existingEmployeeCodes = new Set(existingUsers.map(u => u.employeeId).filter(Boolean));
    const employeesWithoutAccounts = allEmployees.filter(emp => 
      !existingEmployeeCodes.has(emp.employeeCode)
    );
    
    console.log(`Found ${employeesWithoutAccounts.length} employees without accounts`);
    
    if (employeesWithoutAccounts.length === 0) {
      console.log("No employees found without accounts");
      return;
    }
    
    // Default password for all new users
    const defaultPassword = "nexlinx123";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    const usersToCreate = [];
    
    for (const employee of employeesWithoutAccounts) {
      if (!employee.firstName || !employee.lastName) {
        console.log(`Skipping employee ${employee.employeeCode} - missing name data`);
        continue;
      }
      
      const username = await generateUniqueUsername(employee.firstName, employee.lastName);
      
      usersToCreate.push({
        username,
        password: hashedPassword,
        role: "staff" as const,
        isActive: true,
        employeeId: employee.employeeCode
      });
      
      console.log(`Will create: ${username} for ${employee.firstName} ${employee.lastName} (${employee.employeeCode})`);
    }
    
    if (usersToCreate.length === 0) {
      console.log("No valid users to create");
      return;
    }
    
    // Create users in batch
    const createdUsers = await db.insert(users).values(usersToCreate).returning();
    
    console.log(`\n✅ Successfully created ${createdUsers.length} user accounts:`);
    console.log(`   Default password: ${defaultPassword}`);
    console.log(`   Role: staff`);
    console.log(`   Status: active`);
    
    // Display created usernames
    createdUsers.forEach((user, index) => {
      const employee = employeesWithoutAccounts[index];
      console.log(`   ${user.username} → ${employee.firstName} ${employee.lastName} (${employee.employeeCode})`);
    });
    
  } catch (error) {
    console.error("❌ Error creating employee usernames:", error);
    process.exit(1);
  }
}

createEmployeeUsernames().then(() => {
  console.log("\n✅ Employee username creation completed");
  process.exit(0);
});