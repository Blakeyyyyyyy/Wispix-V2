#!/usr/bin/env node
require('dotenv').config();
const axios = require('axios');

async function test3AgentFlow() {
  console.log('🧪 Testing 3-Agent Flow...\n');
  
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItMTc1MzQwMzAxNjY0MSIsImVtYWlsIjoidGVzdEB3aXNwaXguY29tIiwic3Vic2NyaXB0aW9uVGllciI6InBybyIsImlhdCI6MTc1MzQwMzU3NiwiZXhwIjoxNzU0MDA4Mzc2fQ.YLuNg-i9jh2q8jaU-sy-_LP2FTbkOtd26AM2_MqMaPI';
  
  const messages = [
    "Create an automation that sends an email at 8am",
    "Just send a 'hey blake' email every morning at 8am",
    "blake@growth-ai.io",
    "blake@growthacquire.io"
  ];
  
  let sessionId = null;
  
  for (let i = 0; i < messages.length; i++) {
    console.log(`\n📝 Step ${i + 1}: "${messages[i]}"`);
    
    try {
      const response = await axios.post('http://localhost:3001/api/automation/create', {
        message: messages[i],
        sessionId: sessionId
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ Response:', JSON.stringify(response.data, null, 2));
      
      if (response.data.sessionId) {
        sessionId = response.data.sessionId;
      }
      
      if (response.data.complete) {
        console.log('\n🎉 Automation creation completed!');
        console.log('Final response:', response.data.response);
        break;
      }
      
    } catch (error) {
      console.error('❌ Error:', error.response?.data || error.message);
    }
  }
}

test3AgentFlow(); 