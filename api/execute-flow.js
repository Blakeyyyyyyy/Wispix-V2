import { supabase } from '../src/lib/supabase-backend.js';

// Configure maximum duration for this function
export const maxDuration = 800; // 13+ minutes (Fluid Compute)

// Async webhook call with polling for long-running tasks
async function callAgentWithPolling(webhookPayload, stepNumber) {
  const maxRetries = 3;
  const pollInterval = 5000; // 5 seconds
  const maxPollTime = 720000; // 12 minutes (10 minutes + 2 minutes buffer)
  const webhookUrl = 'https://novusautomations.net/webhook/a13a060a-62be-4ae8-a1f3-6503d23032bb';
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🌐 Attempt ${attempt}/${maxRetries} - Calling webhook for step ${stepNumber}`);
      
      // First, try to get a task ID from the webhook with proper timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const initialResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Wispix-Automation-Platform/1.0',
        },
        body: JSON.stringify({
          ...webhookPayload,
          async: true, // Signal that we want async processing
          return_task_id: true // Request task ID for polling
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      console.log(`🌐 Initial response status: ${initialResponse.status}`);
      
      if (!initialResponse.ok) {
        const errorText = await initialResponse.text();
        console.error(`❌ Webhook error response:`, errorText);
        
        // If it's a 504 timeout, try the fallback synchronous approach
        if (initialResponse.status === 504 && attempt === maxRetries) {
          console.log(`🔄 Final attempt - trying synchronous approach with extended timeout`);
          return await callAgentSynchronous(webhookPayload, stepNumber);
        }
        
        throw new Error(`Agent 2 responded with status ${initialResponse.status}: ${errorText}`);
      }

      const initialResponseText = await initialResponse.text();
      console.log(`📋 Initial response:`, initialResponseText.substring(0, 200) + '...');
      
      // Try to parse task ID from response
      let taskId = null;
      try {
        const parsed = JSON.parse(initialResponseText);
        taskId = parsed.task_id || parsed.taskId || parsed.id;
      } catch (e) {
        // If not JSON or no task ID, treat as synchronous response
        console.log(`📋 No task ID found, treating as synchronous response`);
        return initialResponseText;
      }
      
      if (!taskId) {
        console.log(`📋 No task ID found, treating as synchronous response`);
        return initialResponseText;
      }
      
      console.log(`🆔 Got task ID: ${taskId}, starting polling...`);
      
      // Poll for completion
      const startTime = Date.now();
      while (Date.now() - startTime < maxPollTime) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
        try {
          const pollController = new AbortController();
          const pollTimeoutId = setTimeout(() => pollController.abort(), 10000); // 10 second timeout
          
          const statusResponse = await fetch(`${webhookUrl}/status/${taskId}`, {
            method: 'GET',
            headers: {
              'User-Agent': 'Wispix-Automation-Platform/1.0',
            },
            signal: pollController.signal
          });
          
          clearTimeout(pollTimeoutId);
          
          if (statusResponse.ok) {
            const statusText = await statusResponse.text();
            const statusData = JSON.parse(statusText);
            
            if (statusData.status === 'completed') {
              console.log(`✅ Task ${taskId} completed successfully`);
              return statusData.result || statusData.response || statusText;
            } else if (statusData.status === 'failed') {
              throw new Error(`Task ${taskId} failed: ${statusData.error || 'Unknown error'}`);
            } else if (statusData.status === 'running' || statusData.status === 'pending') {
              console.log(`⏳ Task ${taskId} still ${statusData.status}, continuing to poll...`);
              continue;
            }
          }
        } catch (pollError) {
          console.log(`⚠️ Polling error (will retry):`, pollError.message);
          continue;
        }
      }
      
      // If we get here, polling timed out
      throw new Error(`Task ${taskId} timed out after ${maxPollTime/1000} seconds`);
      
    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        // Final attempt - try synchronous approach
        console.log(`🔄 All async attempts failed, trying synchronous approach`);
        return await callAgentSynchronous(webhookPayload, stepNumber);
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }
  }
}

// Fallback synchronous webhook call with extended timeout
async function callAgentSynchronous(webhookPayload, stepNumber) {
  const webhookUrl = 'https://novusautomations.net/webhook/a13a060a-62be-4ae8-a1f3-6503d23032bb';
  
  console.log(`🌐 Synchronous call for step ${stepNumber} with 10-minute timeout`);
  
  const syncController = new AbortController();
  const syncTimeoutId = setTimeout(() => syncController.abort(), 600000); // 10 minute timeout
  
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Wispix-Automation-Platform/1.0',
    },
    body: JSON.stringify(webhookPayload),
    signal: syncController.signal
  });
  
  clearTimeout(syncTimeoutId);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Synchronous webhook error:`, errorText);
    throw new Error(`Agent 2 responded with status ${response.status}: ${errorText}`);
  }

  return await response.text();
}

// Process automation steps directly
async function processAutomationSteps(executionId, threadId, automationId, userId, steps, projectContext) {
  console.log('🔄 Processing automation steps:', { executionId, stepsCount: steps.length });
  
  const results = [];
  
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    console.log(`🔄 Processing step ${i + 1}/${steps.length}:`, step.content);
    
    try {
      // Check if execution has been force stopped before processing each step
      const { data: currentExecution, error: checkError } = await supabase
        .from('flow_executions')
        .select('status')
        .eq('id', executionId)
        .single();

      if (checkError) {
        console.error('❌ Failed to check execution status:', checkError);
        throw new Error('Failed to check execution status');
      }

      if (currentExecution.status === 'cancelled') {
        console.log('🛑 Execution has been force stopped, aborting step processing');
        throw new Error('Execution was force stopped by user');
      }

      if (currentExecution.status !== 'running') {
        console.log(`⚠️ Execution status changed to ${currentExecution.status}, aborting step processing`);
        throw new Error(`Execution status changed to ${currentExecution.status}`);
      }

      // Update current step
      await supabase
        .from('flow_executions')
        .update({ 
          current_step: i + 1,
          results: results
        })
        .eq('id', executionId);

      // Call Agent 2 webhook with async pattern and polling
      console.log(`🌐 Starting webhook call for step ${i + 1} at:`, new Date().toISOString());
      const responseText = await callAgentWithPolling({
        thread_id: threadId,
        automation_id: automationId,
        user_id: userId,
        step_content: step.content,
        step_number: i + 1,
        current_step: i + 1, // Explicitly include current step for clarity
        total_steps: steps.length,
        project_context: projectContext,
        execution_id: executionId,
        timestamp: new Date().toISOString(),
      }, i + 1);
      
      console.log(`✅ Step ${i + 1} completed at:`, new Date().toISOString());
      console.log(`📋 Response:`, responseText.substring(0, 100) + '...');

      // Store step result
      const stepResult = {
        step_number: i + 1,
        content: step.content,
        response: responseText,
        timestamp: new Date().toISOString(),
        status: 'completed'
      };
      
      results.push(stepResult);

      // Add agent response to activity log (step description is handled by frontend)
      await supabase
        .from('activity_logs')
        .insert({
          thread_id: threadId,
          user_id: userId,
          content: responseText,
          sender_type: 'agent2'
        });

    } catch (error) {
      console.error(`❌ Step ${i + 1} failed:`, error);
      
      const stepResult = {
        step_number: i + 1,
        content: step.content,
        response: null,
        error: error.message,
        timestamp: new Date().toISOString(),
        status: 'failed'
      };
      
      results.push(stepResult);

      // Add error to activity log
      await supabase
        .from('activity_logs')
        .insert({
          thread_id: threadId,
          user_id: userId,
          content: `Step ${i + 1} failed: ${error.message}`,
          sender_type: 'system'
        });

      // Mark execution as failed
      await supabase
        .from('flow_executions')
        .update({ 
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString(),
          results: results
        })
        .eq('id', executionId);
      
      return; // Stop processing on error
    }
  }

  // All steps completed successfully
  console.log('✅ All steps completed successfully');
  
  await supabase
    .from('flow_executions')
    .update({ 
      status: 'completed',
      completed_at: new Date().toISOString(),
      results: results
    })
    .eq('id', executionId);

  // Add completion message to activity log
  await supabase
    .from('activity_logs')
    .insert({
      thread_id: threadId,
      user_id: userId,
      content: `Automation completed! Executed ${steps.length} steps.`,
      sender_type: 'system'
    });
}

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
    const { executionId, threadId, automationId, userId, steps, projectContext } = req.body;

    console.log('🚀 Execute-flow API called with:', {
      executionId,
      threadId,
      automationId,
      userId,
      stepsCount: steps?.length,
      projectContext: projectContext?.substring(0, 50) + '...'
    });

    if (!threadId || !automationId || !userId || !steps) {
      console.error('🚀 Missing required parameters:', { executionId, threadId, automationId, userId, steps: !!steps });
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Check if the automation is enabled
    console.log('🔍 Looking for thread:', { threadId, userId });
    
    const { data: thread, error: threadError } = await supabase
      .from('automation_threads')
      .select('enabled, id, user_id, name')
      .eq('id', threadId)
      .eq('user_id', userId)
      .single();

    console.log('🔍 Thread query result:', { thread, threadError });

    if (threadError) {
      console.error('❌ Thread not found:', threadError);
      return res.status(400).json({ 
        error: 'Automation not found',
        details: `Thread ${threadId} not found for user ${userId}`,
        threadError: threadError.message
      });
    }

    if (!thread.enabled) {
      return res.status(400).json({ error: 'This automation is disabled' });
    }

    // Only check for running executions if no executionId is provided (new execution)
    if (!executionId) {
      console.log('🔍 Checking for running executions (new execution)...');
      
      // First, clean up any stale running executions (running for more than 15 minutes)
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { data: staleExecutions, error: staleError } = await supabase
        .from('flow_executions')
        .select('id, status, created_at, automation_id')
        .eq('automation_id', automationId)
        .eq('status', 'running')
        .lt('created_at', fifteenMinutesAgo);

      if (staleError) {
        console.error('❌ Error checking stale executions:', staleError);
      } else if (staleExecutions && staleExecutions.length > 0) {
        console.log('🧹 Found stale running executions, cleaning up:', staleExecutions.length);
        // Mark stale executions as failed
        const { error: updateError } = await supabase
          .from('flow_executions')
          .update({ 
            status: 'failed',
            error_message: 'Execution timed out and was automatically cleaned up',
            completed_at: new Date().toISOString()
          })
          .eq('automation_id', automationId)
          .eq('status', 'running')
          .lt('created_at', fifteenMinutesAgo);
        
        if (updateError) {
          console.error('❌ Error cleaning up stale executions:', updateError);
        } else {
          console.log('✅ Cleaned up stale executions');
        }
      }

      // Now check for currently running executions
      const { data: runningExecutions, error: runningError } = await supabase
        .from('flow_executions')
        .select('id, status, created_at, automation_id')
        .eq('automation_id', automationId)
        .in('status', ['pending', 'running'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (runningError) {
        console.error('❌ Error checking running executions:', runningError);
      } else if (runningExecutions && runningExecutions.length > 0) {
        console.log('🚫 Found running execution for automation:', runningExecutions[0]);
        return res.status(400).json({ 
          error: 'Automation already running',
          details: `There is already a ${runningExecutions[0].status} execution for automation ${automationId}`,
          executionId: runningExecutions[0].id
        });
      }
    } else {
      console.log('🔍 Skipping running execution check (existing execution provided)');
    }

    // Create execution record if it doesn't exist
    let execution;
    if (executionId) {
      const { data: existingExecution } = await supabase
        .from('flow_executions')
        .select('*')
        .eq('id', executionId)
        .single();
      
      if (existingExecution) {
        execution = existingExecution;
      }
    }

    if (!execution) {
      // Create new execution record
      const { data: newExecution, error: createError } = await supabase
        .from('flow_executions')
        .insert({
          thread_id: threadId,
          automation_id: automationId,
          user_id: userId,
          status: 'pending',
          steps: steps,
          project_context: projectContext,
          current_step: 0,
          total_steps: steps.length,
          results: [],
          is_scheduled: false,
          execution_thread_id: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` // Generate unique execution thread ID
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating execution:', createError);
        return res.status(500).json({ error: 'Failed to create execution record' });
      }
      execution = newExecution;
    }

    // For immediate execution, mark as pending for cron job to process
    console.log('🚀 Starting immediate execution...');
    
    // Mark as pending - cron job will process it
    await supabase
      .from('flow_executions')
      .update({ 
        status: 'pending'
      })
      .eq('id', execution.id);

    console.log('✅ Execution record created and marked as pending for processing');
    console.log('📋 Execution details:', {
      id: execution.id,
      status: execution.status,
      thread_id: execution.thread_id,
      automation_id: execution.automation_id,
      created_at: execution.created_at
    });

    // Return immediately to client - cron job will handle the execution
    res.status(200).json({ 
      success: true, 
      message: 'Flow execution queued for processing',
      executionId: execution.id
    });

  } catch (error) {
    console.error('Error starting flow execution:', error);
    res.status(500).json({ 
      error: 'Failed to start flow execution',
      details: error.message 
    });
  }
};