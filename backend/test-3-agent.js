const fetch = require('node-fetch');

async function test3AgentSystem() {
  console.log('🚀 Testing 3-Agent Automation System\n');
  
  // Generate JWT token
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { userId: 'test-user', email: 'test@wispix.com', subscriptionTier: 'pro' },
    process.env.JWT_SECRET || 'your-super-secret-jwt-key-here',
    { expiresIn: '24h' }
  );
  
  const baseUrl = 'http://localhost:3001';
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
  
  // Test 1: Simple automation request
  console.log('📝 Test 1: Simple automation request');
  console.log('Request: "Send daily emails at 8am with tasks from Airtable to my team via Gmail"\n');
  
  try {
    const response1 = await fetch(`${baseUrl}/api/automation/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: 'Send daily emails at 8am with tasks from Airtable to my team via Gmail'
      })
    });
    
    const result1 = await response1.json();
    console.log('✅ Response:', JSON.stringify(result1, null, 2));
    console.log('\n' + '='.repeat(80) + '\n');
    
    // Test 2: More detailed request
    console.log('📝 Test 2: More detailed automation request');
    console.log('Request: "Create an automation that monitors my Gmail inbox for emails from my boss, then sends a summary to Slack every day at 9am"\n');
    
    const response2 = await fetch(`${baseUrl}/api/automation/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: 'Create an automation that monitors my Gmail inbox for emails from my boss, then sends a summary to Slack every day at 9am'
      })
    });
    
    const result2 = await response2.json();
    console.log('✅ Response:', JSON.stringify(result2, null, 2));
    console.log('\n' + '='.repeat(80) + '\n');
    
    // Test 3: Health check
    console.log('📝 Test 3: Health check');
    const healthResponse = await fetch(`${baseUrl}/health`);
    const healthResult = await healthResponse.json();
    console.log('✅ Health:', JSON.stringify(healthResult, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test3AgentSystem(); 