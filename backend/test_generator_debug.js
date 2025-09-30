const { MultiStepGenerator } = require('./src/wispix/generators/MultiStepGenerator');

// Test plan with the correct structure
const testPlan = {
  trigger: {
    type: "cron",
    schedule: "0 17 * * *"
  },
  steps: [
    {
      id: "step_1",
      provider: "airtable",
      intent: "fetch",
      endpoint: "/v0/appUNIsu8KgvOlmi0/tblI5BWUKJNuTeINH",
      method: "GET",
      inputFrom: null,
      outputAs: "airtableRecords",
      config: {
        params: {
          filterByFormula: "IS_SAME(CREATED_TIME(), TODAY())"
        }
      }
    },
    {
      id: "step_2",
      provider: "openai",
      intent: "summarize",
      endpoint: "/v1/chat/completions",
      method: "POST",
      inputFrom: "step_1",
      outputAs: "summary",
      config: {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Summarize the provided records concisely"
          },
          {
            role: "user",
            content: "{{airtableRecords}}"
          }
        ]
      }
    },
    {
      id: "step_3",
      provider: "notion",
      intent: "create",
      endpoint: "/v1/pages",
      method: "POST",
      inputFrom: "step_2",
      outputAs: "notionPage",
      config: {
        parent: {
          type: "database_id",
          database_id: "YOUR_DATABASE_ID"
        },
        properties: {
          title: "Daily Summary - {{date}}",
          content: "{{summary}}"
        }
      }
    }
  ],
  auth: [
    { provider: "airtable", method: "personal_access_token" },
    { provider: "openai", method: "api_key" },
    { provider: "notion", method: "integration_token" }
  ]
};

console.log('🧪 Testing MultiStepGenerator with plan:');
console.log(JSON.stringify(testPlan, null, 2));

try {
  const generatedCode = MultiStepGenerator.generateCode(testPlan);
  console.log('\n✅ Code generation successful!');
  
  // Save the full code to a file for inspection
  const fs = require('fs');
  fs.writeFileSync('debug_generated_code.js', generatedCode);
  console.log('\n📋 Full generated code saved to debug_generated_code.js');
  
  // Check for specific patterns
  console.log('\n🔍 Checking for key patterns:');
  console.log('- Contains "GET" method:', generatedCode.includes('GET'));
  console.log('- Contains "fetch" intent:', generatedCode.includes('fetch'));
  console.log('- Contains "axios" calls:', generatedCode.includes('axios'));
  console.log('- Contains "run" function:', generatedCode.includes('async function run'));
  console.log('- Contains "method: \'GET\'"', generatedCode.includes("method: 'GET'"));
  console.log('- Contains "filterByFormula"', generatedCode.includes('filterByFormula'));
  
  // Show the Airtable step specifically
  const airtableStepMatch = generatedCode.match(/async function step_1[^}]+}/s);
  if (airtableStepMatch) {
    console.log('\n📋 Airtable step (step_1):');
    console.log(airtableStepMatch[0]);
  }
  
} catch (error) {
  console.error('❌ Code generation failed:', error);
} 