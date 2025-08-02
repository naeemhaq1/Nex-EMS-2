
import bcrypt from 'bcrypt';
import { storage } from './storage.js';

async function createTestUser() {
  try {
    console.log('🔧 Creating test user...');
    
    // Check if test user already exists
    const existingUser = storage.getUserByUsername('test');
    
    if (existingUser) {
      console.log('✅ Test user already exists');
      console.log('Username: test');
      console.log('Password: test');
      console.log('Role:', existingUser.role);
      console.log('ID:', existingUser.id);
      console.log('Active:', existingUser.isActive);
      return;
    }

    console.log('🔐 Hashing password...');
    // Hash the password
    const hashedPassword = await bcrypt.hash('test', 10);
    console.log('✅ Password hashed successfully');
    
    // Create test user
    const testUser = storage.createUser({
      username: 'test',
      password: hashedPassword,
      role: 'admin',
      employeeId: 'TEST001',
      name: 'Test User',
      email: 'test@example.com',
      isActive: true
    });

    console.log('✅ Test user created successfully');
    console.log('Username: test');
    console.log('Password: test');
    console.log('Role:', testUser.role);
    console.log('ID:', testUser.id);
    console.log('Employee ID:', testUser.employeeId);

    // Test password verification
    console.log('🧪 Testing password verification...');
    const isValid = await bcrypt.compare('test', testUser.password);
    console.log('Password verification test:', isValid ? '✅ PASS' : '❌ FAIL');

  } catch (error) {
    console.error('❌ Error creating test user:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

createTestUser().then(() => {
  console.log('Test user setup completed');
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
