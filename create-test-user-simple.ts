import { db } from './db.js';
import { users } from './shared/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function createTestUser() {
  try {
    console.log('🚀 Creating test user...');

    // Check if test user already exists
    const [existingUser] = await db.select().from(users).where(eq(users.username, 'test'));

    if (existingUser) {
      console.log('✅ Test user already exists');
      console.log('📋 Credentials: username=test, password=test');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('test', 10);

    // Create test user
    const [newUser] = await db.insert(users).values({
      username: 'test',
      password: hashedPassword,
      role: 'employee',
      isActive: true,
      firstName: 'Test',
      lastName: 'User',
      email: 'test@test.com'
    }).returning();

    console.log('✅ Test user created successfully!');
    console.log('📋 Login Credentials:');
    console.log('   Username: test');
    console.log('   Password: test');
    console.log('   Role: employee');
    console.log('   User ID:', newUser.id);

  } catch (error) {
    console.error('❌ Error creating test user:', error);

    if (error.code === '23505') {
      console.log('✅ Test user already exists (duplicate key)');
      console.log('📋 Credentials: username=test, password=test');
    }
  }
}

// Run the function
createTestUser().then(() => {
  console.log('🏁 Test user creation completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
import { db } from './db';
import { users, rolePermissions } from './shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function createTestUser() {
  try {
    console.log('Creating test user...');
    
    // Check if test user already exists
    const existingUser = await db.select().from(users).where(eq(users.username, 'test')).limit(1);
    
    if (existingUser.length > 0) {
      console.log('Test user already exists');
      // Update password to 'test'
      const hashedPassword = await bcrypt.hash('test', 12);
      await db.update(users)
        .set({ 
          password: hashedPassword,
          isActive: true,
          isTemporaryPassword: false
        })
        .where(eq(users.username, 'test'));
      console.log('Updated test user password');
      return;
    }

    // Create superadmin role if it doesn't exist
    const existingRole = await db.select().from(rolePermissions).where(eq(rolePermissions.roleName, 'superadmin')).limit(1);
    
    if (existingRole.length === 0) {
      await db.insert(rolePermissions).values({
        roleName: 'superadmin',
        displayName: 'Super Administrator',
        description: 'Complete system access',
        canCreateUsers: true,
        canDeleteUsers: true,
        canDeleteData: true,
        canAccessFinancialData: true,
        canManageSystem: true,
        canManageTeams: true,
        canChangeDesignations: true,
        accessLevel: 100,
        createdRoles: ['admin', 'manager', 'supervisor', 'staff']
      });
      console.log('Created superadmin role');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('test', 12);

    // Create test user
    const result = await db.insert(users).values({
      username: 'test',
      password: hashedPassword,
      role: 'superadmin',
      isActive: true,
      isTemporaryPassword: false,
      managedDepartments: [],
      lastPasswordChange: new Date()
    }).returning({ id: users.id });

    console.log('Test user created successfully with ID:', result[0].id);
    console.log('Username: test');
    console.log('Password: test');
    console.log('Role: superadmin');
    
  } catch (error) {
    console.error('Error creating test user:', error);
  }
}

createTestUser().then(() => {
  console.log('Test user creation completed');
  process.exit(0);
}).catch((error) => {
  console.error('Failed to create test user:', error);
  process.exit(1);
});
