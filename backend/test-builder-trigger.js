const axios = require('axios');

async function testBuilderTrigger() {
  try {
    console.log('🧪 Testing Builder Trigger...');
    
    // Create a message that should trigger the builder
    const message = {
      message: "Create a new row every 5 minutes in my airtable with \"blake is a legend\"",
      userId: "test-user-1753403016641",
      sessionId: "test-session-" + Date.now()
    };
    
    console.log('📤 Sending message to trigger builder...');
    console.log('Message:', JSON.stringify(message, null, 2));
    
    // This should trigger the full three-agent flow
    const response = await axios.post('http://localhost:3001/api/requirements/chat', message);
    
    console.log('📥 Response received:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.requirementsComplete) {
      console.log('\n✅ Requirements completed! Builder should be triggered.');
      console.log('Check backend logs for slot dumps and builder errors.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testBuilderTrigger(); 