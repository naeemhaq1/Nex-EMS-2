
import { storage } from './storage.js';
import bcrypt from 'bcrypt';

async function debugTestUser() {
  try {
    console.log('🔍 Debugging test user authentication...');
    
    // Check if storage is working
    console.log('1. Testing storage connection...');
    
    // Try to get user by username
    console.log('2. Looking up user "test"...');
    const user = await storage.getUserByUsername('test');
    
    if (!user) {
      console.log('❌ User "test" not found');
      console.log('   Let me check what users exist...');
      
      // Check if we can list users or find similar usernames
      try {
        // This might not exist, but let's try
        const allUsers = await storage.getAllUsers?.() || [];
        console.log('   Available users:', allUsers.map(u => u.username));
      } catch (e) {
        console.log('   Could not list all users');
      }
      
      return;
    }
    
    console.log('✅ User found!');
    console.log('   User ID:', user.id);
    console.log('   Username:', user.username);
    console.log('   Role:', user.role);
    console.log('   Active:', user.isActive);
    console.log('   Has password:', !!user.password);
    console.log('   Password length:', user.password?.length || 0);
    console.log('   Password starts with:', user.password?.substring(0, 10) || 'N/A');
    
    // Test password verification
    console.log('3. Testing password verification...');
    
    if (!user.password) {
      console.log('❌ User has no password set!');
      return;
    }
    
    try {
      const isValidTest = await bcrypt.compare('test', user.password);
      console.log('   "test" password check:', isValidTest ? '✅ VALID' : '❌ INVALID');
      
      // Also test other possible passwords
      const testPasswords = ['Test', 'TEST', 'test123', 'password'];
      for (const pwd of testPasswords) {
        const isValid = await bcrypt.compare(pwd, user.password);
        if (isValid) {
          console.log(`   Found working password: "${pwd}" ✅`);
        }
      }
      
    } catch (error) {
      console.log('❌ Error during password verification:', error.message);
    }
    
    // Test creating a new hash
    console.log('4. Testing bcrypt functionality...');
    const testHash = await bcrypt.hash('test', 10);
    const testVerify = await bcrypt.compare('test', testHash);
    console.log('   Bcrypt test:', testVerify ? '✅ WORKING' : '❌ BROKEN');
    
  } catch (error) {
    console.error('💥 Debug failed:', error);
  }
}

debugTestUser().then(() => {
  console.log('Debug completed');
  process.exit(0);
});
