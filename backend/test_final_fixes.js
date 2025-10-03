// Test script to run the final automation with all fixes applied
const automation = require('./automations/automation_1754365887040.js');

async function testAutomation() {
  try {
    console.log('🧪 Testing automation with all fixes applied...');
    const result = await automation.run();
    console.log('✅ Test completed successfully:', result);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('📋 Full error:', error);
  }
}

testAutomation(); 