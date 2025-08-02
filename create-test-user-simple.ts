import { storage } from './storage.js';
import bcrypt from 'bcrypt';

async function createTestUser() {
  try {
    console.log('Creating test user...');

    // Hash password
    const hashedPassword = await bcrypt.hash('test', 10);

    // Create test user
    const testUser = {
      username: 'test',
      password: hashedPassword,
      role: 'employee',
      employeeId: 'TEST001',
      isActive: true,
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com'
    };

    // Check if user already exists
    const existingUser = await storage.getUserByUsername('test');
    if (existingUser) {
      console.log('Test user already exists, updating password...');
      await storage.updateUser(existingUser.id, { password: hashedPassword });
      console.log('✅ Test user password updated successfully');
    } else {
      const newUser = await storage.createUser(testUser);
      console.log('✅ Test user created successfully:', newUser.id);
    }

    console.log('Test credentials: username=test, password=test');

  } catch (error) {
    console.error('❌ Error creating test user:', error);
  }
}

createTestUser();