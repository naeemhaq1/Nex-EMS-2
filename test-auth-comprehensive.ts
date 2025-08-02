
import { storage } from './storage.js';
import bcrypt from 'bcrypt';
import fetch from 'node-fetch';

async function testAuthComprehensive() {
  console.log('🧪 === COMPREHENSIVE AUTH TEST ===\n');
  
  try {
    // Test 1: Database connection and storage
    console.log('1️⃣ Testing database and storage...');
    
    try {
      const testUser = await storage.getUserByUsername('test');
      if (testUser) {
        console.log('✅ Storage working - test user found');
        console.log('   User details:', {
          id: testUser.id,
          username: testUser.username,
          role: testUser.role,
          hasPassword: !!testUser.password,
          passwordLength: testUser.password?.length || 0,
          isActive: testUser.isActive
        });
      } else {
        console.log('❌ Storage issue - test user not found');
        return;
      }
    } catch (storageError) {
      console.log('❌ Storage error:', storageError.message);
      return;
    }
    
    // Test 2: Bcrypt functionality
    console.log('\n2️⃣ Testing bcrypt functionality...');
    
    const testPassword = 'test';
    const testHash = await bcrypt.hash(testPassword, 10);
    const testVerify = await bcrypt.compare(testPassword, testHash);
    console.log('✅ Bcrypt test result:', testVerify ? 'WORKING' : 'BROKEN');
    
    // Test 3: Password verification with actual user
    console.log('\n3️⃣ Testing password verification with actual user...');
    
    const user = await storage.getUserByUsername('test');
    if (user && user.password) {
      const passwords = ['test', 'Test', 'TEST', 'password', 'admin'];
      for (const pwd of passwords) {
        try {
          const isValid = await bcrypt.compare(pwd, user.password);
          console.log(`   Password "${pwd}": ${isValid ? '✅ VALID' : '❌ INVALID'}`);
          if (isValid) break;
        } catch (err) {
          console.log(`   Password "${pwd}": ❌ ERROR - ${err.message}`);
        }
      }
    }
    
    // Test 4: HTTP endpoint test
    console.log('\n4️⃣ Testing HTTP login endpoint...');
    
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username: 'test', 
          password: 'test' 
        }),
      });

      console.log('   Response status:', response.status);
      const responseText = await response.text();
      console.log('   Response body:', responseText);
      
      if (responseText) {
        try {
          const data = JSON.parse(responseText);
          console.log('   Parsed response:', data);
        } catch (e) {
          console.log('   Could not parse as JSON');
        }
      }
    } catch (fetchError) {
      console.log('   HTTP test failed:', fetchError.message);
    }
    
    // Test 5: Create a fresh test user if needed
    console.log('\n5️⃣ Checking if we need to create a fresh test user...');
    
    const currentUser = await storage.getUserByUsername('test');
    if (!currentUser) {
      console.log('   Creating new test user...');
      // This would need the actual user creation logic
    } else {
      console.log('   Test user exists');
    }
    
  } catch (error) {
    console.error('💥 Comprehensive test failed:', error);
  }
  
  console.log('\n🧪 === TEST COMPLETE ===');
}

testAuthComprehensive().then(() => {
  console.log('Exiting...');
  process.exit(0);
}).catch(console.error);
