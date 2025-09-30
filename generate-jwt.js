require('dotenv').config();
const jwt = require('jsonwebtoken');

// Get the JWT secret from environment
const secret = process.env.JWT_SECRET;

if (!secret) {
  console.error('❌ JWT_SECRET not found in .env file');
  console.log('Please make sure you have JWT_SECRET in your .env file');
  process.exit(1);
}

// Create a test user payload
const payload = {
  userId: 'test-user-' + Date.now(),
  email: 'test@wispix.com',
  subscriptionTier: 'pro'
};

try {
  // Generate the JWT
  const token = jwt.sign(payload, secret, { expiresIn: '24h' });
  
  console.log('✅ JWT Token generated successfully!');
  console.log('\n📋 Copy this token for testing:');
  console.log('='.repeat(50));
  console.log(token);
  console.log('='.repeat(50));
  
  console.log('\n🔍 Token details:');
  console.log('- User ID:', payload.userId);
  console.log('- Email:', payload.email);
  console.log('- Subscription:', payload.subscriptionTier);
  console.log('- Expires in: 24 hours');
  
  console.log('\n🚀 Test command:');
  console.log(`curl -X POST http://localhost:3000/api/claude/generate \\`);
  console.log(`  -H "Authorization: Bearer ${token}" \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"prompt":"Send me daily weather emails at 9 am"}' | jq`);
  
} catch (error) {
  console.error('❌ Failed to generate JWT:', error.message);
  process.exit(1);
}
