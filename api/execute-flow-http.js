import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Configure maximum duration for this function
export const maxDuration = 800; // 13+ minutes (Fluid Compute)

// Process automation steps using HTTP requests to agents
async function processAutomationStepsWithHTTP(executionId, threadId, automationId, userId, steps, projectContext) {
  console.log('🔄 Processing automation steps with HTTP system:', { executionId, stepsCount: steps.length });
  
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

      // Send step to agent via HTTP request
      const agentPayload = {
        // Agent2 specific fields
        "Output": step.content, // The step content
        "Error": null,
        "Thread Id": threadId,
        "Automation Id": automationId,
        "User Id": userId,
        "Execution Id": executionId,
        // Additional context
        "ProjectContext": projectContext,
        "StepNumber": i + 1,
        "TotalSteps": steps.length,
        "Timestamp": new Date().toISOString()
      };

      // Add thinking indicator for Agent 2
      const thinkingMessage = {
        id: 'thinking-agent2-' + Date.now() + '-' + (i + 1),
        thread_id: threadId,
        user_id: userId,
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

      console.log('🌐 Sending step to agent via HTTP...');
      console.log('📋 Agent payload:', JSON.stringify(agentPayload, null, 2));
      
      // Send to agent webhook (this will trigger agent processing)
      const agentResponse = await fetch('https://novusautomations.net/webhook/a13a060a-62be-4ae8-a1f3-6503d23032bb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Wispix-Automation-Platform/1.0',
        },
        body: JSON.stringify(agentPayload)
      });

      console.log('📊 Agent response status:', agentResponse.status);
      
      if (!agentResponse.ok) {
        throw new Error(`Agent webhook failed with status ${agentResponse.status}`);
      }

      // The agent will now POST back to our agent2-response endpoint
      // We need to wait for that response or implement a polling mechanism
      console.log('✅ Step sent to agent, waiting for response via agent2-response endpoint...');
      
      // For now, simulate a successful step
      const stepResult = {
        step_number: i + 1,
        content: step.content,
        response: 'Sent to agent for processing',
        timestamp: new Date().toISOString(),
        status: 'pending',
        error: null
      };
      
      results.push(stepResult);
      
      // Wait a bit before next step
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Error processing step ${i + 1}:`, error);
      
      const stepResult = {
        step_number: i + 1,
        content: step.content,
        response: null,
        timestamp: new Date().toISOString(),
        status: 'failed',
        error: error.message
      };
      
      results.push(stepResult);
      
      // Mark execution as failed
      await supabase
        .from('flow_executions')
        .update({ 
          status: 'failed',
          error_message: `Step ${i + 1} failed: ${error.message}`,
          completed_at: new Date().toISOString()
        })
        .eq('id', executionId);
      
      return results;
    }
  }
  
  // Mark execution as completed
  await supabase
    .from('flow_executions')
    .update({ 
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('id', executionId);
  
  console.log('✅ All steps processed successfully');
  return results;
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
    console.log('🚀 HTTP-based flow execution started');
    
    const { 
      thread_id, 
      user_id, 
      steps, 
      project_context = '',
      automation_id 
    } = req.body;

    if (!thread_id || !user_id || !steps || !Array.isArray(steps)) {
      return res.status(400).json({ 
        error: 'Missing required fields: thread_id, user_id, and steps are required' 
      });
    }

    // Create execution record
    const { data: execution, error: execError } = await supabase
      .from('flow_executions')
      .insert({
        thread_id,
        user_id,
        status: 'running',
        current_step: 0,
        steps: steps,
        results: [],
        project_context: project_context
      })
      .select()
      .single();

    if (execError) {
      console.error('❌ Error creating execution:', execError);
      return res.status(500).json({ 
        error: 'Failed to create execution',
        details: execError.message 
      });
    }

    console.log('✅ Execution created:', execution.id);

    // Process steps asynchronously
    processAutomationStepsWithHTTP(
      execution.id, 
      thread_id, 
      automation_id, 
      user_id, 
      steps, 
      project_context
    ).catch(error => {
      console.error('❌ Error in async step processing:', error);
    });

    return res.status(200).json({
      success: true,
      message: 'HTTP-based flow execution started',
      execution_id: execution.id,
      thread_id: thread_id,
      steps_count: steps.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ HTTP flow execution failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}