// Test script to run the automation
const automation = require('./automations/automation_1754269086262.js');

async function testAutomation() {
  try {
    console.log('🧪 Testing automation...');
    const result = await automation.run();
    console.log('✅ Test completed successfully:', result);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('📋 Full error:', error);
  }
}

testAutomation(); 