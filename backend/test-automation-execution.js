const axios = require('axios');

const API_BASE = 'http://localhost:3000';

async function testAutomationExecution() {
  try {
    console.log('🧪 Testing Automation Execution...\n');

    // 1. Create a test automation
    console.log('1. Creating test automation...');
    const automationData = {
      name: 'Test HTTP Request',
      description: 'Test automation that makes an HTTP request',
      workflow_json: {
        id: 'test-automation-001',
        name: 'Test HTTP Request',
        description: 'Test automation that makes an HTTP request',
        trigger: {
          type: 'manual',
          config: {}
        },
        steps: [
          {
            id: 'http-step-1',
            name: 'Make HTTP Request',
            type: 'http_request',
            config: {
              method: 'GET',
              url: 'https://jsonplaceholder.typicode.com/posts/1',
              headers: {
                'Content-Type': 'application/json'
              },
              timeout: 5000
            },
            output_mapping: 'response'
          },
          {
            id: 'delay-step-1',
            name: 'Wait 2 seconds',
            type: 'delay',
            config: {
              duration: 2,
              unit: 'seconds'
            }
          }
        ],
        variables: {}
      }
    };

    const createResponse = await axios.post(`${API_BASE}/api/automations`, automationData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // You'll need a real token
      }
    });

    console.log('✅ Automation created:', createResponse.data.data.id);

    // 2. Execute the automation
    console.log('\n2. Executing automation...');
    const automationId = createResponse.data.data.id;
    
    const executeResponse = await axios.post(`${API_BASE}/api/automations/${automationId}/execute`, {}, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      }
    });

    console.log('✅ Execution started:', executeResponse.data.data.executionId);

    // 3. Check execution status
    console.log('\n3. Checking execution status...');
    const executionId = executeResponse.data.data.executionId;
    
    // Wait a bit for execution to complete
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const statusResponse = await axios.get(`${API_BASE}/api/executions/${executionId}`, {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });

    console.log('✅ Execution status:', statusResponse.data.status);
    console.log('📋 Logs:', statusResponse.data.logs);

    console.log('\n🎉 Automation execution test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testAutomationExecution(); 