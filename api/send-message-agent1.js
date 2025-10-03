import { createClient } from '@supabase/supabase-js';
import { InternalAgent1 } from '../src/lib/agents/InternalAgent1.js';

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

    console.log('🤖 Send message to Internal Agent1:', {
      thread_id,
      automation_id,
      user_id,
      message: message.substring(0, 100) + '...',
      timestamp
    });

    // Use Internal Agent 1 instead of N8N webhook
    console.log('🤖 About to call Internal Agent1 with:', { thread_id, user_id, message });
    
    const agent1 = new InternalAgent1();
    
    const result = await agent1.processMessage({
      threadId: thread_id,
      userId: user_id,
      message: message
    });
    
    console.log('✅ Internal Agent1 response received:', result);
    console.log('✅ Agent1 response action:', result?.action);
    console.log('✅ Agent1 response message:', result?.message);
    
    // Transform result into frontend-compatible format
    const messageContent = {
      content: result.message || result.content || 'Agent responded',
      sender_type: 'agent1',
      isCredentialRequest: result.action === 'CREDENTIAL_REQUEST',
      ...(result.action === 'CREDENTIAL_REQUEST' && {
        credentialData: {
          platform: result.platform,
          fields: result.fields
        }
      }),
      ...(result.action === 'FLOW_CHANGE' && {
        steps: result.steps,
        projectContext: result.projectContext
      })
    };

    // Store in database - content is just the message text
    const { data: savedMessage, error: saveError } = await supabase
      .from('chat_messages')
      .insert({
        thread_id: thread_id,
        user_id: user_id,
        content: messageContent.content, // JUST the message text
        sender_type: 'agent1'
        // Note: metadata column will be added later via migration
      })
      .select()
      .single();

    if (saveError) {
      console.error('Failed to save agent message:', saveError);
      throw saveError;
    }

    // Return to frontend in expected format
    res.status(200).json({
      ...messageContent,
      id: savedMessage.id,
      created_at: savedMessage.created_at
    });
  } catch (error) {
    console.error('❌ Send message to Agent1 failed:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      message: error.message,
      name: error.name,
      cause: error.cause
    });
    
    res.status(500).json({ 
      error: 'Failed to send message to Agent1',
      details: error.message
    });
  }
}