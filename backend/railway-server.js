// backend/railway-server.js
// SIMPLE RUNTIME SERVER FOR RAILWAY - NO TYPESCRIPT NEEDED

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const Bull = require('bull');
const OpenAI = require('openai');

const app = express();
const db = new PrismaClient();
const port = process.env.PORT || 3000;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize Redis Queue
const emailQueue = new Bull('email-processing', process.env.REDIS_URL || 'redis://localhost:6379');

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'Growth AI InboxManager',
    timestamp: new Date().toISOString()
  });
});

// Simple status endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Growth AI Email Manager is running',
    version: '1.0.0',
    nextRun: nextRunTime
  });
});

let nextRunTime = null;

// Schedule InboxManager to run every 5 minutes
async function scheduleInboxManager() {
  console.log('📋 Setting up InboxManager schedule...');
  
  // Run every 5 minutes
  setInterval(async () => {
    nextRunTime = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    console.log(`⚡ Running InboxManager at ${new Date().toISOString()}`);
    
    try {
      // Add job to queue
      await emailQueue.add('process-emails', {
        timestamp: new Date().toISOString()
      });
      
      console.log('✅ InboxManager job queued');
    } catch (error) {
      console.error('❌ Error queueing job:', error.message);
    }
  }, 5 * 60 * 1000); // 5 minutes
  
  // Run immediately on startup
  emailQueue.add('process-emails', {
    timestamp: new Date().toISOString(),
    initial: true
  });
}

// Process email jobs
emailQueue.process('process-emails', async (job) => {
  console.log('📧 Processing emails...');
  
  try {
    // Import and run the InboxManager logic
    const { processEmails } = require('./email-processor');
    await processEmails();
    
    console.log('✅ Email processing complete');
    return { success: true };
  } catch (error) {
    console.error('❌ Email processing error:', error.message);
    throw error;
  }
});

// Start server
async function start() {
  try {
    // Connect to database
    await db.$connect();
    console.log('✅ Database connected');
    
    // Schedule InboxManager
    await scheduleInboxManager();
    
    // Start Express server
    app.listen(port, () => {
      console.log(`🚀 Growth AI Email Manager running on port ${port}`);
      console.log('📧 InboxManager will run every 5 minutes');
    });
  } catch (error) {
    console.error('❌ Startup error:', error);
    process.exit(1);
  }
}

start();
