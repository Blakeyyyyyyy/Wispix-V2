#!/usr/bin/env node
require('dotenv').config();
const jwt = require('jsonwebtoken');

console.log('🔍 Checking Frontend Token...\n');

// Generate the same token that should be in the frontend
const payload = {
  userId: 'test-user-1753403016641',
  email: 'test@wispix.com',
  subscriptionTier: 'pro'
};

const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

console.log('✅ Expected Frontend Token:');
console.log('='.repeat(50));
console.log(token);
console.log('='.repeat(50));

console.log('\n📋 Token Details:');
console.log('- User ID:', payload.userId);
console.log('- Email:', payload.email);
console.log('- Subscription:', payload.subscriptionTier);

console.log('\n🧪 Test this token:');
console.log(`curl -X POST http://localhost:3001/api/automation/create \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -H "Authorization: Bearer ${token}" \\`);
console.log(`  -d '{"message": "test"}' | jq`); 