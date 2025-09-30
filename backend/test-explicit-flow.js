const axios = require('axios');

// Test with more explicit information
async function testExplicitFlow() {
  console.log('🎯 Testing Explicit Flow (should trigger save_requirements):');
  console.log('========================================================\n');
  
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItMTc1MzQwMzAxNjY0MSIsImVtYWlsIjoidGVzdEB3aXNwaXguY29tIiwic3Vic2NyaXB0aW9uVGllciI6InBybyIsImlhdCI6MTc1MzQwMzU3NiwiZXhwIjoxNzU0MDA4Mzc2fQ.YLuNg-i9jh2q8jaU-sy-_LP2FTbkOtd26AM2_MqMaPI';
  
  try {
    // Step 1: Very explicit initial message
    console.log('📝 Step 1: User says "create a record in Airtable Tasks table every hour with Name: Automated Task and Status: Active"');
    const response1 = await axios.post('http://localhost:3001/api/automation/create', {
      message: 'create a record in Airtable Tasks table every hour with Name: Automated Task and Status: Active'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Response 1:', JSON.stringify(response1.data, null, 2));
    
    // Step 2: Confirm the automation
    console.log('\n📝 Step 2: User confirms');
    const response2 = await axios.post('http://localhost:3001/api/automation/create', {
      message: 'yes, that is correct',
      conversationId: response1.data.sessionId
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Response 2:', JSON.stringify(response2.data, null, 2));
    
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

testExplicitFlow(); 