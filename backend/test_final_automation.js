// Test script to run the final automation with embedded credentials
const automation = require('./automations/automation_1754353461905.js');

async function testAutomation() {
  try {
    console.log('🧪 Testing final automation with embedded credentials...');
    const result = await automation.run();
    console.log('✅ Test completed successfully:', result);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('📋 Full error:', error);
  }
}

testAutomation(); 