import { createClient } from '@supabase/supabase-js';
import { createRequire } from 'module';
import crypto from 'crypto';
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
  console.log(`🌐 Calling internal Agent 2 for step ${stepNumber}...`);
  
  // Convert to internal Agent 2 format
  const agentPayload = {
    execution_id: webhookPayload.execution_id,
    automation_id: webhookPayload.automation_id,
    user_id: webhookPayload.user_id,
    step: {
      instruction: webhookPayload.step_content,
      step: stepNumber,
      tool_id: webhookPayload.tool_id || null,
      context: webhookPayload.context || {}
    }
  };

  console.log('📋 Internal Agent 2 payload:', JSON.stringify(agentPayload, null, 2));

  try {
    // Use internal Agent 2
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/agent2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Wispix-Automation-Platform/1.0',
      },
      body: JSON.stringify(agentPayload)
    });

    console.log(`📊 Internal Agent 2 status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Internal Agent 2 error:`, errorText);
      throw new Error(`Internal Agent 2 responded with status ${response.status}: ${errorText}`);
    }

    // Internal Agent 2 returns result directly
    const result = await response.json();
    console.log(`✅ Internal Agent 2 completed successfully:`, result);
    
    return result;

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
      
      // Force process stuck executions (pending for more than 5 minutes)
      const isStuck = currentStepResult && 
        currentStepResult.status === 'pending' && 
        currentStepResult.timestamp && 
        (Date.now() - new Date(currentStepResult.timestamp).getTime()) > 5 * 60 * 1000;
      
      if (currentStep < steps.length && (!isCurrentStepPending || isStuck)) {
        const step = steps[currentStep];
        if (isStuck) {
          console.log(`🔧 Processing stuck execution - step ${currentStep + 1}/${steps.length}: ${step.content}`);
        } else {
          console.log(`🔄 Processing step ${currentStep + 1}/${steps.length}: ${step.content}`);
        }

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
            id: crypto.randomUUID(),
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

          // Call Internal Agent 2 directly
          console.log(`🌐 Starting Internal Agent 2 call for step ${currentStep + 1} at:`, new Date().toISOString());
          const agentResult = await callAgentWithHTTP(webhookPayload, currentStep + 1);
          console.log(`✅ Step ${currentStep + 1} completed at:`, new Date().toISOString());

          // Handle direct response from Internal Agent 2
          const stepResult = {
            step_number: currentStep + 1,
            content: step.content,
            response: agentResult?.summary || 'Step completed',
            timestamp: new Date().toISOString(),
            status: agentResult?.success ? 'completed' : 'failed',
            error: agentResult?.success ? null : (agentResult?.error || 'Agent execution failed')
          };
          
          results.push(stepResult);

          // Update execution with current step and results
          const { error: updateError } = await supabase
            .from('flow_executions')
            .update({ 
              current_step: currentStep + 1, // Increment to next step
              results: results
            })
            .eq('id', execution.id);

          if (updateError) {
            console.error(`❌ Failed to update execution:`, updateError);
          }

          // Check if step failed
          if (stepResult.status === 'failed') {
            console.log(`❌ Execution ${execution.id} failed at step ${currentStep + 1}`);
            
            // Mark execution as failed
            await supabase
              .from('flow_executions')
              .update({ 
                status: 'failed',
                completed_at: new Date().toISOString()
              })
              .eq('id', execution.id);
            
            return;
          }

          // Check if this was the last step
          if (currentStep + 1 >= execution.steps.length) {
            console.log(`✅ Execution ${execution.id} completed - all steps executed`);
            
            // Mark execution as completed
            await supabase
              .from('flow_executions')
              .update({ 
                status: 'completed',
                completed_at: new Date().toISOString()
              })
              .eq('id', execution.id);
            
            return;
          }

          console.log(`✅ Step ${currentStep + 1} completed, continuing to next step`);

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