
import bcrypt from 'bcrypt';
import { storage } from './storage.js';

async function createWorkingTestUser() {
  try {
    console.log('🔧 Creating working test user...');
    
    // Delete existing test user first
    try {
      const existingUser = await storage.getUserByUsername('test');
      if (existingUser) {
        console.log('Deleting existing test user...');
        // We'd need delete functionality here
      }
    } catch (e) {
      console.log('No existing user to delete');
    }
    
    // Create fresh password hash
    const password = 'test';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    console.log('✅ Password hash created');
    console.log('Original password:', password);
    console.log('Hash length:', hashedPassword.length);
    console.log('Hash starts with:', hashedPassword.substring(0, 10));
    
    // Test the hash immediately
    const testVerification = await bcrypt.compare(password, hashedPassword);
    console.log('✅ Immediate verification test:', testVerification ? 'PASS' : 'FAIL');
    
    // Try to create user (this would depend on your storage implementation)
    console.log('Would create user with:');
    console.log({
      username: 'test',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      employeeId: 'TEST001'
    });
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

createWorkingTestUser();
