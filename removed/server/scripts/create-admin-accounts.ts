import { db } from '../db';
import { users, employeeRecords } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

interface AdminUser {
  firstName: string;
  lastName: string;
  employeeCode: string;
  username: string;
  password: string;
  role: string;
}

const ADMIN_USERS: AdminUser[] = [
  {
    firstName: 'Faisal',
    lastName: 'Muzzamil',
    employeeCode: '10089893',
    username: 'faisal.muzzamil',
    password: 'FaisalAdmin123#',
    role: 'admin'
  },
  {
    firstName: 'Asim',
    lastName: 'Hafeez',
    employeeCode: '10089982',
    username: 'asim.hafeez',
    password: 'AsimAdmin123#',
    role: 'admin'
  }
];

async function createAdminAccounts() {
  console.log('🚀 Creating admin accounts for Faisal Muzzamil and Asim Hafeez...');
  
  let created = 0;
  let updated = 0;
  
  for (const adminUser of ADMIN_USERS) {
    try {
      // Verify employee exists
      const employee = await db
        .select()
        .from(employeeRecords)
        .where(eq(employeeRecords.employeeCode, adminUser.employeeCode))
        .limit(1);
      
      if (employee.length === 0) {
        console.log(`❌ Employee ${adminUser.employeeCode} not found`);
        continue;
      }
      
      console.log(`\n👤 Processing: ${adminUser.firstName} ${adminUser.lastName} (${adminUser.employeeCode})`);
      
      // Check if user already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.username, adminUser.username))
        .limit(1);
      
      // Hash password
      const hashedPassword = await bcrypt.hash(adminUser.password, 10);
      
      if (existingUser.length > 0) {
        // Update existing user
        await db
          .update(users)
          .set({
            password: hashedPassword,
            role: adminUser.role,
            employeeCode: adminUser.employeeCode,
            isActive: true
          })
          .where(eq(users.id, existingUser[0].id));
        
        console.log(`✅ Updated existing user: ${adminUser.username}`);
        updated++;
      } else {
        // Create new user
        await db.insert(users).values({
          username: adminUser.username,
          password: hashedPassword,
          role: adminUser.role,
          employeeCode: adminUser.employeeCode,
          isActive: true
        });
        
        console.log(`✅ Created new user: ${adminUser.username}`);
        created++;
      }
      
      console.log(`   Username: ${adminUser.username}`);
      console.log(`   Password: ${adminUser.password}`);
      console.log(`   Role: ${adminUser.role}`);
      console.log(`   Employee: ${employee[0].firstName} ${employee[0].lastName}`);
      console.log(`   Designation: ${employee[0].designation}`);
      console.log(`   Department: ${employee[0].department}`);
      
    } catch (error) {
      console.error(`❌ Failed to create/update user ${adminUser.username}:`, error);
    }
  }
  
  console.log('\n=== ADMIN ACCOUNT CREATION RESULTS ===');
  console.log(`New accounts created: ${created}`);
  console.log(`Existing accounts updated: ${updated}`);
  console.log(`Total admin accounts processed: ${created + updated}`);
  
  // Display all admin users
  console.log('\n=== ALL ADMIN USERS ===');
  const allAdmins = await db
    .select({
      id: users.id,
      username: users.username,
      role: users.role,
      employeeCode: users.employeeCode,
      isActive: users.isActive
    })
    .from(users)
    .where(eq(users.role, 'admin'));
  
  console.table(allAdmins);
  
  console.log('\n✅ Admin account creation completed successfully!');
  console.log('\n🔐 ADMIN CREDENTIALS:');
  console.log('1. Username: admin / Password: Nexlinx123#');
  console.log('2. Username: faisal.muzzamil / Password: FaisalAdmin123#');
  console.log('3. Username: asim.hafeez / Password: AsimAdmin123#');
  console.log('\nAll admin accounts have full system access.');
}

// Run the script
createAdminAccounts().catch(console.error);