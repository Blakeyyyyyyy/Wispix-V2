import { createClient } from '@supabase/supabase-js';
import { InternalAgent2 } from '../src/lib/agents/InternalAgent2.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

export const maxDuration = 800; // 13+ minutes (Fluid Compute)

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
    const { executionId, threadId, automationId, userId, steps, projectContext } = req.body;

    console.log('🚀 Tool-based execute-flow API called with:', {
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
          execution_thread_id: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating execution:', createError);
        return res.status(500).json({ error: 'Failed to create execution record' });
      }
      execution = newExecution;
    }

    // Start tool-based execution
    console.log('🚀 Starting tool-based execution...');
    
    // Mark as running
    await supabase
      .from('flow_executions')
      .update({ 
        status: 'running',
        started_at: new Date().toISOString()
      })
      .eq('id', execution.id);

    // Process steps with Internal Agent 2
    const agent2 = new InternalAgent2();
    const results = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      console.log(`🔄 Processing step ${i + 1}/${steps.length}:`, step.instruction);

      try {
        // Check if execution has been force stopped
        const { data: currentExecution } = await supabase
          .from('flow_executions')
          .select('status')
          .eq('id', execution.id)
          .single();

        if (currentExecution.status === 'cancelled') {
          console.log('🛑 Execution has been force stopped, aborting step processing');
          throw new Error('Execution was force stopped by user');
        }

        // Update current step
        await supabase
          .from('flow_executions')
          .update({ 
            current_step: i + 1,
            results: results
          })
          .eq('id', execution.id);

        // Execute step with Agent 2
        const stepResult = await agent2.executeStep({
          executionId: execution.id,
          automationId: automationId,
          userId: userId,
          step: {
            ...step,
            step_number: i + 1
          }
        });

        // Store step result
        const result = {
          step_number: i + 1,
          instruction: step.instruction,
          tool_id: step.tool_id,
          response: stepResult.summary,
          success: stepResult.success,
          error: stepResult.error,
          timestamp: new Date().toISOString(),
          status: stepResult.success ? 'completed' : 'failed'
        };
        
        results.push(result);

        // Add agent response to activity log
        await supabase
          .from('activity_logs')
          .insert({
            thread_id: threadId,
            user_id: userId,
            content: stepResult.summary,
            sender_type: 'agent2'
          });

        // If step failed, stop execution
        if (!stepResult.success) {
          await supabase
            .from('flow_executions')
            .update({ 
              status: 'failed',
              error_message: stepResult.error,
              completed_at: new Date().toISOString(),
              results: results
            })
            .eq('id', execution.id);
          
          return res.status(500).json({ 
            error: 'Step execution failed',
            details: stepResult.error,
            step: i + 1
          });
        }

      } catch (error) {
        console.error(`❌ Step ${i + 1} failed:`, error);
        
        const stepResult = {
          step_number: i + 1,
          instruction: step.instruction,
          tool_id: step.tool_id,
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
          .eq('id', execution.id);
        
        return res.status(500).json({ 
          error: 'Step execution failed',
          details: error.message,
          step: i + 1
        });
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
      .eq('id', execution.id);

    // Add completion message to activity log
    await supabase
      .from('activity_logs')
      .insert({
        thread_id: threadId,
        user_id: userId,
        content: `Automation completed! Executed ${steps.length} steps successfully.`,
        sender_type: 'system'
      });

    res.status(200).json({ 
      success: true, 
      message: 'Tool-based flow execution completed successfully',
      executionId: execution.id,
      results: results
    });

  } catch (error) {
    console.error('Error in tool-based flow execution:', error);
    res.status(500).json({ 
      error: 'Failed to execute tool-based flow',
      details: error.message 
    });
  }
}

