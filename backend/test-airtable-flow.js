const axios = require('axios');

// Test Airtable automation conversation flow
async function testAirtableFlow() {
  console.log('🎯 Testing Airtable Automation Flow:');
  console.log('=====================================\n');
  
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItMTc1MzQwMzAxNjY0MSIsImVtYWlsIjoidGVzdEB3aXNwaXguY29tIiwic3Vic2NyaXB0aW9uVGllciI6InBybyIsImlhdCI6MTc1MzQwMzU3NiwiZXhwIjoxNzU0MDA4Mzc2fQ.YLuNg-i9jh2q8jaU-sy-_LP2FTbkOtd26AM2_MqMaPI';
  
  try {
    // Step 1: Initial message
    console.log('📝 Step 1: User says "create a record in Airtable every hour"');
    const response1 = await axios.post('http://localhost:3001/api/automation/create', {
      message: 'create a record in Airtable every hour'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Response 1:', JSON.stringify(response1.data, null, 2));
    
    // Step 2: Provide table name
    console.log('\n📝 Step 2: User provides table name');
    const response2 = await axios.post('http://localhost:3001/api/automation/create', {
      message: 'Tasks table',
      conversationId: response1.data.sessionId
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Response 2:', JSON.stringify(response2.data, null, 2));
    
    // Step 3: Provide record data
    console.log('\n📝 Step 3: User provides record data');
    const response3 = await axios.post('http://localhost:3001/api/automation/create', {
      message: 'Name: "Automated Task", Status: "Active"',
      conversationId: response1.data.sessionId
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

testAirtableFlow(); 