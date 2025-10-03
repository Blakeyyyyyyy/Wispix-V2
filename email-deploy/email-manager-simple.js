// email-manager-simple.js - ULTRA SIMPLE VERSION FOR TESTING
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

// Health endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'healthy',
    message: 'Growth AI Email Manager Running',
    timestamp: new Date().toISOString(),
    port: port,
    env: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    port: port
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Test endpoint working',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Growth AI Email Manager (Simple) running on port ${port}`);
  console.log('🔗 http://localhost:' + port);
  console.log('📊 Environment:', process.env.NODE_ENV || 'development');
  console.log('🔑 OpenAI Key exists:', !!process.env.OPENAI_API_KEY);
  console.log('📧 Gmail Token exists:', !!process.env.GMAIL_REFRESH_TOKEN);
});
