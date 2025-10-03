#!/usr/bin/env node
require('dotenv').config();
const jwt = require('jsonwebtoken');

console.log('🔍 Testing JWT Token Generation and Verification...\n');

const secret = process.env.JWT_SECRET;
console.log('JWT_SECRET:', secret ? `${secret.substring(0, 20)}...` : 'NOT FOUND');

if (!secret) {
  console.error('❌ JWT_SECRET not found in environment!');
  process.exit(1);
}

const payload = {
  userId: `test-user-${Date.now()}`,
  email: 'test@wispix.com',
  subscriptionTier: 'pro'
};

const token = jwt.sign(payload, secret, { expiresIn: '7d' });
console.log('✅ Generated token:', token.substring(0, 50) + '...');

try {
  const decoded = jwt.verify(token, secret);
  console.log('✅ Token verification successful!');
  console.log('Decoded payload:', decoded);
} catch (error) {
  console.error('❌ Token verification failed:', error.message);
}

// Test the current frontend token
const currentToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItMTc1MzQwMzAxNjY0MSIsImVtYWlsIjoidGVzdEB3aXNwaXguY29tIiwic3Vic2NyaXB0aW9uVGllciI6InBybyIsImlhdCI6MTc1MzQwMzAxNiwiZXhwIjoxNzU0MDA3ODE2fQ.kaKuTlq0y8RmEErpbdY9K_A7Y1v5dA5Jt6qVHUyGi1M';

console.log('\n🔍 Testing current frontend token...');
try {
  const decodedCurrent = jwt.verify(currentToken, secret);
  console.log('✅ Current token verification successful!');
  console.log('Decoded payload:', decodedCurrent);
} catch (error) {
  console.error('❌ Current token verification failed:', error.message);
} 