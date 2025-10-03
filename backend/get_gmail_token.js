// Simple script to get Gmail refresh token
const { google } = require('googleapis');
require('dotenv').config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  'http://localhost:3001/api/oauth/gmail/callback'  // Match Google Cloud Console
);

// Generate the authorization URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.labels'
  ],
  prompt: 'consent' // Force consent to get refresh token
});

console.log('🔐 Gmail OAuth Setup');
console.log('====================');
console.log('');
console.log('1. Open this URL in your browser:');
console.log(authUrl);
console.log('');
console.log('2. Sign in with: blakeyis2244@gmail.com');
console.log('3. Grant permissions to Wispix');
console.log('4. Copy the authorization code from the redirect URL');
console.log('');
console.log('5. Run this command with your code:');
console.log('node get_gmail_token.js <AUTHORIZATION_CODE>');
console.log('');

// If authorization code is provided as argument
if (process.argv[2]) {
  const code = process.argv[2];
  
  oauth2Client.getToken(code, (err, tokens) => {
    if (err) {
      console.error('❌ Error getting tokens:', err.message);
      return;
    }
    
    console.log('✅ Success! Add this to your .env file:');
    console.log('');
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('');
    console.log('Then restart your backend and try InboxManager!');
  });
}
