const axios = require('axios');

// Simulate the conversation flow
async function testConversationFlow() {
  console.log('🔍 Testing the conversation flow that should have happened...\n');
  
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItMTc1MzQwMzAxNjY0MSIsImVtYWlsIjoidGVzdEB3aXNwaXguY29tIiwic3Vic2NyaXB0aW9uVGllciI6InBybyIsImlhdCI6MTc1MzQwMzU3NiwiZXhwIjoxNzU0MDA4Mzc2fQ.YLuNg-i9jh2q8jaU-sy-_LP2FTbkOtd26AM2_MqMaPI';
  
  try {
    // Step 1: Initial message
    console.log('📝 Step 1: User sends initial message');
    const response1 = await axios.post('http://localhost:3001/api/automation/create', {
      message: 'send an email every 5 minutes to blake@growth-ai.io'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Response 1:', JSON.stringify(response1.data, null, 2));
    
    // Step 2: Follow-up messages
    console.log('\n📝 Step 2: User provides email content');
    const response2 = await axios.post('http://localhost:3001/api/automation/create', {
      message: 'hi',
      conversationId: response1.data.conversationId
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Response 2:', JSON.stringify(response2.data, null, 2));
    
    // Step 3: Final confirmation
    console.log('\n📝 Step 3: User confirms');
    const response3 = await axios.post('http://localhost:3001/api/automation/create', {
      message: 'yep',
      conversationId: response1.data.conversationId
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Response 3:', JSON.stringify(response3.data, null, 2));
    
    // Check what automations exist now
    console.log('\n📋 Checking automations after conversation...');
    const automationsResponse = await axios.get('http://localhost:3001/api/automations', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Current automations:', JSON.stringify(automationsResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testConversationFlow(); 