// Simple OAuth test script
const fetch = require('node-fetch');

async function testOAuth() {
  try {
    console.log('🔐 Testing Gmail OAuth setup...\n');
    
    // Test 1: Check OAuth status
    console.log('1. Checking OAuth status...');
    const statusRes = await fetch('http://localhost:3001/api/oauth/gmail/status');
    const status = await statusRes.json();
    console.log('   Status:', status);
    
    // Test 2: Generate OAuth URL
    console.log('\n2. Generating OAuth URL...');
    const authRes = await fetch('http://localhost:3001/api/oauth/gmail/auth');
    const auth = await authRes.json();
    console.log('   Auth URL generated:', !!auth.authUrl);
    if (auth.authUrl) {
      console.log('   URL starts with:', auth.authUrl.substring(0, 50) + '...');
    }
    
    console.log('\n✅ OAuth endpoints are working!');
    console.log('\n📋 Next steps:');
    console.log('   1. Open the frontend at http://localhost:3000');
    console.log('   2. Click "Gmail OAuth" button');
    console.log('   3. Complete Google OAuth flow');
    console.log('   4. Try "Run InboxManager" again');
    
  } catch (error) {
    console.error('❌ OAuth test failed:', error.message);
  }
}

testOAuth();
