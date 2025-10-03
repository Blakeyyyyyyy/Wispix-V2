import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false }
  }
);

export const maxDuration = 30; // 30 seconds max for force stop

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
    const { executionId, userId } = req.body;

    if (!executionId) {
      return res.status(400).json({ 
        error: 'Missing required field: executionId' 
      });
    }

    console.log('🛑 Force stopping execution:', executionId);

    // First, get the execution details to validate it exists and is running
    const { data: execution, error: fetchError } = await supabase
      .from('flow_executions')
      .select('id, status, user_id, thread_id, started_at')
      .eq('id', executionId)
      .single();

    if (fetchError) {
      console.error('❌ Execution not found:', fetchError);
      return res.status(404).json({ 
        error: 'Execution not found',
        details: fetchError.message
      });
    }

    // Validate user ownership if userId is provided
    if (userId && execution.user_id !== userId) {
      console.error('❌ User does not own this execution:', { executionUserId: execution.user_id, requestedUserId: userId });
      return res.status(403).json({ 
        error: 'Access denied',
        details: 'You do not have permission to stop this execution'
      });
    }

    // Check if execution is actually running
    if (execution.status !== 'running' && execution.status !== 'pending') {
      console.log('⚠️ Execution is not running, current status:', execution.status);
      return res.status(400).json({ 
        error: 'Execution cannot be stopped',
        details: `Execution is currently ${execution.status}, only running or pending executions can be stopped`
      });
    }

    // Update the execution status to 'cancelled' (stopped)
    const { data: updateData, error: updateError } = await supabase
      .from('flow_executions')
      .update({ 
        status: 'cancelled',
        error_message: 'Force stopped by user',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', executionId)
      .select();

    console.log('🛑 Database update result:', { updateData, updateError });

    if (updateError) {
      console.error('❌ Failed to force stop execution:', updateError);
      return res.status(500).json({ 
        error: 'Failed to force stop execution',
        details: updateError.message
      });
    }

    // Also update any related automation jobs to cancelled status
    try {
      await supabase
        .from('automation_jobs')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('execution_id', executionId);
      
      console.log('🛑 Updated related automation jobs to cancelled');
    } catch (jobError) {
      console.warn('⚠️ Failed to update automation jobs (non-critical):', jobError);
    }

    console.log('✅ Execution force stopped successfully:', executionId);

    res.status(200).json({ 
      success: true,
      message: 'Execution force stopped successfully',
      executionId: executionId,
      previousStatus: execution.status,
      stoppedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Force stop execution error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
}