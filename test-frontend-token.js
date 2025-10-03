#!/usr/bin/env node

const axios = require('axios');

// Test the exact same API call the frontend would make
async function testFrontendAPI() {
  console.log('🧪 Testing Frontend API Call...\n');
  
  // The token that should be in localStorage
  const expectedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItMTc1MzM0MjA5NzU3NSIsImVtYWlsIjoidGVzdEB3aXNwaXguY29tIiwic3Vic2NyaXB0aW9uVGllciI6InBybyIsImlhdCI6MTc1MzM0MjA5NywiZXhwIjoxNzUzOTQ2ODk3fQ.dtlM0f8EGcMJnq44hSHuQVe1THuMkUKJ2ZrLdGRiEVA';
  
  try {
    const response = await axios.post('http://localhost:3001/api/automation/create', {
      message: 'Create an automation that sends an email to my business partner every morning at 8am saying hello'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${expectedToken}`
      }
    });
    
    console.log('✅ API Call Successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ API Call Failed!');
    console.log('Error:', error.response?.data || error.message);
    console.log('Status:', error.response?.status);
  }
}

testFrontendAPI(); 