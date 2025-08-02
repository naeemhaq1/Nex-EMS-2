
import fetch from 'node-fetch';

async function testAPIDirect() {
  try {
    console.log('🌐 Testing API endpoint directly...');
    
    const url = 'http://localhost:5000/api/auth/login';
    const body = JSON.stringify({ 
      username: 'test', 
      password: 'test' 
    });
    
    console.log('🌐 Making request to:', url);
    console.log('🌐 Request body:', body);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body
    });
    
    console.log('🌐 Response status:', response.status);
    console.log('🌐 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('🌐 Response text:', responseText);
    
    if (responseText) {
      try {
        const data = JSON.parse(responseText);
        console.log('🌐 Parsed data:', JSON.stringify(data, null, 2));
      } catch (e) {
        console.log('🌐 Could not parse as JSON');
      }
    }
    
  } catch (error) {
    console.error('💥 Direct API test failed:', error);
  }
}

testAPIDirect();
