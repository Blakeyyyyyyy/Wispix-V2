import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

export const maxDuration = 30; // 30 seconds

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
    console.log('🔄 Create Flow API called');
    console.log('📋 Request body:', JSON.stringify(req.body, null, 2));

    // More robust field extraction to handle various naming conventions
    const body = req.body || {};
    
    // Extract thread ID with multiple fallbacks
    const finalThreadId = body["Thread Id"] || body.thread_id || body.threadId;
    
    // Extract user ID with multiple fallbacks  
    const finalUserId = body["User Id"] || body.user_id || body.userId;
    
    // Extract project context with multiple fallbacks
    const finalProjectContext = body["Project Context"] || body.project_context || body.projectContext || '';
    
    // Extract steps - try array format first, then individual Step fields
    let finalSteps = body.steps || body.Steps || [];
    
    // If no steps array, build from individual Step fields
    if (finalSteps.length === 0) {
      const stepFields = [];
      for (let i = 1; i <= 20; i++) {
        const stepKey = `Step ${i}`;
        const stepValue = body[stepKey];
        if (stepValue && stepValue.trim() !== '') {
          stepFields.push(stepValue.trim());
        }
      }
      
      finalSteps = stepFields.map((step, index) => ({
        id: `step-${Date.now()}-${index + 1}`,
        content: step,
        order: index
      }));
    }

    console.log('🔍 Parsed parameters:', {
      threadId: finalThreadId,
      userId: finalUserId,
      projectContext: finalProjectContext,
      stepsCount: finalSteps.length
    });

    // Validate required parameters
    if (!finalThreadId || !finalUserId) {
      return res.status(400).json({
        error: 'Missing required parameters',
        required: ['thread_id', 'user_id'],
        received: {
          thread_id: finalThreadId,
          user_id: finalUserId
        }
      });
    }

    // Validate steps
    if (!finalSteps || !Array.isArray(finalSteps) || finalSteps.length === 0) {
      return res.status(400).json({
        error: 'Steps are required and must be a non-empty array',
        received: finalSteps
      });
    }

    // Process steps to ensure proper format
    const processedSteps = finalSteps
      .filter(step => step && (step.content || step.trim()))
      .map((step, index) => ({
        id: step.id || `step-${Date.now()}-${index}`,
        content: step.content || step.trim(),
        order: step.order !== undefined ? step.order : index
      }));

    console.log('📝 Processed steps:', processedSteps.length);

    // Check if thread exists and user has access
    const { data: thread, error: threadError } = await supabase
      .from('automation_threads')
      .select('id, user_id, name, enabled')
      .eq('id', finalThreadId)
      .eq('user_id', finalUserId)
      .single();

    if (threadError) {
      console.error('❌ Thread not found or access denied:', threadError);
      return res.status(404).json({
        error: 'Thread not found or access denied',
        details: threadError.message
      });
    }

    console.log('✅ Thread found:', thread.name);

    // Create or update the flow
    const flowData = {
      thread_id: finalThreadId,
      user_id: finalUserId,
      steps: processedSteps,
      project_context: finalProjectContext
    };

    console.log('💾 Saving flow to database...');
    const { data: flow, error: flowError } = await supabase
      .from('automation_flows')
      .upsert(flowData, {
        onConflict: 'thread_id'
      })
      .select()
      .single();

    if (flowError) {
      console.error('❌ Flow save failed:', flowError);
      return res.status(500).json({
        error: 'Failed to save flow',
        details: flowError.message
      });
    }

    console.log('✅ Flow saved successfully:', flow.id);

    // Create a chat message to notify the user
    const chatMessage = {
      id: `flow-created-${Date.now()}`,
      thread_id: finalThreadId,
      user_id: finalUserId,
      content: `Flow created with ${processedSteps.length} steps: ${finalProjectContext}`,
      sender_type: 'system'
    };

    const { error: messageError } = await supabase
      .from('chat_messages')
      .insert(chatMessage);

    if (messageError) {
      console.error('❌ Failed to create chat message:', messageError);
      // Don't fail the request for this
    } else {
      console.log('✅ Chat message created');
    }

    // Send real-time update to frontend
    console.log('📡 Sending real-time update...');
    
    // Use Supabase real-time to notify the frontend
    const { error: realtimeError } = await supabase
      .from('automation_flows')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', flow.id);

    if (realtimeError) {
      console.error('❌ Real-time update failed:', realtimeError);
    } else {
      console.log('✅ Real-time update sent');
    }

    // Return success response
    const response = {
      success: true,
      message: 'Flow created successfully',
      flow_id: flow.id,
      thread_id: finalThreadId,
      user_id: finalUserId,
      steps_count: processedSteps.length,
      project_context: finalProjectContext,
      steps: processedSteps,
      timestamp: new Date().toISOString()
    };

    console.log('✅ Create Flow API completed successfully');
    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ Create Flow API failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}