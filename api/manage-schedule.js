const { automationQueue } = require('../src/lib/queue');
import { supabase } from '../src/lib/supabase-backend.js';

export default async (req, res) => {
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
    const { action, executionId, jobId } = req.body;

    console.log('🔧 Manage schedule request:', { action, executionId, jobId });

    if (!action || !executionId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    let result = { success: true };

    switch (action) {
      case 'pause':
        // Pause the specific job
        if (jobId) {
          await automationQueue.pause();
          await supabase
            .from('flow_executions')
            .update({ status: 'paused' })
            .eq('id', executionId);
          
          await supabase
            .from('automation_jobs')
            .update({ status: 'paused' })
            .eq('execution_id', executionId);
          
          result.message = 'Schedule paused successfully';
        } else {
          return res.status(400).json({ error: 'Job ID required for pause action' });
        }
        break;

      case 'resume':
        // Resume the specific job
        if (jobId) {
          await automationQueue.resume();
          await supabase
            .from('flow_executions')
            .update({ status: 'scheduled' })
            .eq('id', executionId);
          
          await supabase
            .from('automation_jobs')
            .update({ status: 'waiting' })
            .eq('execution_id', executionId);
          
          result.message = 'Schedule resumed successfully';
        } else {
          return res.status(400).json({ error: 'Job ID required for resume action' });
        }
        break;

      case 'delete':
        // Remove the job from queue
        if (jobId) {
          await automationQueue.removeJob(jobId);
          await supabase
            .from('flow_executions')
            .update({ 
              status: 'cancelled', 
              is_scheduled: false,
              next_scheduled_run: null
            })
            .eq('id', executionId);
          
          await supabase
            .from('automation_jobs')
            .update({ status: 'cancelled' })
            .eq('execution_id', executionId);
          
          result.message = 'Schedule deleted successfully';
        } else {
          return res.status(400).json({ error: 'Job ID required for delete action' });
        }
        break;

      case 'status':
        // Get job status
        const { data: execution } = await supabase
          .from('flow_executions')
          .select('*, automation_jobs(*)')
          .eq('id', executionId)
          .single();
        
        if (execution) {
          result.execution = execution;
        } else {
          return res.status(404).json({ error: 'Execution not found' });
        }
        break;

      case 'list':
        // List all scheduled jobs for a user
        const { data: executions } = await supabase
          .from('flow_executions')
          .select('*, automation_jobs(*)')
          .eq('user_id', req.body.userId)
          .eq('is_scheduled', true)
          .order('created_at', { ascending: false });
        
        result.executions = executions || [];
        break;

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    console.log('✅ Schedule management completed:', action);
    res.json(result);

  } catch (error) {
    console.error('❌ Manage schedule error:', error);
    res.status(500).json({ 
      error: 'Failed to manage schedule',
      details: error.message 
    });
  }
};