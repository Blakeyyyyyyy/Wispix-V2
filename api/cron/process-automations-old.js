import { supabase } from '../../src/lib/supabase-backend.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const cronParser = require('cron-parser');

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

export default async (req, res) => {
  // This is a Vercel Cron Job that runs every minute
  console.log('🕐 Cron job triggered - checking for pending automations...');

  try {
    // First, clean up any stale running executions (running for more than 15 minutes)
    console.log('🧹 Checking for stale running executions...');
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: staleExecutions, error: staleError } = await supabase
      .from('flow_executions')
      .select('id, status, created_at, automation_id, thread_id')
      .eq('status', 'running')
      .lt('created_at', fifteenMinutesAgo);

    if (staleError) {
      console.error('❌ Error checking stale executions:', staleError);
    } else if (staleExecutions && staleExecutions.length > 0) {
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
      } else {
        console.log('✅ Cleaned up stale executions');
      }
    } else {
      console.log('✅ No stale executions found');
    }

    // Also clean up very old scheduled executions that are past their scheduled time
    console.log('🧹 Checking for old scheduled executions...');
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: oldScheduledExecutions, error: oldScheduledError } = await supabase
      .from('flow_executions')
      .select('id, status, scheduled_for, next_scheduled_run, created_at')
      .eq('status', 'scheduled')
      .lt('created_at', oneHourAgo);

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
        console.log('✅ Cleaned up old scheduled executions');
      }
    } else {
      console.log('✅ No old scheduled executions found');
    }

    // Get all pending/running executions and check scheduled executions
    const { data: allExecutions, error } = await supabase
      .from('flow_executions')
      .select('*')
      .in('status', ['pending', 'running', 'scheduled'])
      .order('created_at', 'asc');

    if (error) {
      console.error('❌ Error fetching executions:', error);
      return res.status(500).json({ error: 'Failed to fetch executions' });
    }

    console.log(`🔍 Found ${allExecutions?.length || 0} total executions`);
    if (allExecutions && allExecutions.length > 0) {
      console.log(`🔍 Execution statuses:`, allExecutions.map(e => ({ id: e.id, status: e.status, created_at: e.created_at })));
    }

    // Filter scheduled executions that are ready to run
    const now = new Date();
    const readyExecutions = allExecutions.filter(execution => {
      if (execution.status === 'pending') {
        return true; // Only process pending executions
      }
      
      if (execution.status === 'running') {
        // Check if this is a stuck execution that needs to be cleaned up
        const runningTime = new Date(execution.started_at || execution.created_at);
        const minutesRunning = (now - runningTime) / (1000 * 60);
        
        if (minutesRunning > 15) {
          console.log(`🧹 Execution ${execution.id} has been running for ${minutesRunning.toFixed(1)} minutes, marking as failed`);
          return false; // Don't process, let cleanup handle it
        }
        
        // Process running executions to continue with next steps
        // Duplicate prevention is handled by pending result checks
        return true;
      }
      
      if (execution.status === 'scheduled') {
        // Check if scheduled time has arrived
        let scheduledTime;
        if (execution.scheduled_for) {
          // One-time execution - use scheduled_for
          scheduledTime = new Date(execution.scheduled_for);
        } else if (execution.next_scheduled_run) {
          // Recurring execution - use next_scheduled_run
          scheduledTime = new Date(execution.next_scheduled_run);
        } else {
          // No scheduled time found
          console.log(`❌ Execution ${execution.id} has no scheduled time`);
          return false;
        }
        
        const isReady = scheduledTime <= now;
        
        if (isReady) {
          console.log(`⏰ Scheduled execution ${execution.id} is ready to run (scheduled: ${scheduledTime.toISOString()})`);
        } else {
          console.log(`⏳ Execution ${execution.id} not ready yet (scheduled: ${scheduledTime.toISOString()}, now: ${now.toISOString()})`);
        }
        
        return isReady;
      }
      
      return false;
    });

    const executions = readyExecutions;

    console.log(`🔍 Filtered to ${executions?.length || 0} ready executions`);
    if (executions && executions.length > 0) {
      console.log(`🔍 Ready execution statuses:`, executions.map(e => ({ id: e.id, status: e.status, current_step: e.current_step })));
    }

    if (!executions || executions.length === 0) {
      console.log('✅ No pending executions found');
      return res.status(200).json({ message: 'No pending executions' });
    }

    // Group executions by automation_id to ensure one per automation
    const executionsByAutomation = new Map();
    executions.forEach(execution => {
      const automationId = execution.automation_id;
      if (!executionsByAutomation.has(automationId)) {
        executionsByAutomation.set(automationId, []);
      }
      executionsByAutomation.get(automationId).push(execution);
    });

    console.log(`🔄 Found ${executions.length} executions across ${executionsByAutomation.size} automations`);

    // Process one execution per automation
    const processedExecutions = [];
    for (const [automationId, automationExecutions] of executionsByAutomation) {
      // Get the oldest execution for this automation
      const execution = automationExecutions[0];
      console.log(`🔄 Processing execution ${execution.id} for automation ${automationId}`);
      console.log(`🔄 Automation ${automationId} has ${automationExecutions.length} total executions (${automationExecutions.length - 1} queued)`);
      
      await processExecution(execution);
      processedExecutions.push(execution);
    }

    res.status(200).json({ 
      message: `Processed ${processedExecutions.length} executions across ${executionsByAutomation.size} automations`,
      executions: processedExecutions.length,
      automations: executionsByAutomation.size
    });

  } catch (error) {
    console.error('❌ Cron job error:', error);
    res.status(500).json({ error: 'Cron job failed' });
  }
};

async function processExecution(execution) {
    console.log(`🔄 Processing execution ${execution.id}...`);
    console.log(`🔄 Execution status: ${execution.status}`);
    console.log(`🔄 Current step: ${execution.current_step || 0} of ${execution.steps?.length || 0}`);

    try {
      // Check if execution has been running too long (timeout protection)
      const executionStartTime = new Date(execution.started_at || execution.created_at);
      const executionDuration = Date.now() - executionStartTime.getTime();
      const maxExecutionTime = 20 * 60 * 1000; // 20 minutes

      if (executionDuration > maxExecutionTime) {
        const minutesRunning = Math.floor(executionDuration / (1000 * 60));
        console.log(`⏰ Execution ${execution.id} has been running for ${minutesRunning} minutes, marking as failed`);
        await supabase
          .from('flow_executions')
          .update({ 
            status: 'failed',
            error_message: `Execution exceeded maximum time limit (${minutesRunning} minutes)`,
            completed_at: new Date().toISOString()
          })
          .eq('id', execution.id);
        return;
      }

      // Check if automation is still enabled BEFORE processing
      const { data: thread, error: threadError } = await supabase
        .from('automation_threads')
        .select('enabled')
        .eq('id', execution.thread_id)
        .single();

      if (threadError || !thread.enabled) {
        console.log(`❌ Automation ${execution.thread_id} is disabled, cancelling execution`);
        await supabase
          .from('flow_executions')
          .update({ 
            status: 'cancelled',
            error_message: 'Automation is disabled',
            completed_at: new Date().toISOString()
          })
          .eq('id', execution.id);
        return;
      }

      // If this is a scheduled execution, convert it to pending first
      if (execution.status === 'scheduled') {
        console.log(`⏰ Converting scheduled execution ${execution.id} to pending...`);
        
        const { error: updateError } = await supabase
          .from('flow_executions')
          .update({ 
            status: 'pending',
            started_at: new Date().toISOString()
          })
          .eq('id', execution.id);

        if (updateError) {
          console.error(`❌ Failed to convert scheduled execution to pending:`, updateError);
          return;
        }

        // Update the execution object for further processing
        execution.status = 'pending';
        console.log(`✅ Converted scheduled execution ${execution.id} to pending`);
      }

    const steps = execution.steps || [];
    const results = execution.results || [];
    let currentStep = execution.current_step || 0;

    // Process ONLY the current step (not all steps)
    if (currentStep < steps.length) {
      const step = steps[currentStep];
      
      // Check if this step is already being processed (has a pending result)
      const stepResult = results.find(r => r.step_number === currentStep + 1);
      console.log(`🔍 Checking for pending step ${currentStep + 1}:`, {
        found: !!stepResult,
        status: stepResult?.status,
        allResults: results.map(r => ({ step: r.step_number, status: r.status }))
      });
      
      if (stepResult && stepResult.status === 'pending') {
        console.log(`⏳ Step ${currentStep + 1} is already being processed, waiting for agent response...`);
        return; // Don't process the same step again
      }
      
      // Note: Running executions are processed to continue with next steps
      // Duplicate prevention is handled by pending result checks above
      
      console.log(`🔄 Processing step ${currentStep + 1}/${steps.length}: ${step.content}`);

      // Add pending result IMMEDIATELY to prevent duplicate processing
      const pendingResult = {
        step_number: currentStep + 1,
        content: step.content,
        response: null,
        timestamp: new Date().toISOString(),
        status: 'pending'
      };
      results.push(pendingResult);
      
      // Update execution with pending result
      if (execution.status === 'pending') {
        // For pending executions, update status to running
        console.log(`🔄 Updating execution ${execution.id} with pending result and status to running...`);
        const { error: pendingUpdateError } = await supabase
          .from('flow_executions')
          .update({ 
            results: results,
            status: 'running',
            started_at: new Date().toISOString()
          })
          .eq('id', execution.id)
          .eq('status', 'pending'); // Only update if still pending (prevent race conditions)

        if (pendingUpdateError) {
          console.error(`❌ Failed to add pending result and update status:`, pendingUpdateError);
          return;
        }
        
        // Check if the update actually worked
        const { data: updatedExecution, error: checkError } = await supabase
          .from('flow_executions')
          .select('status, results')
          .eq('id', execution.id)
          .single();
        
        if (checkError || !updatedExecution) {
          console.error(`❌ Failed to verify execution update:`, checkError);
          return;
        }
        
        if (updatedExecution.status !== 'running') {
          console.log(`⏳ Execution ${execution.id} was already updated by another process, skipping...`);
          return;
        }
      } else {
        // For running executions, only update results
        console.log(`🔄 Updating execution ${execution.id} with pending result (already running)...`);
        const { error: resultsUpdateError } = await supabase
          .from('flow_executions')
          .update({ 
            results: results
          })
          .eq('id', execution.id);

        if (resultsUpdateError) {
          console.error(`❌ Failed to add pending result:`, resultsUpdateError);
          return;
        }
      }
      
      console.log(`✅ Added pending result for step ${currentStep + 1} and updated status to running`);
      console.log(`🔍 Updated results array:`, results.map(r => ({ step: r.step_number, status: r.status })));

      try {
        // Prepare webhook payload with better context
        const webhookCallId = `webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const webhookPayload = {
          thread_id: execution.execution_thread_id || execution.thread_id, // Use unique execution thread ID if available
          automation_id: execution.automation_id,
          user_id: execution.user_id,
          step_content: step.content,
          step_number: currentStep + 1,
          current_step: currentStep + 1, // Explicitly include current step for clarity
          total_steps: steps.length,
          project_context: execution.project_context,
          execution_id: execution.id,
          timestamp: new Date().toISOString(),
          webhook_call_id: webhookCallId, // Unique identifier for this webhook call
          // Add previous steps context to help agent understand sequence
          previous_steps: results.map(r => ({
            step_number: r.step_number,
            content: r.content,
            response: r.response
          })),
          // Add all steps for context
          all_steps: steps.map((s, index) => ({
            step_number: index + 1,
            content: s.content
          }))
        };

        console.log(`🌐 Calling N8N webhook with payload:`, JSON.stringify(webhookPayload, null, 2));
        console.log(`🔄 Step context: Current step ${currentStep + 1} of ${steps.length}`);
        console.log(`🔄 Previous steps completed: ${results.length}`);
        console.log(`🔄 Execution ID being sent: ${webhookPayload.execution_id}`);
        console.log(`🔄 Thread ID being sent: ${webhookPayload.thread_id}`);
        if (results.length > 0) {
          console.log(`🔄 Last completed step: ${results[results.length - 1].step_number} - ${results[results.length - 1].content}`);
        }

        // Verify execution exists before sending webhook
        console.log(`🔍 Verifying execution ${execution.id} exists before sending webhook...`);
        const { data: verifyExecution, error: verifyError } = await supabase
          .from('flow_executions')
          .select('id, status, current_step')
          .eq('id', execution.id)
          .single();
        
        if (verifyError || !verifyExecution) {
          console.error(`❌ Execution ${execution.id} not found before webhook call:`, verifyError);
          return;
        }
        console.log(`✅ Execution ${execution.id} verified, status: ${verifyExecution.status}, current_step: ${verifyExecution.current_step}`);

        // Call Agent 2 webhook with async pattern and polling
        console.log(`🌐 Starting webhook call for step ${currentStep + 1} at:`, new Date().toISOString());
        console.log(`🌐 Webhook payload:`, JSON.stringify(webhookPayload, null, 2));
        let responseText;
        try {
          responseText = await callAgentWithPolling(webhookPayload, currentStep + 1);
          console.log(`✅ Step ${currentStep + 1} completed at:`, new Date().toISOString());
          console.log(`📋 Response:`, responseText.substring(0, 200) + '...');
        } catch (webhookError) {
          console.error(`❌ Step ${currentStep + 1} webhook call failed:`, webhookError.message);
          
          // Mark execution as failed immediately on webhook error
          await supabase
            .from('flow_executions')
            .update({ 
              status: 'failed',
              error_message: `Step ${currentStep + 1} failed: ${webhookError.message}`,
              completed_at: new Date().toISOString(),
              results: results
            })
            .eq('id', execution.id);
          
          // Add error to activity log
          await supabase
            .from('activity_logs')
            .insert({
              thread_id: execution.thread_id,
              user_id: execution.user_id,
              content: `Step ${currentStep + 1} failed: ${webhookError.message}`,
              sender_type: 'system'
            });
          
          console.log(`❌ Execution ${execution.id} marked as failed due to webhook error`);
          return;
        }

        // Parse JSON response and extract content
        let parsedResponse = responseText;
        let extractedContent = responseText;
        let hasError = false;
        
        try {
          parsedResponse = JSON.parse(responseText);
          console.log(`📊 Parsed JSON response:`, parsedResponse);
          
          // Extract content from nested structure
          if (parsedResponse.output && typeof parsedResponse.output === 'object') {
            extractedContent = parsedResponse.output.Output || parsedResponse.output.output || JSON.stringify(parsedResponse.output);
            hasError = parsedResponse.output.Error === true || parsedResponse.output.error === true;
            console.log(`📊 Extracted content:`, extractedContent);
            console.log(`📊 Has error:`, hasError);
          }
        } catch (parseError) {
          console.log(`📝 Response is not JSON, using as text:`, responseText.substring(0, 100));
        }

        // Store step result
        const stepResult = {
          step_number: currentStep + 1,
          content: step.content,
          response: extractedContent, // Use extracted content instead of full parsed response
          raw_response: responseText,
          timestamp: new Date().toISOString(),
          status: hasError ? 'failed' : 'completed',
          error: hasError ? extractedContent : null
        };
        
        results.push(stepResult);

        // If there's an error, stop the automation
        if (hasError) {
          console.error(`❌ Step ${currentStep + 1} failed with error:`, extractedContent);
          
          // Mark execution as failed
          await supabase
            .from('flow_executions')
            .update({ 
              status: 'failed',
              error_message: extractedContent,
              completed_at: new Date().toISOString(),
              results: results
            })
            .eq('id', execution.id);

          console.log(`❌ Execution ${execution.id} marked as failed due to agent error`);
          return; // Stop processing this execution
        }

        // No need to write to activity_logs - all logs come from execution results

        // Update execution with new step - increment current_step for next cron run
        await supabase
          .from('flow_executions')
          .update({ 
            current_step: currentStep + 1,
            results: results
          })
          .eq('id', execution.id);

        console.log(`✅ Step ${currentStep + 1} processed successfully`);

        // Check if this was the last step
        if (currentStep + 1 >= steps.length) {
          console.log(`🎉 All steps completed! Marking execution as completed.`);
          await supabase
            .from('flow_executions')
            .update({ 
              status: 'completed',
              completed_at: new Date().toISOString()
            })
            .eq('id', execution.id);
        }

        // Add a small delay to ensure proper sequencing
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Step ${currentStep + 1} failed:`, error);
        
        const stepResult = {
          step_number: currentStep + 1,
          content: step.content,
          response: null,
          error: error.message,
          timestamp: new Date().toISOString(),
          status: 'failed'
        };
        
        results.push(stepResult);

        // No need to write to activity_logs - all logs come from execution results

        // Mark execution as failed
        await supabase
          .from('flow_executions')
          .update({ 
            status: 'failed',
            error_message: error.message,
            completed_at: new Date().toISOString(),
            results: results
          })
          .eq('id', execution.id);

        console.log(`❌ Execution ${execution.id} marked as failed`);
        return;
      }
    } else {
      // No more steps to process - execution is complete
      console.log(`✅ All steps completed for execution ${execution.id}`);
      
      await supabase
        .from('flow_executions')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
          results: results
        })
        .eq('id', execution.id);
    }

    // Check if this is a recurring schedule and create next execution
    if (execution.cron_expression && execution.is_scheduled) {
      console.log(`🔄 Creating next execution for recurring schedule: ${execution.cron_expression}`);
      
      try {
        // Calculate next run time using cron expression
        let nextRun;
        try {
          // Try to parse the cron expression properly
          const interval = cronParser.parseExpression(execution.cron_expression);
          nextRun = interval.next().toDate();
          console.log(`📅 Parsed cron expression "${execution.cron_expression}" - next run: ${nextRun.toISOString()}`);
        } catch (parseError) {
          console.log('❌ Cron parsing failed:', parseError.message);
          console.log('❌ Cron expression:', execution.cron_expression);
          
          // Fallback: try to parse manually for common patterns
          if (execution.cron_expression.includes('*/')) {
            // Handle interval patterns like */5 * * * * (every 5 minutes)
            const parts = execution.cron_expression.split(' ');
            if (parts[0].startsWith('*/')) {
              const minutes = parseInt(parts[0].substring(2));
              nextRun = new Date(Date.now() + minutes * 60 * 1000);
            } else if (parts[1].startsWith('*/')) {
              const hours = parseInt(parts[1].substring(2));
              nextRun = new Date(Date.now() + hours * 60 * 60 * 1000);
            } else if (parts[2].startsWith('*/')) {
              const days = parseInt(parts[2].substring(2));
              nextRun = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
            } else {
              nextRun = new Date(Date.now() + 60 * 1000); // Default to 1 minute
            }
          } else {
            nextRun = new Date(Date.now() + 60 * 1000); // Default to 1 minute
          }
          console.log(`📅 Fallback calculation - next run: ${nextRun.toISOString()}`);
        }
        
        console.log(`📅 Next run scheduled for: ${nextRun.toISOString()}`);
        
        // Create new execution for next run
        const { data: newExecution, error: createError } = await supabase
          .from('flow_executions')
          .insert({
            thread_id: execution.thread_id,
            automation_id: execution.automation_id,
            user_id: execution.user_id,
            status: 'scheduled',
            steps: execution.steps,
            project_context: execution.project_context,
            current_step: 0,
            total_steps: execution.total_steps,
            results: [],
            is_scheduled: true,
            cron_expression: execution.cron_expression,
            next_scheduled_run: nextRun.toISOString(),
            has_end_time: execution.has_end_time,
            end_time: execution.end_time,
            execution_thread_id: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` // Generate unique execution thread ID
          })
          .select()
          .single();

        if (createError) {
          console.error(`❌ Failed to create next execution:`, createError);
        } else {
          console.log(`✅ Created next execution ${newExecution.id} for ${nextRun.toISOString()}`);
        }
      } catch (cronError) {
        console.error(`❌ Error calculating next run time:`, cronError);
      }
    }

    console.log(`✅ Execution ${execution.id} marked as completed`);

  } catch (error) {
    console.error(`❌ Error processing execution ${execution.id}:`, error);
    
    await supabase
      .from('flow_executions')
      .update({ 
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString()
      })
      .eq('id', execution.id);
  }
}