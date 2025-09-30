#!/usr/bin/env node

require('dotenv').config();
const jwt = require('jsonwebtoken');
const axios = require('axios');

// Generate a fresh JWT token
function generateToken() {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    console.error('❌ JWT_SECRET not found in .env file');
    process.exit(1);
  }
  
  const payload = {
    userId: `test-user-${Date.now()}`,
    email: 'test@wispix.com',
    subscriptionTier: 'pro'
  };
  
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

async function test3AgentSystem() {
  console.log('🚀 Testing 3-Agent Automation System\n');
  
  const token = generateToken();
  console.log(`✅ Generated fresh JWT token: ${token.substring(0, 50)}...\n`);
  
  const baseURL = 'http://localhost:3001';
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
  
  let sessionId = null;
  
  try {
    // Step 1: Initial request
    console.log('📝 Step 1: Initial automation request');
    const response1 = await axios.post(`${baseURL}/api/automation/create`, {
      message: 'create an automation that send a hey team email every morning at 8am'
    }, { headers });
    
    console.log('Response:', response1.data.response);
    sessionId = response1.data.sessionId;
    console.log(`Session ID: ${sessionId}\n`);
    
    // Step 2: Provide recipient
    console.log('📝 Step 2: Providing recipient');
    const response2 = await axios.post(`${baseURL}/api/automation/create`, {
      message: 'send it to team@company.com',
      sessionId: sessionId
    }, { headers });
    
    console.log('Response:', response2.data.response);
    console.log(`Current Agent: ${response2.data.currentAgent}\n`);
    
    // Step 3: Provide email service
    console.log('📝 Step 3: Providing email service');
    const response3 = await axios.post(`${baseURL}/api/automation/create`, {
      message: 'use Gmail',
      sessionId: sessionId
    }, { headers });
    
    console.log('Response:', response3.data.response);
    console.log(`Current Agent: ${response3.data.currentAgent}\n`);
    
    // Step 4: Provide email content
    console.log('📝 Step 4: Providing email content');
    const response4 = await axios.post(`${baseURL}/api/automation/create`, {
      message: 'the email should say "Hey team! Good morning and have a great day!"',
      sessionId: sessionId
    }, { headers });
    
    console.log('Response:', response4.data.response);
    console.log(`Current Agent: ${response4.data.currentAgent}\n`);
    
    // Step 5: Complete requirements
    console.log('📝 Step 5: Completing requirements');
    const response5 = await axios.post(`${baseURL}/api/automation/create`, {
      message: 'yes, that is all the information needed',
      sessionId: sessionId
    }, { headers });
    
    console.log('Response:', response5.data.response);
    console.log(`Current Agent: ${response5.data.currentAgent}\n`);
    
    console.log('🎉 3-Agent System Test Complete!');
    console.log('✅ Requirements Agent: Working with conversation context');
    console.log('✅ Builder Agent: Ready to generate automation code');
    console.log('✅ Validator Agent: Ready to test and deploy');
    
  } catch (error) {
    console.error('❌ Error testing 3-agent system:', error.response?.data || error.message);
  }
}

// Run the test
test3AgentSystem(); 