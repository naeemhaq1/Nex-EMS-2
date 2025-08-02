
import bcrypt from 'bcrypt';
import { storage } from './storage.js';

async function createTestUser() {
  try {
    console.log('🔧 Creating multi-role test user...');
    
    // Check if test user already exists
    const existingUser = await storage.getUserByUsername('test');
    if (existingUser) {
      console.log('✅ Test user already exists:', {
        id: existingUser.id,
        username: existingUser.username,
        role: existingUser.role,
        isActive: existingUser.isActive
      });
      return;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash('test', 10);
    console.log('🔒 Password hashed successfully');
    
    // Create test user with admin role for testing multi-role features
    const testUser = {
      username: 'test',
      password: hashedPassword,
      role: 'admin', // Admin role for testing multi-role features
      isActive: true,
      employeeId: 'TEST001',
      firstName: 'Test',
      lastName: 'User',
      realName: 'Test User',
      isTemporaryPassword: false,
      createdAt: new Date(),
      lastPasswordChange: new Date()
    };
    
    // Create user
    const userId = await storage.createUser(testUser);
    console.log('✅ Multi-role test user created successfully:', {
      id: userId,
      username: testUser.username,
      role: testUser.role,
      employeeId: testUser.employeeId
    });
    
    // Verify user creation
    const createdUser = await storage.getUserByUsername('test');
    if (createdUser) {
      console.log('✅ User verification successful:', {
        id: createdUser.id,
        username: createdUser.username,
        role: createdUser.role,
        hasPassword: !!createdUser.password,
        passwordLength: createdUser.password?.length
      });
      
      // Test password verification
      const passwordTest = await bcrypt.compare('test', createdUser.password);
      console.log('✅ Password verification test:', passwordTest ? 'PASSED' : 'FAILED');
    }
    
  } catch (error) {
    console.error('❌ Error creating test user:', error);
  }
}

createTestUser().then(() => {
  console.log('🎉 Multi-role test user setup completed');
  process.exit(0);
}).catch(console.error);
