import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

export default async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { executionId } = req.query;
    
    if (!executionId) {
      return res.status(400).json({ error: 'executionId is required' });
    }

    console.log('🔍 Checking execution status for:', executionId);
    
    const { data: execution, error: executionError } = await supabase
      .from('flow_executions')
      .select('*')
      .eq('id', executionId)
      .single();

    if (executionError) {
      console.error('❌ Execution not found:', executionError);
      return res.status(404).json({
        success: false,
        error: 'Execution not found',
        details: executionError.message
      });
    }

    console.log('📊 Execution status:', {
      id: execution.id,
      status: execution.status,
      current_step: execution.current_step,
      total_steps: execution.total_steps,
      results: execution.results?.length || 0,
      created_at: execution.created_at,
      started_at: execution.started_at,
      completed_at: execution.completed_at
    });

    res.status(200).json({
      success: true,
      execution: {
        id: execution.id,
        status: execution.status,
        current_step: execution.current_step,
        total_steps: execution.total_steps,
        results: execution.results || [],
        created_at: execution.created_at,
        started_at: execution.started_at,
        completed_at: execution.completed_at
      }
    });

  } catch (error) {
    console.error('❌ Check execution status failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check execution status',
      details: error.message
    });
  }
};