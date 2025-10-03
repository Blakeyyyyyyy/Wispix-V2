const http = require('http');

function checkHealth() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3001/health', res => {
      if (res.statusCode === 200) resolve();
      else reject(new Error('/health failed'));
    }).on('error', reject);
  });
}

function checkClaude() {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/claude/generate',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const response = JSON.parse(data);
          if (response.output && typeof response.output === 'string' && response.output.length > 0) {
            resolve();
          } else {
            reject(new Error('Invalid Claude response format'));
          }
        } else {
          reject(new Error('/api/claude/generate failed: ' + data));
        }
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify({ prompt: 'hello' }));
    req.end();
  });
}

function checkClaudeAutomation() {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/claude/generate-automation',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const response = JSON.parse(data);
          // Validate automation JSON schema
          if (response.automation && 
              response.automation.id && 
              response.automation.name && 
              response.automation.steps && 
              Array.isArray(response.automation.steps) &&
              response.automation.steps.length > 0) {
            resolve();
          } else {
            reject(new Error('Invalid automation JSON schema'));
          }
        } else {
          reject(new Error('/api/claude/generate-automation failed: ' + data));
        }
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify({ prompt: 'ping' }));
    req.end();
  });
}

function checkClaudeValidation() {
  return new Promise((resolve, reject) => {
    const testAutomation = {
      id: 'test-automation',
      name: 'Test Automation',
      description: 'A test automation',
      trigger: { type: 'manual', config: {} },
      steps: [
        {
          id: 'step-1',
          name: 'Test HTTP Request',
          type: 'http_request',
          config: {
            method: 'GET',
            url: 'https://jsonplaceholder.typicode.com/posts/1',
            timeout: 5000
          }
        },
        {
          id: 'step-2',
          name: 'Test Delay',
          type: 'delay',
          config: {
            duration: 2000,
            unit: 'ms'
          }
        }
      ]
    };

    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/claude/validate',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const response = JSON.parse(data);
          if (response.ok === true) {
            resolve();
          } else {
            reject(new Error('Automation validation failed'));
          }
        } else {
          reject(new Error('/api/claude/validate failed: ' + data));
        }
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify({ automation: testAutomation }));
    req.end();
  });
}

function checkAutomationExecute() {
  return new Promise((resolve, reject) => {
    const testAutomation = {
      id: 'test-automation',
      name: 'Test Automation',
      description: 'A test automation for smoke testing',
      workflowJson: {
        steps: [
          {
            id: 'step-1',
            name: 'Test HTTP Request',
            type: 'http_request',
            config: {
              method: 'GET',
              url: 'https://httpbin.org/get',
              headers: {}
            }
          }
        ]
      }
    };

    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/automations/test-automation/execute',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const response = JSON.parse(data);
          if (response.data && response.data.executionId) {
            resolve();
          } else {
            reject(new Error('Invalid execution response'));
          }
        } else {
          reject(new Error('/api/automations/execute failed: ' + data));
        }
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify({ automation: testAutomation }));
    req.end();
  });
}

function checkAutomationTest() {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/automations/test-automation/test',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const response = JSON.parse(data);
          if (response.success === true && 
              response.data && 
              response.data.result && 
              response.data.result.success === true) {
            resolve();
          } else {
            reject(new Error('Invalid test response'));
          }
        } else {
          reject(new Error('/api/automations/test failed: ' + data));
        }
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify({
      steps: [
        {
          id: 'step-1',
          name: 'Test Delay',
          type: 'delay',
          config: { duration: 1000, unit: 'ms' }
        }
      ]
    }));
    req.end();
  });
}

function checkExecutionStatus() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3001/api/executions/mock-execution', res => {
      if (res.statusCode === 200) {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const response = JSON.parse(data);
          if (response.status && ['pending', 'running', 'completed', 'failed'].includes(response.status)) {
            resolve();
          } else {
            reject(new Error('Invalid execution status response'));
          }
        });
      } else {
        reject(new Error('/api/executions/:id failed'));
      }
    }).on('error', reject);
  });
}

function checkExecutionLogs() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3001/api/executions/mock-execution/logs', res => {
      if (res.statusCode === 200) {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const response = JSON.parse(data);
          if (response.logs && Array.isArray(response.logs)) {
            resolve();
          } else {
            reject(new Error('Invalid execution logs response'));
          }
        });
      } else {
        reject(new Error('/api/executions/:id/logs failed'));
      }
    }).on('error', reject);
  });
}

(async () => {
  try {
    console.log('🧪 Running comprehensive smoke tests...');
    
    await checkHealth();
    console.log('✅ Health check passed');
    
    await checkClaude();
    console.log('✅ Claude text generation passed');
    
    await checkClaudeAutomation();
    console.log('✅ Claude automation generation passed');
    
    await checkClaudeValidation();
    console.log('✅ Claude automation validation passed');
    
    await checkAutomationExecute();
    console.log('✅ Automation execution passed');
    
    await checkAutomationTest();
    console.log('✅ Automation testing passed');
    
    await checkExecutionStatus();
    console.log('✅ Execution status passed');
    
    await checkExecutionLogs();
    console.log('✅ Execution logs passed');
    
    console.log('🎉 All smoke tests passed!');
    process.exit(0);
  } catch (e) {
    console.error('❌ Smoke test failed:', e.message);
    process.exit(1);
  }
})(); 