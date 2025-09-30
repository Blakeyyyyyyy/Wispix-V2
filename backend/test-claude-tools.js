const { anthropic } = require('./dist/src/config/anthropic');

async function testClaudeTools() {
  console.log('🔍 Testing Claude tool calling...\n');
  
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 1000,
      tools: [
        {
          name: "save_requirements",
          description: "Save final requirements when gathering is complete",
          input_schema: {
            type: "object",
            properties: {
              requirements: {
                type: "object",
                properties: {
                  goal: { type: "string" },
                  trigger: { type: "string" },
                  dataSources: { type: "array", items: { type: "string" } },
                  actions: { type: "array", items: { type: "string" } },
                  userInputs: { type: "array", items: { type: "string" } }
                }
              }
            }
          }
        }
      ],
      messages: [
        {
          role: "user",
          content: "I want to create a record in Airtable Tasks table every hour with Name: Automated Task and Status: Active. I have all the information needed, so please save the requirements."
        }
      ]
    });

    console.log('✅ Claude response:', JSON.stringify(response, null, 2));
    
    const message = response.content[0];
    console.log('🔍 Message type:', message.type);
    console.log('🔍 Message:', message);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testClaudeTools(); 