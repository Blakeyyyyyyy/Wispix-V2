const { DatabaseService } = require('./src/services/database.ts');

async function testAutomationsEndpoint() {
  try {
    console.log('🔍 Testing automations endpoint...');
    
    const automations = await DatabaseService.getAutomationsByUser('test-user-123');
    console.log('✅ Automations fetched successfully');
    console.log('📋 Found automations:', automations.length);
    console.log('📋 First automation:', automations[0] ? automations[0].name : 'None');
    
  } catch (error) {
    console.error('❌ Error fetching automations:', error.message);
    console.error('📋 Full error:', error);
  }
}

testAutomationsEndpoint(); 