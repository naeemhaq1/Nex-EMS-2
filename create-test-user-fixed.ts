
import bcrypt from 'bcrypt';
import { storage } from './storage.js';

async function createTestUser() {
  try {
    console.log('🔧 Creating test user...');
    
    // Check if test user already exists
    const existingUser = await storage.getUserByUsername('test');
    
    if (existingUser) {
      console.log('✅ Test user already exists');
      console.log('Username: test');
      console.log('Password: test');
      console.log('Role:', existingUser.role);
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash('test', 10);
    
    // Create test user
    const testUser = await storage.createUser({
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

  } catch (error) {
    console.error('❌ Error creating test user:', error);
  }
}

createTestUser().then(() => {
  console.log('Test user setup completed');
  process.exit(0);
}).catch(console.error);
