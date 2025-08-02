
import fetch from 'node-fetch';

async function testLoginEndpoint() {
  try {
    console.log('🧪 Testing login endpoint...');
    
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

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Raw response:', responseText);
    
    try {
      const data = JSON.parse(responseText);
      console.log('Parsed response:', data);
    } catch (e) {
      console.log('Could not parse as JSON');
    }

  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

testLoginEndpoint();
