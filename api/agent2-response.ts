// api/agent2-response.ts
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// ✅ Server-side env (NOT VITE_*).
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Configurable table (defaults to 'flow_executions')
const FLOW_EXEC_TABLE = process.env.FLOW_EXEC_TABLE || 'flow_executions';

// Service-role client bypasses RLS on the server.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Vercel function option (optional)
export const maxDuration = 800;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const b = (req.body ?? {}) as Record<string, any>;

    // 🔑 Accept id in multiple shapes; prefer `id`
    const id: string | undefined =
      b.id ??
      b.execution_id ??
      b.executionId ??
      b['Execution Id'] ??
      b['execution id'];

    const thread_id = b.thread_id ?? b['Thread Id'];
    const user_id = b.user_id ?? b['User Id'];
    const automation_id = b.automation_id ?? b['Automation Id'];

    // Normalize a content field (optional, not required for lookup)
    const content =
      b.Output ?? b.output ?? b.content ?? b.message ?? b.response ?? b.result ?? null;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing id/execution_id',
        received_keys: Object.keys(b),
      });
    }

    console.log('[agent2-response] lookup', {
      table: FLOW_EXEC_TABLE,
      supabaseUrl: SUPABASE_URL,
      hasServiceKey: Boolean(SUPABASE_SERVICE_ROLE_KEY),
      id,
      automation_id,
      thread_id,
    });

    // ✅ Use maybeSingle to avoid PostgREST "coerce" error text
    let { data: execution, error } = await supabase
      .from(FLOW_EXEC_TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    // Optional fallbacks: try by execution_thread_id if the id looks like exec-...
    if (!execution && id && id.startsWith('exec-')) {
      const byThread = await supabase
        .from(FLOW_EXEC_TABLE)
        .select('*')
        .eq('execution_thread_id', id)
        .maybeSingle();
      execution = byThread.data ?? null;
    }

    // Optional fallback: by automation_id + thread_id
    if (!execution && automation_id && thread_id) {
      const byPair = await supabase
        .from(FLOW_EXEC_TABLE)
        .select('*')
        .eq('automation_id', automation_id)
        .eq('thread_id', thread_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      execution = byPair.data ?? null;
    }

    if (!execution) {
      return res.status(404).json({
        success: false,
        error: 'Execution not found',
        details: { id, automation_id, thread_id },
      });
    }

    // TODO: do any step updates you need; always update by .eq('id', execution.id)

    return res.status(200).json({ success: true });
  } catch (e: any) {
    console.error('agent2 endpoint error', e);
    return res.status(500).json({ success: false, error: String(e?.message || e) });
  }
}