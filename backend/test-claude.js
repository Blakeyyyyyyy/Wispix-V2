const ClaudeAgentWrapper = require('./src/agents/claude-wrapper');

async function test() {
  console.log('Testing Claude wrapper...');
  
  const mockWriter = {
    writeStream: (data) => console.log('Stream:', data)
  };
  
  const wrapper = new ClaudeAgentWrapper(mockWriter.writeStream);
  
  // Test API search
  console.log('Testing API search...');
  const docs = await wrapper.searchAPIDocs('stripe', 'payment intents');
  console.log('API docs found:', !!docs);
  
  // Test connection test
  console.log('Testing Stripe connection...');
  const connected = await wrapper.testAPIConnection('stripe');
  console.log('Stripe connected:', connected);
  
  console.log('All tests complete!');
}

test().catch(console.error);
