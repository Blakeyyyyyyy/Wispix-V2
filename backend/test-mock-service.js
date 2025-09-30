const { mockAutomationService } = require('./src/services/mockAutomationService');

async function testMockService() {
  console.log('🔍 Testing Mock Automation Service...\n');
  
  try {
    // Check automations for the current user
    const userId = 'test-user-1753403016641';
    const automations = await mockAutomationService.getAutomationsByUser(userId);
    
    console.log(`📋 Found ${automations.length} automations for user ${userId}:`);
    automations.forEach(auto => {
      console.log(`  - ${auto.id}: ${auto.name} (${auto.status})`);
    });
    
    // Check all automations in the service
    console.log('\n🔍 All automations in mock service:');
    // This would require adding a method to get all automations, but for now let's just check the user's automations
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testMockService(); 