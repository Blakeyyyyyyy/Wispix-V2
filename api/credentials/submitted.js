import { createClient } from '@supabase/supabase-js';
import { InternalAgent1 } from '../../src/lib/agents/InternalAgent1.js';

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

export const maxDuration = 30; // 30 seconds

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { thread_id, user_id, platform, service_name, credential_id, traceId } = req.body;

    console.log(`[credentials/submitted][${traceId}] Processing credential submission`, {
      thread_id,
      user_id,
      platform,
      service_name,
      credential_id
    });

    // 1) Insert a structured system message
    const content = JSON.stringify({
      action: 'CREDENTIALS_SAVED',
      platform,
      service_name,
      credential_id,
      traceId,
      message: 'User saved credentials'
    });

    const { data: msg, error: insertErr } = await supabase
      .from('chat_messages')
      .insert({
        thread_id,
        user_id,
        sender_type: 'system',
        content
      })
      .select()
      .single();

    if (insertErr) {
      console.error(`[credentials/submitted][${traceId}] Failed to insert system message:`, insertErr);
      throw insertErr;
    }

    console.log(`[credentials/submitted][${traceId}] System message inserted:`, msg.id);

    // 2) Nudge Agent 1 with structured action
    const agent1 = new InternalAgent1();
    const result = await agent1.processMessage({
      threadId: thread_id,
      userId: user_id,
      message: content // structured JSON event, not free text
    });

    console.log(`[credentials/submitted][${traceId}] Agent 1 response:`, result);

    // 3) Persist Agent 1 response (if any)
    if (result?.message) {
      const { error: agentInsertErr } = await supabase
        .from('chat_messages')
        .insert({
          thread_id,
          user_id,
          content: result.message,
          sender_type: 'agent1'
        });

      if (agentInsertErr) {
        console.error(`[credentials/submitted][${traceId}] Failed to insert agent response:`, agentInsertErr);
      } else {
        console.log(`[credentials/submitted][${traceId}] Agent 1 response persisted`);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[credentials/submitted] error', e);
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
}
