
import bcrypt from 'bcrypt';
import { storage } from './storage.js';

async function createTestUser() {
  try {
    console.log('🔧 Creating multi-role test user...');
    
    // Check if test user already exists
    const existingUser = storage.getUserByUsername('test');
    if (existingUser) {
      console.log('✅ Test user already exists:', {
        id: existingUser.id,
        username: existingUser.username,
        role: existingUser.role,
        isActive: existingUser.isActive
      });
      
      // Test password verification
      const passwordTest = await bcrypt.compare('test', existingUser.password);
      console.log('✅ Password verification test:', passwordTest ? 'PASSED' : 'FAILED');
      
      if (!passwordTest) {
        console.log('🔄 Updating password for existing user...');
        const hashedPassword = await bcrypt.hash('test', 10);
        await storage.updateUser(existingUser.id, { password: hashedPassword });
        console.log('✅ Password updated successfully');
      }
      
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
      lastPasswordChange: new Date()
    };
    
    // Create user
    const createdUser = await storage.createUser(testUser);
    console.log('✅ Multi-role test user created successfully:', {
      id: createdUser.id,
      username: createdUser.username,
      role: createdUser.role,
      employeeId: createdUser.employeeId
    });
    
    // Verify user creation
    const verifyUser = storage.getUserByUsername('test');
    if (verifyUser) {
      console.log('✅ User verification successful');
      
      // Test password verification
      const passwordTest = await bcrypt.compare('test', verifyUser.password);
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
