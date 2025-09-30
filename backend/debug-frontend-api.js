#!/usr/bin/env node
const axios = require('axios');

async function debugFrontendAPI() {
  console.log('🔍 Debugging Frontend API Call...\n');
  
  // Use the same token as the frontend
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItMTc1MzQwMzAxNjY0MSIsImVtYWlsIjoidGVzdEB3aXNwaXguY29tIiwic3Vic2NyaXB0aW9uVGllciI6InBybyIsImlhdCI6MTc1MzQwMzAxNiwiZXhwIjoxNzU0MDA3ODE2fQ.kaKuTlq0y8RmEErpbdY9K_A7Y1v5dA5Jt6qVHUyGi1M';
  
  console.log('📋 Token being used:', token.substring(0, 50) + '...');
  
  try {
    console.log('🚀 Making API call to /api/automation/create...');
    
    const response = await axios.post('http://localhost:3001/api/automation/create', {
      message: 'Create an automation that sends an email to my business partner every morning at 8am saying hello'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ API Call Successful!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ API Call Failed!');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data || error.message);
    console.log('Headers:', error.response?.headers);
  }
}

debugFrontendAPI(); 