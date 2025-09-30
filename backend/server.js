const express = require('express');
const { SessionManager } = require("./src/session/session-manager");
const cors = require('cors');
const cookieParser = require('cookie-parser');
const Anthropic = require('@anthropic-ai/sdk');
const { v4: uuidv4 } = require('uuid');
const { AgentBuilder } = require('./src/agents/agent-builder.js');
const { optionalAuth } = require('./src/middleware/auth');
// Register TypeScript support for runtime imports of .ts files
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'commonjs' }
});
// Import TypeScript route with .ts extension and use default export
const authRoutes = require('./src/routes/auth.ts').default;
// Add credential routes import
const credentialRoutes = require('./src/routes/credentials');
// AgentDeployer import removed - now using RenderDeployer via AgentBuilder
const RenderDeployer = require('./src/tools/render-deployer.js');
// Authentication removed - using simplified approach

require('dotenv').config();

// Initialize global credential store
if (!global.credentialStore) {
  global.credentialStore = new Map();
  // Add get method for easy access
  const { decrypt } = require('./src/lib/encryption');
  const originalGet = global.credentialStore.get.bind(global.credentialStore);
  global.credentialStore.get = function(userId, service) {
    const key = `${userId}-${service}`;
    const stored = originalGet(key);
    if (stored) {
      try {
        const decryptedCreds = decrypt(stored.encrypted);
        return JSON.parse(decryptedCreds);
      } catch (error) {
        console.error('Failed to decrypt credentials:', error);
        return null;
      }
    }
    return null;
  };
  
  // Add store method for credentials API
  const { encrypt } = require('./src/lib/encryption');
  const originalSet = global.credentialStore.set.bind(global.credentialStore);
  global.credentialStore.store = function(userId, service, credentials) {
    const key = `${userId}-${service}`;
    const encrypted = encrypt(JSON.stringify(credentials));
    originalSet(key, { encrypted, timestamp: Date.now() });
    return { success: true, key };
  };
  
  console.log('✅ Global credential store initialized');
}

const app = express();

// Add cookie parser middleware
app.use(cookieParser());
app.use(cors({
  origin: 'http://localhost:3002',
  credentials: true  // Important: allow cookies
}));
app.use(express.json());

// Verify critical environment variables are loaded
console.log('JWT_SECRET loaded:', !!process.env.JWT_SECRET);
console.log('DATABASE_URL loaded:', !!process.env.DATABASE_URL);

// Test Prisma connection on boot
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPrismaConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Prisma connected to Supabase');
    const userCount = await prisma.user.count();
    console.log('✅ User table accessible, count:', userCount);
  } catch (error) {
    console.error('❌ Prisma connection failed:', error.message);
  }
}
testPrismaConnection();

// Auth routes removed - using simplified approach
// app.use('/api/auth', authRoutes);

// New simplified credential API routes
const credentialsApiRoutes = require('./src/routes/credentials-api');
app.use('/api/credentials', credentialsApiRoutes);

// Agent action API routes
const agentsApiRoutes = require('./src/routes/agents-api');
app.use('/api/agents', agentsApiRoutes);

// Auth middleware removed - using simplified approach
// app.use('/api', optionalAuth);

// Initialize session manager for context persistence
const sessionManager = new SessionManager();

// Initialize Claude
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY,
});

// Store active employees (in production: use database)
const activeEmployees = new Map();

// Health check
app.get("/health", (_req, res) => res.json({ ok: true, time: Date.now() }));

app.get('/', (req, res) => {
  res.json({ 
    status: 'Wispix MVP Running',
    employees: activeEmployees.size,
    claude: 'Connected'
  });
});

// Direct Claude conversation endpoint - replaces entire agent building system
// Store active sessions to maintain conversation context
const activeSessions = new Map();

// Clean up old sessions after 24 hours
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, wrapper] of activeSessions.entries()) {
    if (wrapper.lastActivity && now - wrapper.lastActivity > 24 * 60 * 60 * 1000) {
      console.log('Cleaning up inactive session:', sessionId);
      activeSessions.delete(sessionId);
    }
  }
}, 60 * 60 * 1000); // Check every hour

app.post('/api/build-agent-smart', async (req, res) => {
  try {
    console.log('🔍 [SERVER] Processing agent request');
    
    // CHANGE THIS: Generate unique session ID per request/browser
    // Don't use 'anonymous' for everyone
    
    // Get session ID from cookie or generate new one
    let sessionId = req.cookies?.sessionId;
    
    if (!sessionId) {
      // Generate unique session ID for this browser session
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // Set cookie so browser remembers its session
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax'
      });
    }
    
    console.log('Using session ID:', sessionId);
    
    // Use this unique sessionId instead of userId for session management
    let claudeWrapper = activeSessions.get(sessionId);
    
    if (!claudeWrapper) {
      console.log('Creating new Claude wrapper for session:', sessionId);
      const ClaudeAgentWrapper = require('./src/agents/claude-wrapper');
      // Pass sessionId as userId to maintain isolation
      claudeWrapper = new ClaudeAgentWrapper(null, sessionId);
      activeSessions.set(sessionId, claudeWrapper);
    } else {
      console.log('Using existing Claude wrapper for session:', sessionId);
      claudeWrapper.writeStream = null; // Reset response stream
    }
    
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const lastMessage = messages[messages.length - 1];
    console.log('Processing message:', lastMessage.content.substring(0, 100) + '...');
    
    // Check if this requires credentials
    console.log('🔍 [SERVER] About to call processMessage with:', lastMessage.content);
    const response = await claudeWrapper.processMessage(lastMessage.content);
    
    console.log('🔍 [SERVER] Response from processMessage:', response);
    console.log('🔍 [SERVER] Response type:', response?.type || 'normal');
    
    // If response is a credential requirement, send it back to frontend
    if (response && response.type === 'credential_required') {
      console.log('Sending credential requirement to frontend');
      return res.status(200).json({
        type: 'credential_required',
        data: response,
        success: true
      });
    }

    // Continue with normal agent processing if no credentials needed
    console.log('Proceeding with normal agent creation');
    
    // Set up streaming response
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': 'http://localhost:3002',
      'Access-Control-Allow-Credentials': 'true'
    });

    const writeStream = (data) => {
      console.log('Streaming to frontend:', data);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    claudeWrapper.writeStream = writeStream;
    await claudeWrapper.handleConversation(messages);

    writeStream({ type: 'complete' });
    res.write('data: [DONE]\n\n');
  } catch (error) {
    console.error('Agent route error:', error);
    if (res.headersSent) {
      // If headers already sent (streaming), use streaming error
      const writeStream = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
      writeStream({ type: 'error', message: error.message });
      res.write('data: [DONE]\n\n');
    } else {
      // If headers not sent yet, return JSON error
      res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  } finally {
    if (res.headersSent) {
      res.end();
    }
  }
});

// Clean up old sessions periodically (optional)
setInterval(() => {
  console.log('Active sessions count:', activeSessions.size);
}, 60000); // Log every minute

// NEW: Update requirements endpoint
app.post('/api/update-requirements', async (req, res) => {
  const { sessionId, updates } = req.body;
  
  if (!sessionId || !updates) {
    return res.status(400).json({ 
      error: 'Missing sessionId or updates',
      required: ['sessionId', 'updates']
    });
  }
  
  try {
    const success = sessionManager.updateRequirements(sessionId, updates);
    
    if (success) {
      // Get updated requirements context
      const requirementsContext = sessionManager.getRequirementsContext(sessionId);
      
      res.json({
        success: true,
        message: 'Requirements updated successfully',
        requirements: requirementsContext,
        sessionId
      });
    } else {
      res.status(404).json({
        error: 'Session not found',
        sessionId
      });
    }
  } catch (error) {
    console.error('Error updating requirements:', error);
    res.status(500).json({
      error: 'Failed to update requirements',
      message: error.message
    });
  }
});

// NEW: Get requirements endpoint
app.get('/api/requirements/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  
  try {
    const requirementsContext = sessionManager.getRequirementsContext(sessionId);
    const session = sessionManager.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        sessionId
      });
    }
    
    res.json({
      success: true,
      requirements: session.requirements,
      requirementsContext,
      sessionId,
      status: session.status
    });
  } catch (error) {
    console.error('Error getting requirements:', error);
    res.status(500).json({
      error: 'Failed to get requirements',
      message: error.message
    });
  }
});

// Clarification response endpoint
app.post('/api/clarification-response', async (req, res) => {
  const { message, sessionId, originalRequest } = req.body;
  
  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': 'http://localhost:3002',
    'Access-Control-Allow-Credentials': 'true'
  });
  
  try {
    // Create a simple streaming writer for this endpoint
    const writeStream = (data) => {
      const chunk = `data: ${JSON.stringify(data)}\n\n`;
      res.write(chunk);
    };
    
    // Initialize the smart AgentBuilder with session manager
    const builder = new AgentBuilder(sessionManager);
    
    // Create a mock writer that works with the existing streaming system
    const mockWriter = {
      writeStep: (step) => {
        writeStream({
          type: step.type,
          message: step.message,
          metadata: step.metadata,
          timestamp: Date.now()
        });
      }
    };
    
    // Get full session context for clarification response
    const sessionContext = sessionManager.getFullContext(sessionId);
    
    // Build the agent with the clarification response and full context
    const result = await builder.buildAgent(message, mockWriter, sessionId, sessionContext);
    
    // End the stream
    res.write('data: [DONE]\n\n');
    res.end();
    
  } catch (error) {
    console.error('Clarification response error:', error);
    res.write(`data: ${JSON.stringify({ 
      type: 'error',
      message: error.message || 'Unknown error occurred',
      code: 'CLARIFICATION_ERROR',
      retryable: true,
      timestamp: Date.now()
    })}\n\n`);
    res.end();
  }
});

// OLD DEPLOYMENT ENDPOINT REMOVED - Now using the working /api/deploy-agent below with RenderDeployer
// This prevents conflicts with the new working deployment system

// Approval questions endpoint for context-aware Q&A
app.post('/api/approval-question', async (req, res) => {
  const { sessionId, question } = req.body;
  
  if (!sessionId || !question) {
    return res.status(400).json({ error: 'Session ID and question are required' });
  }
  
  try {
    // Get full session context
    const context = sessionManager.getFullContext(sessionId);
    if (!context) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Use AI to answer based on full context (Sonnet for cost efficiency)
    const answer = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Based on this context, answer the user's question: ${question}\n\nContext: ${JSON.stringify(context, null, 2)}`
      }],
      system: 'You are an AI assistant helping users understand their AI agent plan. Answer questions clearly and concisely based on the provided context. If the question cannot be answered from the context, say so politely.'
    });
    
    // Store Q&A in session for future reference
    sessionManager.addApprovalQuestion(sessionId, question, answer.content[0].text);
    
    // Add to conversation history
    sessionManager.addConversationMessage(sessionId, {
      role: 'user',
      content: question,
      type: 'approval_question'
    });
    
    sessionManager.addConversationMessage(sessionId, {
      role: 'assistant',
      content: answer.content[0].text,
      type: 'approval_answer'
    });
    
    res.json({
      answer: answer.content[0].text,
      context: context,
      sessionId: sessionId
    });
    
  } catch (error) {
    console.error('Approval question error:', error);
    res.status(500).json({
      error: 'Failed to process question',
      details: error.message
    });
  }
});

// Get session context endpoint
app.get('/api/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const context = sessionManager.getFullContext(sessionId);
  
  if (!context) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  res.json(context);
});

// Deploy agent to Render endpoint
app.post('/api/deploy-agent', async (req, res) => {
  const { sessionId } = req.body;
  
  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required' });
  }
  
  try {
    console.log(`🚀 Starting deployment for session: ${sessionId}`);
    
    // Get the session context
    const session = sessionManager.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Initialize AgentBuilder with deployment capability
    const builder = new AgentBuilder(sessionManager);
    
    // Create a simple writer for this endpoint
    const writer = {
      writeStep: (step) => {
        console.log(`[Deployment] ${step.type}: ${step.message}`);
      }
    };
    
    // Deploy the agent using AgentBuilder
    const result = await builder.deployAgent(sessionId, writer);
    
    if (result.success) {
      res.json({
        success: true,
        message: `Agent deployed successfully!`,
        url: result.url,
        agentName: result.agentName,
        deploymentTime: result.deploymentTime
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        agentName: result.agentName
      });
    }
    
  } catch (error) {
    console.error('Deployment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Deployment failed'
    });
  }
});

// Get deployment status endpoint
app.get('/api/deployment-status/:agentName', async (req, res) => {
  const { agentName } = req.params;
  
  try {
    // This would check the actual Render service status
    // For now, return a mock status
    res.json({
      agentName,
      status: 'deployed',
      url: `https://wispix-${agentName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.onrender.com`,
      lastChecked: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get deployment status',
      details: error.message
    });
  }
});

const PORT = 3000; // Fixed port for frontend compatibility
app.listen(PORT, () => {
  console.log(`🚀 Wispix Backend with Claude running on port ${PORT}`);
  console.log(`📊 Claude API: ${process.env.ANTHROPIC_API_KEY ? 'Connected' : 'Missing API Key!'}`);
});
