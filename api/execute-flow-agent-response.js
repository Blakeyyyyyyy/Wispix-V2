import { supabase } from '../src/lib/supabase-backend.js';

// Configure maximum duration for this function
export const maxDuration = 800; // 13+ minutes (Fluid Compute)

// Process automation steps using agent response endpoints
async function processAutomationStepsWithAgentResponse(executionId, threadId, automationId, userId, steps, projectContext) {
  console.log('🔄 Processing automation steps with agent response system:', { executionId, stepsCount: steps.length });
  
  const results = [];
  
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    console.log(`🔄 Processing step ${i + 1}/${steps.length}:`, step.content);
    
    try {
      // Update current step
      await supabase
        .from('flow_executions')
        .update({ 
          current_step: i + 1,
          results: results
        })
        .eq('id', executionId);

      // Send step to agent via webhook (for processing)
      const webhookPayload = {
        thread_id: threadId,
        automation_id: automationId,
        user_id: userId,
        step_content: step.content,
        step_number: i + 1,
        total_steps: steps.length,
        project_context: projectContext,
        execution_id: executionId,
        timestamp: new Date().toISOString(),
        // Add response endpoint for agent to POST back to
        response_endpoint: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api/agent2-response` : 'https://your-domain.vercel.app/api/agent2-response'
      };

      console.log('🌐 Sending step to agent via webhook...');
      console.log('📋 Webhook payload:', JSON.stringify(webhookPayload, null, 2));
      
      // Send to agent webhook (this will trigger agent processing)
      const agentResponse = await fetch('https://novusautomations.net/webhook/a13a060a-62be-4ae8-a1f3-6503d23032bb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Wispix-Automation-Platform/1.0',
        },
        body: JSON.stringify(webhookPayload),
      });

      if (!agentResponse.ok) {
        throw new Error(`Agent webhook responded with status ${agentResponse.status}`);
      }

      console.log(`✅ Step ${i + 1} sent to agent, waiting for response...`);

      // Wait for agent response via polling
      const responseText = await waitForAgentResponse(executionId, i + 1, 300000); // 5 minute timeout
      
      console.log(`✅ Step ${i + 1} completed:`, responseText.substring(0, 100) + '...');

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

// Wait for agent response by polling the execution
async function waitForAgentResponse(executionId, stepNumber, timeoutMs = 300000) {
  const startTime = Date.now();
  const pollInterval = 2000; // 2 seconds
  
  console.log(`⏳ Waiting for agent response for step ${stepNumber}...`);
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      // Get current execution
      const { data: execution, error } = await supabase
        .from('flow_executions')
        .select('*')
        .eq('id', executionId)
        .single();

      if (error) {
        console.error('❌ Error fetching execution:', error);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        continue;
      }

      if (!execution) {
        throw new Error('Execution not found');
      }

      // Check if step has been completed
      const results = execution.results || [];
      const stepResult = results[stepNumber - 1];
      
      if (stepResult && stepResult.response) {
        console.log(`✅ Agent response received for step ${stepNumber}`);
        return stepResult.response;
      }

      // Check if execution failed
      if (execution.status === 'failed') {
        throw new Error(execution.error_message || 'Execution failed');
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
    } catch (error) {
      if (error.message.includes('Execution failed') || error.message.includes('not found')) {
        throw error;
      }
      console.error('❌ Error polling for agent response:', error);
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }
  
  throw new Error(`Timeout waiting for agent response after ${timeoutMs/1000} seconds`);
}

export default async (req, res) => {
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

    if (!executionId || !threadId || !steps) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log('🚀 Starting agent response execution:', { executionId, threadId, stepsCount: steps.length });

    // Process steps using agent response system
    await processAutomationStepsWithAgentResponse(executionId, threadId, automationId, userId, steps, projectContext);

    return res.status(200).json({
      success: true,
      message: 'Execution started with agent response system',
      executionId: executionId,
      threadId: threadId
    });

  } catch (error) {
    console.error('❌ Agent response execution failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}