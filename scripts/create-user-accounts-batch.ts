import { db } from "../db";
import { users, employeeRecords } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcrypt";

interface UserCreationResult {
  employeeCode: string;
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  success: boolean;
  error?: string;
}

/**
 * Batch User Account Creation Service
 * Creates user accounts for all employees without existing accounts
 */
export class BatchUserAccountCreator {
  private saltRounds = 10;

  /**
   * Generate 6-digit random password
   */
  private generatePassword(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generate unique username from employee name
   */
  private generateUsername(firstName: string, lastName: string): string {
    const cleanFirst = firstName.replace(/[^a-zA-Z]/g, '').toLowerCase();
    const cleanLast = lastName.replace(/[^a-zA-Z]/g, '').toLowerCase();
    
    const firstPart = cleanFirst.charAt(0).toUpperCase() + cleanFirst.slice(1);
    const lastInitial = cleanLast.charAt(0).toUpperCase();
    const randomNum = Math.floor(Math.random() * 9) + 1;
    
    return `${firstPart}_${lastInitial}${randomNum}`;
  }

  /**
   * Check if username already exists
   */
  private async isUsernameExists(username: string): Promise<boolean> {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    
    return existing.length > 0;
  }

  /**
   * Generate unique username with retry logic
   */
  private async generateUniqueUsername(firstName: string, lastName: string): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      const username = this.generateUsername(firstName, lastName);
      
      if (!(await this.isUsernameExists(username))) {
        return username;
      }
      
      attempts++;
    }
    
    // Fallback with timestamp if all attempts fail
    const timestamp = Date.now().toString().slice(-4);
    return `${firstName}_${lastName.charAt(0)}${timestamp}`;
  }

  /**
   * Create user account for employee
   */
  private async createUserAccount(employee: any): Promise<UserCreationResult> {
    const result: UserCreationResult = {
      employeeCode: employee.employeeCode,
      firstName: employee.firstName,
      lastName: employee.lastName,
      username: '',
      password: '',
      success: false
    };

    try {
      // Generate unique username
      result.username = await this.generateUniqueUsername(
        employee.firstName || 'User',
        employee.lastName || 'Employee'
      );

      // Generate 6-digit password
      result.password = this.generatePassword();

      // Hash password
      const hashedPassword = await bcrypt.hash(result.password, this.saltRounds);

      // Create user account
      await db.insert(users).values({
        username: result.username,
        password: hashedPassword,
        role: 'staff',
        employeeId: employee.employeeCode,
        isActive: true,
        createdAt: new Date()
      });

      result.success = true;
      return result;

    } catch (error) {
      result.error = error.message;
      return result;
    }
  }

  /**
   * Create user accounts for all employees without accounts
   */
  async createAllUserAccounts(): Promise<{
    total: number;
    created: number;
    failed: number;
    results: UserCreationResult[];
  }> {
    console.log("👥 BATCH USER ACCOUNT CREATION - STARTING");
    console.log("=" .repeat(60));

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

      const results: UserCreationResult[] = [];
      let created = 0;
      let failed = 0;

      // Process employees in batches of 50
      const batchSize = 50;
      for (let i = 0; i < employeesWithoutAccounts.length; i += batchSize) {
        const batch = employeesWithoutAccounts.slice(i, i + batchSize);
        
        console.log(`\n🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(employeesWithoutAccounts.length / batchSize)}`);
        console.log(`   Employees: ${batch.length}`);

        for (const employee of batch) {
          const result = await this.createUserAccount(employee);
          results.push(result);

          if (result.success) {
            created++;
            console.log(`✅ Created: ${result.username} (${result.employeeCode}) - Password: ${result.password}`);
          } else {
            failed++;
            console.log(`❌ Failed: ${result.employeeCode} - ${result.error}`);
          }
        }

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log("\n📊 BATCH USER CREATION SUMMARY");
      console.log("=" .repeat(40));
      console.log(`Total employees processed: ${employeesWithoutAccounts.length}`);
      console.log(`✅ Successfully created: ${created}`);
      console.log(`❌ Failed: ${failed}`);
      console.log(`📈 Success rate: ${((created / employeesWithoutAccounts.length) * 100).toFixed(1)}%`);

      return {
        total: employeesWithoutAccounts.length,
        created,
        failed,
        results
      };

    } catch (error) {
      console.error("❌ Batch user creation failed:", error);
      throw error;
    }
  }

  /**
   * Generate password export for administrators
   */
  async generatePasswordExport(results: UserCreationResult[]): Promise<string> {
    const successful = results.filter(r => r.success);
    
    let export_content = "# Employee Login Credentials\n";
    export_content += "# Generated: " + new Date().toISOString() + "\n\n";
    export_content += "| Employee Code | Name | Username | Password |\n";
    export_content += "|---------------|------|----------|----------|\n";

    successful.forEach(result => {
      export_content += `| ${result.employeeCode} | ${result.firstName} ${result.lastName} | ${result.username} | ${result.password} |\n`;
    });

    export_content += "\n# IMPORTANT NOTES:\n";
    export_content += "# - All passwords are 6 digits\n";
    export_content += "# - Users MUST change password on first login\n";
    export_content += "# - Store this file securely and delete after distribution\n";

    return export_content;
  }
}

// Run the batch creation process
async function main() {
  const creator = new BatchUserAccountCreator();
  
  try {
    const result = await creator.createAllUserAccounts();
    
    // Generate password export
    const exportContent = await creator.generatePasswordExport(result.results);
    
    // Write to file
    const fs = await import('fs');
    const filename = `employee-login-credentials-${new Date().toISOString().split('T')[0]}.md`;
    fs.writeFileSync(filename, exportContent);
    
    console.log(`\n📄 Password export saved to: ${filename}`);
    console.log("🔒 REMEMBER: Users must change password on first login");
    console.log("🎉 USER ACCOUNT CREATION COMPLETED SUCCESSFULLY");
    
  } catch (error) {
    console.error("❌ User account creation failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
}

export { BatchUserAccountCreator };