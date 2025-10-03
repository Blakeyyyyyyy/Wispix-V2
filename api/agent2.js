import { InternalAgent2 } from '../src/lib/agents/InternalAgent2.js';

export default async function handler(req, res) {
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
    const agent2 = new InternalAgent2();
    
    const result = await agent2.executeStep({
      executionId: req.body.execution_id,
      automationId: req.body.automation_id,
      userId: req.body.user_id,
      step: req.body.step
    });
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Internal Agent 2 error:', error);
    res.status(500).json({ 
      error: 'Agent 2 encountered an error. Please try again later.',
      details: error.message
    });
  }
}