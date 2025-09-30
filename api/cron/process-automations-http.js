import { createClient } from '@supabase/supabase-js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Initialize Supabase client with service role key for cron job
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

// Configure maximum duration for this function
export const maxDuration = 800; // 13+ minutes (Fluid Compute)

// Call agent via HTTP request (fire and forget - no response waiting)
async function callAgentWithHTTP(webhookPayload, stepNumber) {
  console.log(`🌐 Calling agent via HTTP for step ${stepNumber}...`);
  
  // Convert webhook payload to agent format
  const agentPayload = {
    // Agent2 specific fields
    "Output": webhookPayload.step_content,
    "Error": null,
    "Thread Id": webhookPayload.thread_id,
    "Automation Id": webhookPayload.automation_id,
    "User Id": webhookPayload.user_id,
    "Execution Id": webhookPayload.execution_id,
    // Additional context
    "ProjectContext": webhookPayload.project_context,
    "StepNumber": stepNumber,
    "TotalSteps": webhookPayload.total_steps,
    "Timestamp": new Date().toISOString()
  };

  console.log('📋 Agent payload:', JSON.stringify(agentPayload, null, 2));
  console.log('🔍 Execution ID being sent to Agent 2:', {
    execution_id: webhookPayload.execution_id,
    type: typeof webhookPayload.execution_id,
    length: webhookPayload.execution_id ? webhookPayload.execution_id.length : 0
  });

  try {
    // Send to agent webhook (fire and forget - don't wait for response)
    const response = await fetch('https://novusautomations.net/webhook/a13a060a-62be-4ae8-a1f3-6503d23032bb', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Wispix-Automation-Platform/1.0',
      },
      body: JSON.stringify(agentPayload)
    });

    console.log(`📊 Agent webhook status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Agent webhook error:`, errorText);
      throw new Error(`Agent webhook responded with status ${response.status}: ${errorText}`);
    }

    console.log(`✅ Agent webhook request sent successfully (fire and forget)`);
    
    // Don't wait for response - Agent 2 will POST to /api/agent2-response
    return 'webhook_sent';

  } catch (error) {
    console.error(`❌ Agent webhook call failed:`, error);
    throw error;
  }
}

export default async (req, res) => {
  // This is a Vercel Cron Job that runs every minute
  console.log('🕐 HTTP-based cron job triggered - checking for pending automations...');

  try {
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

    // Filter scheduled executions that are ready to run
    const now = new Date();
    const readyExecutions = allExecutions.filter(execution => {
      if (execution.status === 'pending' || execution.status === 'running') {
        return true; // Always process pending/running
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
      
      // Ensure execution has execution_thread_id (for backward compatibility)
      if (!execution.execution_thread_id) {
        console.log(`🔧 Adding execution_thread_id to execution ${execution.id}`);
        const executionThreadId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const { error: updateError } = await supabase
          .from('flow_executions')
          .update({ 
            execution_thread_id: executionThreadId
          })
          .eq('id', execution.id);
        
        if (updateError) {
          console.error(`❌ Failed to add execution_thread_id:`, updateError);
        } else {
          execution.execution_thread_id = executionThreadId;
          console.log(`✅ Added execution_thread_id: ${executionThreadId}`);
        }
      }
      
      await processExecutionHTTP(execution);
      processedExecutions.push(execution);
    }

    res.status(200).json({ 
      message: `Processed ${processedExecutions.length} executions across ${executionsByAutomation.size} automations`,
      executions: processedExecutions.length,
      automations: executionsByAutomation.size
    });

  } catch (error) {
    console.error('❌ HTTP cron job error:', error);
    res.status(500).json({ error: 'HTTP cron job failed' });
  }
};

async function processExecutionHTTP(execution) {
    console.log(`🔄 Processing execution ${execution.id} with HTTP system...`);
    console.log(`🔄 Execution status: ${execution.status}`);
    console.log(`🔄 Current step: ${execution.current_step || 0} of ${execution.steps?.length || 0}`);

    try {
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
      }

      // Update execution status to running
      const { error: statusError } = await supabase
        .from('flow_executions')
        .update({ 
          status: 'running',
          started_at: new Date().toISOString()
        })
        .eq('id', execution.id);

      if (statusError) {
        console.error(`❌ Failed to update execution status:`, statusError);
        return;
      }

      const steps = execution.steps || [];
      const results = execution.results || [];
      let currentStep = execution.current_step || 0;

      // Check if execution has been force stopped
      if (execution.status === 'cancelled') {
        console.log(`🛑 Execution ${execution.id} has been force stopped, aborting processing`);
        return;
      }

      // Only process the current step if it hasn't been sent yet
      // Check if the current step is already pending (sent but not responded to)
      const currentStepResult = results.find(r => r.step_number === currentStep + 1);
      const isCurrentStepPending = currentStepResult && currentStepResult.status === 'pending';
      
      if (currentStep < steps.length && !isCurrentStepPending) {
        const step = steps[currentStep];
        console.log(`🔄 Processing step ${currentStep + 1}/${steps.length}: ${step.content}`);

        try {
          // Prepare webhook payload with better context
          const webhookPayload = {
            thread_id: execution.execution_thread_id || execution.thread_id,
            automation_id: execution.automation_id,
            user_id: execution.user_id,
            step_content: step.content,
            step_number: currentStep + 1,
            current_step: currentStep + 1, // Explicitly include current step for clarity
            total_steps: steps.length,
            project_context: execution.project_context,
            execution_id: execution.id,
            timestamp: new Date().toISOString(),
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

          console.log(`🌐 Calling agent via HTTP with payload:`, JSON.stringify(webhookPayload, null, 2));
          console.log(`🔄 Step context: Current step ${currentStep + 1} of ${steps.length}`);
          console.log(`🔄 Previous steps completed: ${results.length}`);
          if (results.length > 0) {
            console.log(`🔄 Last completed step: ${results[results.length - 1].step_number} - ${results[results.length - 1].content}`);
          }

          // Add thinking indicator for Agent 2
          const thinkingMessage = {
            id: 'thinking-agent2-' + Date.now() + '-' + (currentStep + 1),
            thread_id: execution.thread_id,
            user_id: execution.user_id,
            content: 'Agent 2 is thinking...',
            sender_type: 'agent2',
            created_at: new Date().toISOString()
          };

          const { error: thinkingError } = await supabase
            .from('chat_messages')
            .insert(thinkingMessage);

          if (thinkingError) {
            console.error('❌ Failed to add thinking message:', thinkingError);
          } else {
            console.log('🤔 Added Agent 2 thinking indicator');
          }

          // Call Agent via HTTP (fire and forget)
          console.log(`🌐 Starting HTTP call for step ${currentStep + 1} at:`, new Date().toISOString());
          const webhookResult = await callAgentWithHTTP(webhookPayload, currentStep + 1);
          console.log(`✅ Step ${currentStep + 1} webhook sent at:`, new Date().toISOString());

          // Only mark as pending if webhook was successful
          const stepResult = {
            step_number: currentStep + 1,
            content: step.content,
            response: null, // Will be filled by Agent 2 HTTP POST
            timestamp: new Date().toISOString(),
            status: webhookResult === 'webhook_sent' ? 'pending' : 'failed', // Only pending if webhook succeeded
            error: webhookResult === 'webhook_sent' ? null : 'Webhook call failed'
          };
          
          results.push(stepResult);

          // Update execution with current step and results
          const { error: updateError } = await supabase
            .from('flow_executions')
            .update({ 
              current_step: currentStep, // Don't increment here - currentStep is the step being sent
              results: results
            })
            .eq('id', execution.id);

          if (updateError) {
            console.error(`❌ Failed to update execution:`, updateError);
          }

          console.log(`✅ Step ${currentStep + 1} webhook sent - waiting for Agent 2 HTTP POST response`);
          
          // Don't process more steps - wait for Agent 2 to respond via HTTP POST
          // The execution will be updated when Agent 2 calls /api/agent2-response

        } catch (error) {
          console.error(`❌ Error processing step ${currentStep + 1}:`, error);
          
          const stepResult = {
            step_number: currentStep + 1,
            content: step.content,
            response: null,
            timestamp: new Date().toISOString(),
            status: 'failed',
            error: error.message
          };
          
          results.push(stepResult);

          // Update execution with error
          await supabase
            .from('flow_executions')
            .update({ 
              current_step: currentStep + 1,
              results: results,
              status: 'failed',
              error_message: `Step ${currentStep + 1} failed: ${error.message}`,
              completed_at: new Date().toISOString()
            })
            .eq('id', execution.id);

          console.log(`❌ Execution ${execution.id} failed at step ${currentStep + 1}`);
          return;
        }
      } else if (isCurrentStepPending) {
        console.log(`✅ Execution ${execution.id} - step ${currentStep + 1} is pending, waiting for Agent 2 HTTP POST response`);
      } else {
        console.log(`✅ Execution ${execution.id} - all steps completed, waiting for final Agent 2 HTTP POST response`);
      }

      // Execution remains in 'running' status - Agent 2 will complete it via HTTP POST
      console.log(`✅ Execution ${execution.id} webhook sent - waiting for Agent 2 HTTP POST responses`);

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