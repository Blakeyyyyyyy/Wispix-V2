import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export const maxDuration = 30; // 30 seconds max

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🧹 Manual cleanup of stale executions triggered...');

    // 1. Clean up stale running executions (running for more than 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: staleExecutions, error: staleError } = await supabase
      .from('flow_executions')
      .select('id, status, created_at, automation_id, thread_id')
      .eq('status', 'running')
      .lt('created_at', fifteenMinutesAgo);

    if (staleError) {
      console.error('❌ Error checking stale executions:', staleError);
      return res.status(500).json({ 
        error: 'Failed to check stale executions',
        details: staleError.message 
      });
    }

    let staleCleanupCount = 0;
    if (staleExecutions && staleExecutions.length > 0) {
      console.log('🧹 Found stale running executions, cleaning up:', staleExecutions.length);
      staleExecutions.forEach(execution => {
        const timeSinceCreated = Date.now() - new Date(execution.created_at).getTime();
        const minutesAgo = Math.floor(timeSinceCreated / (1000 * 60));
        console.log(`  - ${execution.id}: ${minutesAgo} minutes old`);
      });
      
      // Mark stale executions as failed
      const { error: updateError } = await supabase
        .from('flow_executions')
        .update({ 
          status: 'failed',
          error_message: 'Execution timed out and was automatically cleaned up',
          completed_at: new Date().toISOString()
        })
        .eq('status', 'running')
        .lt('created_at', fifteenMinutesAgo);
      
      if (updateError) {
        console.error('❌ Error cleaning up stale executions:', updateError);
        return res.status(500).json({ 
          error: 'Failed to clean up stale executions',
          details: updateError.message 
        });
      }
      
      staleCleanupCount = staleExecutions.length;
      console.log('✅ Cleaned up stale executions');
    } else {
      console.log('✅ No stale executions found');
    }

    // 2. Clean up very old scheduled executions
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: oldScheduledExecutions, error: oldScheduledError } = await supabase
      .from('flow_executions')
      .select('id, status, scheduled_for, next_scheduled_run, created_at')
      .eq('status', 'scheduled')
      .lt('created_at', oneHourAgo);

    let oldScheduledCleanupCount = 0;
    if (oldScheduledError) {
      console.error('❌ Error checking old scheduled executions:', oldScheduledError);
    } else if (oldScheduledExecutions && oldScheduledExecutions.length > 0) {
      console.log('🧹 Found old scheduled executions, cleaning up:', oldScheduledExecutions.length);
      
      // Mark old scheduled executions as failed
      const { error: updateOldError } = await supabase
        .from('flow_executions')
        .update({ 
          status: 'failed',
          error_message: 'Scheduled execution was too old and automatically cleaned up',
          completed_at: new Date().toISOString()
        })
        .eq('status', 'scheduled')
        .lt('created_at', oneHourAgo);
      
      if (updateOldError) {
        console.error('❌ Error cleaning up old scheduled executions:', updateOldError);
      } else {
        oldScheduledCleanupCount = oldScheduledExecutions.length;
        console.log('✅ Cleaned up old scheduled executions');
      }
    } else {
      console.log('✅ No old scheduled executions found');
    }

    // 3. Get current status
    const { data: currentRunning, error: currentError } = await supabase
      .from('flow_executions')
      .select('id, status, created_at, automation_id')
      .eq('status', 'running')
      .order('created_at', 'desc');

    if (currentError) {
      console.error('❌ Error fetching current running executions:', currentError);
    }

    console.log('✅ Manual cleanup completed successfully');

    res.status(200).json({
      success: true,
      message: 'Stale execution cleanup completed',
      cleanup_results: {
        stale_running_cleaned: staleCleanupCount,
        old_scheduled_cleaned: oldScheduledCleanupCount,
        current_running_count: currentRunning?.length || 0
      },
      current_running_executions: currentRunning?.map(exec => ({
        id: exec.id,
        automation_id: exec.automation_id,
        created_at: exec.created_at,
        minutes_old: Math.floor((Date.now() - new Date(exec.created_at).getTime()) / (1000 * 60))
      })) || [],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Manual cleanup error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}