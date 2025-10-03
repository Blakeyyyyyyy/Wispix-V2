import { InternalAgent1 } from '../src/lib/agents/InternalAgent1.js';

export default async function handler(req, res) {
  console.log('🌐 API REQUEST LOG: /api/agent1 called');
  console.log('🌐 API REQUEST LOG: Method:', req.method);
  console.log('🌐 API REQUEST LOG: Body:', JSON.stringify(req.body, null, 2));
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Debug: Check environment variables
    console.log('Environment variables available:', {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'SET' : 'MISSING',
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ? 'SET' : 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING'
    });
    
    console.log('🌐 API REQUEST LOG: Creating InternalAgent1 instance');
    const agent1 = new InternalAgent1();
    console.log('🌐 API REQUEST LOG: Calling agent1.processMessage');
    const result = await agent1.processMessage({
      threadId: req.body.thread_id,
      userId: req.body.user_id,
      message: req.body.message
    });
    console.log('🌐 API REQUEST LOG: Agent1 response:', JSON.stringify(result, null, 2));
    res.status(200).json(result);
  } catch (error) {
    console.error('Internal Agent 1 error:', error);
    res.status(500).json({ 
      error: 'Agent 1 encountered an error. Please try again later.',
      details: error.message
    });
  }
}