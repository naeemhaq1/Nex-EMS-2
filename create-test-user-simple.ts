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