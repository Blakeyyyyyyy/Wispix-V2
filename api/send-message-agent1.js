import { createClient } from '@supabase/supabase-js';

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export const maxDuration = 800; // 13+ minutes

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
    const { thread_id, automation_id, user_id, message, timestamp } = req.body;

    if (!thread_id || !user_id || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields: thread_id, user_id, and message are required' 
      });
    }

    console.log('🤖 Send message to Agent1:', {
      thread_id,
      automation_id,
      user_id,
      message: message.substring(0, 100) + '...',
      timestamp
    });

    // Send to Agent 1 webhook
    const webhookUrl = 'https://novusautomations.net/webhook/f49d3bf6-9601-4c30-8921-abe3fba7d661';
    
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        thread_id,
        automation_id,
        user_id,
        message,
        timestamp
      }),
    });

    if (!webhookResponse.ok) {
      throw new Error(`Agent 1 webhook responded with status: ${webhookResponse.status}`);
    }

    const responseText = await webhookResponse.text();
    console.log('✅ Agent1 webhook response received');
    
    // The webhook response should contain the agent's response
    // We'll let the agent response endpoints handle storing the message
    // This endpoint just forwards the request and returns the response
    
    res.status(200).send(responseText);
  } catch (error) {
    console.error('❌ Send message to Agent1 failed:', error);
    res.status(500).json({ 
      error: 'Failed to send message to Agent1',
      details: error.message
    });
  }
}