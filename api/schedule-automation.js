import { supabase } from '../src/lib/supabase-backend.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const cronParser = require('cron-parser');

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
    const { 
      threadId, 
      automationId, 
      userId, 
      cronExpression, 
      scheduledFor, // For one-time executions
      steps, 
      projectContext,
      endTime,
      hasEndTime
    } = req.body;

    console.log('📅 Schedule automation request:', {
      threadId,
      automationId,
      userId,
      cronExpression,
      scheduledFor,
      stepsCount: steps?.length
    });

    if (!threadId || !automationId || !userId || !steps) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Check if the automation is enabled
    const { data: thread, error: threadError } = await supabase
      .from('automation_threads')
      .select('enabled')
      .eq('id', threadId)
      .eq('user_id', userId)
      .single();

    if (threadError) {
      return res.status(400).json({ error: 'Automation not found' });
    }

    if (!thread.enabled) {
      return res.status(400).json({ error: 'This automation is disabled' });
    }

    // Check if there's already a running execution for this automation
    const { data: runningExecutions, error: runningError } = await supabase
      .from('flow_executions')
      .select('id, status, created_at, automation_id')
      .eq('automation_id', automationId)
      .in('status', ['pending', 'running', 'scheduled'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (runningError) {
      console.error('❌ Error checking running executions:', runningError);
    } else if (runningExecutions && runningExecutions.length > 0) {
      console.log('🚫 Found running/scheduled execution for automation:', runningExecutions[0]);
      return res.status(400).json({ 
        error: 'Automation already running or scheduled',
        details: `There is already a ${runningExecutions[0].status} execution for automation ${automationId}`,
        executionId: runningExecutions[0].id
      });
    }

    // Skip cron validation for now - just log the expression
    if (cronExpression) {
      console.log('🔍 Cron expression provided:', cronExpression);
      // TODO: Add proper cron validation later
    }

    // Create execution record
    const executionData = {
      thread_id: threadId,
      automation_id: automationId,
      user_id: userId,
      status: 'scheduled',
      steps: steps,
      project_context: projectContext,
      current_step: 0,
      total_steps: steps.length,
      results: [],
      is_scheduled: true,
      has_end_time: hasEndTime || false,
      end_time: endTime || null,
      execution_thread_id: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` // Generate unique execution thread ID
    };

    // Add scheduling-specific fields
    if (cronExpression) {
      executionData.cron_expression = cronExpression;
      
      // Calculate proper next run time using cron expression
      try {
        const { parseExpression } = cronParser;
        const interval = parseExpression(cronExpression);
        const nextRun = interval.next().toDate();
        executionData.next_scheduled_run = nextRun.toISOString();
        console.log('📅 Next scheduled run (calculated):', executionData.next_scheduled_run);
      } catch (cronError) {
        console.error('❌ Error parsing cron expression:', cronError);
        // Fallback to 1 minute from now
        const nextRun = new Date();
        nextRun.setMinutes(nextRun.getMinutes() + 1);
        executionData.next_scheduled_run = nextRun.toISOString();
        console.log('📅 Next scheduled run (fallback):', executionData.next_scheduled_run);
      }
    } else if (scheduledFor) {
      executionData.scheduled_for = scheduledFor;
      executionData.next_scheduled_run = null; // One-time executions don't have a next run
    }

    const { data: execution, error: createError } = await supabase
      .from('flow_executions')
      .insert(executionData)
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating execution:', createError);
      return res.status(500).json({ error: 'Failed to create execution record' });
    }

      console.log('✅ Created execution record:', execution.id);
      console.log('📋 Execution details:', {
        id: execution.id,
        status: execution.status,
        thread_id: execution.thread_id,
        automation_id: execution.automation_id,
        created_at: execution.created_at
      });

    // For immediate execution, start it right away
    if (!cronExpression && !scheduledFor) {
      console.log('🚀 Starting immediate execution...');
      
      // Update status to pending for immediate processing
      const { error: updateError } = await supabase
        .from('flow_executions')
        .update({ 
          status: 'pending',
          started_at: new Date().toISOString()
        })
        .eq('id', execution.id);

      if (updateError) {
        console.error('❌ Error updating execution status:', updateError);
        return res.status(500).json({ error: 'Failed to start execution' });
      }
      
      console.log('✅ Execution updated to pending status');
    }

    console.log('✅ Created execution record for cron job processing');

    res.json({ 
      success: true, 
      executionId: execution.id,
      scheduledFor: execution.scheduled_for || execution.next_scheduled_run,
      isRecurring: !!cronExpression
    });

  } catch (error) {
    console.error('❌ Schedule automation error:', error);
    res.status(500).json({ 
      error: 'Failed to schedule automation',
      details: error.message 
    });
  }
};