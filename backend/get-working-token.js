#!/usr/bin/env node

require('dotenv').config();
const jwt = require('jsonwebtoken');

// Generate a working JWT token
function generateWorkingToken() {
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

// Generate token and provide test commands
const token = generateWorkingToken();

console.log('🔑 WORKING JWT TOKEN FOR TESTING');
console.log('='.repeat(50));
console.log(token);
console.log('='.repeat(50));

console.log('\n🧪 TEST COMMANDS:');
console.log('\n1. Test 3-Agent API:');
console.log(`curl -X POST http://localhost:3001/api/automation/create \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -H "Authorization: Bearer ${token}" \\`);
console.log(`  -d '{"message": "create an automation that send a hey team email every morning at 8am"}' | jq`);

console.log('\n2. Test Frontend (open browser to http://localhost:3000 and use this token in localStorage):');
console.log(`localStorage.setItem('token', '${token}');`);

console.log('\n3. Test Health Check:');
console.log(`curl -X GET http://localhost:3001/health | jq`);

console.log('\n✅ Token is valid for 7 days');
console.log('✅ Use this token for all API testing'); 