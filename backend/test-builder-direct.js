const { AutomationOrchestrator } = require('./dist/services/AutomationOrchestrator');

async function testBuilderDirect() {
  try {
    console.log('🧪 Testing Builder Direct...');
    
    const orchestrator = new AutomationOrchestrator();
    
    // Create a message that should trigger the builder
    const message = "Create a new row every 5 minutes in my airtable with \"blake is a legend\"";
    const userId = "test-user-1753403016641";
    const sessionId = "test-session-" + Date.now();
    
    console.log('📤 Sending message to orchestrator...');
    console.log('Message:', message);
    console.log('UserId:', userId);
    console.log('SessionId:', sessionId);
    
    // This should trigger the full three-agent flow
    const result = await orchestrator.processMessage(message, userId, sessionId);
    
    console.log('📥 Result received:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testBuilderDirect(); 