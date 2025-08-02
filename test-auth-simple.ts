
import { storage } from './storage.js';
import bcrypt from 'bcrypt';

async function testAuth() {
  try {
    console.log('🔍 Testing authentication for test user...');
    
    // Test user lookup
    console.log('1. Looking up user "test"...');
    const user = await storage.getUserByUsername('test');
    
    if (!user) {
      console.log('❌ User "test" not found in database');
      return;
    }
    
    console.log('✅ User found:', {
      id: user.id,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
      passwordLength: user.password?.length || 0
    });
    
    // Test password verification
    console.log('2. Testing password verification...');
    const testPasswords = ['test', 'Test', 'TEST'];
    
    for (const password of testPasswords) {
      console.log(`   Testing password: "${password}"`);
      try {
        const isValid = await bcrypt.compare(password, user.password);
        console.log(`   Result: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
        
        if (isValid) {
          console.log('🎉 Password verification successful!');
          break;
        }
      } catch (error) {
        console.log(`   Error: ${error.message}`);
      }
    }
    
    // Test creating a new hash for comparison
    console.log('3. Testing bcrypt hash creation...');
    const newHash = await bcrypt.hash('test', 10);
    const verifyNewHash = await bcrypt.compare('test', newHash);
    console.log(`   New hash verification: ${verifyNewHash ? '✅ WORKS' : '❌ BROKEN'}`);
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

testAuth().then(() => {
  console.log('Test completed');
  process.exit(0);
}).catch(console.error);
