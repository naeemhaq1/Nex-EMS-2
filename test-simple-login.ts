
const bcrypt = require('bcrypt');
const { storage } = require('./storage.js');

async function testSimpleLogin() {
  try {
    console.log('🧪 Testing simple login...');
    
    // 1. Check if test user exists
    const user = await storage.getUserByUsername('test');
    
    if (!user) {
      console.log('❌ Test user not found. Creating one...');
      
      // Create test user
      const hashedPassword = await bcrypt.hash('test', 10);
      const newUser = {
        username: 'test',
        password: hashedPassword,
        role: 'admin',
        isActive: true,
        employeeId: 'TEST001'
      };
      
      // This would need proper user creation logic
      console.log('Would create user:', newUser);
      return;
    }
    
    console.log('✅ Test user found:', {
      id: user.id,
      username: user.username,
      role: user.role,
      isActive: user.isActive
    });
    
    // 2. Test password verification
    const isValid = await bcrypt.compare('test', user.password);
    console.log('🔐 Password verification:', isValid ? '✅ SUCCESS' : '❌ FAILED');
    
    if (!isValid) {
      console.log('❌ Password verification failed - recreating user');
      
      // Update user password
      const newHashedPassword = await bcrypt.hash('test', 10);
      console.log('New hash created, would update user...');
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

testSimpleLogin().then(() => {
  console.log('Test completed');
  process.exit(0);
});
