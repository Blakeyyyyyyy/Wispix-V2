const { RequirementsAgent } = require('./dist/src/agents/RequirementsAgent');

async function testRequirementsAgent() {
  console.log('🔍 Testing Requirements Agent directly...\n');
  
  const agent = new RequirementsAgent('test-user-123', 'test-session');
  
  // Test 1: Initial message
  console.log('📝 Test 1: Initial message');
  const result1 = await agent.processMessage('create a record in Airtable every hour');
  console.log('✅ Result 1:', JSON.stringify(result1, null, 2));
  
  // Test 2: Follow-up with context
  console.log('\n📝 Test 2: Follow-up message');
  const result2 = await agent.processMessage('Tasks table', [
    { role: 'user', content: 'create a record in Airtable every hour' },
    { role: 'assistant', content: result1.response }
  ]);
  console.log('✅ Result 2:', JSON.stringify(result2, null, 2));
  
  // Test 3: Final message
  console.log('\n📝 Test 3: Final message');
  const result3 = await agent.processMessage('Name: "Automated Task", Status: "Active"', [
    { role: 'user', content: 'create a record in Airtable every hour' },
    { role: 'assistant', content: result1.response },
    { role: 'user', content: 'Tasks table' },
    { role: 'assistant', content: result2.response }
  ]);
  console.log('✅ Result 3:', JSON.stringify(result3, null, 2));
}

testRequirementsAgent().catch(console.error); 