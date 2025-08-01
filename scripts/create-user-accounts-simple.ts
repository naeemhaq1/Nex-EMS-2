import { db } from "../db";
import { users, employeeRecords } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcrypt";

/**
 * Simple User Account Creation Script
 * Creates 6-digit password accounts for all employees without user accounts
 */

// Generate 6-digit random password
function generatePassword(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate unique username from employee name
function generateUsername(firstName: string, lastName: string): string {
  const cleanFirst = firstName.replace(/[^a-zA-Z]/g, '').toLowerCase();
  const cleanLast = lastName.replace(/[^a-zA-Z]/g, '').toLowerCase();
  
  const firstPart = cleanFirst.charAt(0).toUpperCase() + cleanFirst.slice(1);
  const lastInitial = cleanLast.charAt(0).toUpperCase();
  const randomNum = Math.floor(Math.random() * 9) + 1;
  
  return `${firstPart}_${lastInitial}${randomNum}`;
}

// Check if username already exists
async function isUsernameExists(username: string): Promise<boolean> {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  
  return existing.length > 0;
}

// Generate unique username with retry logic
async function generateUniqueUsername(firstName: string, lastName: string): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const username = generateUsername(firstName, lastName);
    
    if (!(await isUsernameExists(username))) {
      return username;
    }
    
    attempts++;
  }
  
  // Fallback with timestamp if all attempts fail
  const timestamp = Date.now().toString().slice(-4);
  return `${firstName}_${lastName.charAt(0)}${timestamp}`;
}

async function createUserAccounts() {
  console.log("👥 CREATING USER ACCOUNTS FOR ALL EMPLOYEES");
  console.log("=" .repeat(50));

  try {
    // Get all employees without user accounts
    const employeesWithoutAccounts = await db
      .select({
        employeeCode: employeeRecords.employeeCode,
        firstName: employeeRecords.firstName,
        lastName: employeeRecords.lastName,
        middleName: employeeRecords.middleName
      })
      .from(employeeRecords)
      .where(
        sql`NOT EXISTS (
          SELECT 1 FROM users u 
          WHERE u.employee_id = ${employeeRecords.employeeCode}
        )`
      )
      .orderBy(employeeRecords.firstName);

    console.log(`📊 Found ${employeesWithoutAccounts.length} employees without user accounts`);

    const results = [];
    let created = 0;
    let failed = 0;

    for (const employee of employeesWithoutAccounts) {
      try {
        // Generate unique username
        const username = await generateUniqueUsername(
          employee.firstName || 'User',
          employee.lastName || 'Employee'
        );

        // Generate 6-digit password
        const password = generatePassword();

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user account
        await db.insert(users).values({
          username: username,
          password: hashedPassword,
          role: 'staff',
          employeeId: employee.employeeCode,
          isActive: true,
          createdAt: new Date()
        });

        created++;
        results.push({
          employeeCode: employee.employeeCode,
          name: `${employee.firstName} ${employee.lastName}`,
          username: username,
          password: password
        });

        console.log(`✅ Created: ${username} (${employee.employeeCode}) - Password: ${password}`);

      } catch (error) {
        failed++;
        console.log(`❌ Failed: ${employee.employeeCode} - ${error.message}`);
      }
    }

    console.log("\n📊 SUMMARY");
    console.log("=" .repeat(30));
    console.log(`Total employees: ${employeesWithoutAccounts.length}`);
    console.log(`✅ Successfully created: ${created}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success rate: ${((created / employeesWithoutAccounts.length) * 100).toFixed(1)}%`);

    // Generate credentials file
    let credentialsContent = "# Employee Login Credentials\n";
    credentialsContent += `# Generated: ${new Date().toISOString()}\n\n`;
    credentialsContent += "| Employee Code | Name | Username | Password |\n";
    credentialsContent += "|---------------|------|----------|----------|\n";

    results.forEach(result => {
      credentialsContent += `| ${result.employeeCode} | ${result.name} | ${result.username} | ${result.password} |\n`;
    });

    credentialsContent += "\n# IMPORTANT:\n";
    credentialsContent += "# - All passwords are 6 digits\n";
    credentialsContent += "# - Users MUST change password on first login\n";
    credentialsContent += "# - Store this file securely\n";

    // Write credentials file
    const fs = await import('fs');
    const filename = `employee-credentials-${new Date().toISOString().split('T')[0]}.md`;
    fs.writeFileSync(filename, credentialsContent);

    console.log(`\n📄 Credentials saved to: ${filename}`);
    console.log("🔒 REMEMBER: Users must change password on first login");
    console.log("🎉 USER ACCOUNT CREATION COMPLETED");

  } catch (error) {
    console.error("❌ User account creation failed:", error);
    throw error;
  }
}

// Run the script
createUserAccounts().then(() => {
  console.log("\n✅ Script completed successfully");
  process.exit(0);
}).catch((error) => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});