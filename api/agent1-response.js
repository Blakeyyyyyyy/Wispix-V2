import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Configure maximum duration for this function
export const maxDuration = 800; // 13+ minutes (Fluid Compute)

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
    console.log('🤖 Agent1 response received:', new Date().toISOString());
    console.log('📥 RAW REQUEST BODY:', JSON.stringify(req.body, null, 2));
    
    const {
      thread_id, 
      execution_id, 
      user_id, 
      content, 
      message, // Alternative field name
      response, // Alternative field name
      output, // Alternative field name
      // Agent1 specific fields
      "Output": agentOutput,
      "Thread Id": threadIdWithSpace,
      "User Id": userIdWithSpace,
      "Automation Id": automationIdWithSpace,
      "Project Context": projectContextSpace, // Handle space format
      "ProjectContext": projectContext,
      "RequestCredentials": requestCredentials,
      "FlowChange": flowChange,
      // Steps - handle both formats: "Step1" and "Step 1"
      "Step1": step1, "Step2": step2, "Step3": step3, "Step4": step4, "Step5": step5,
      "Step6": step6, "Step7": step7, "Step8": step8, "Step9": step9, "Step10": step10,
      "Step11": step11, "Step12": step12, "Step13": step13, "Step14": step14, "Step15": step15,
      "Step16": step16, "Step17": step17, "Step18": step18, "Step19": step19, "Step20": step20,
      // Alternative step format with spaces
      "Step 1": step1Space, "Step 2": step2Space, "Step 3": step3Space, "Step 4": step4Space, "Step 5": step5Space,
      "Step 6": step6Space, "Step 7": step7Space, "Step 8": step8Space, "Step 9": step9Space, "Step 10": step10Space,
      "Step 11": step11Space, "Step 12": step12Space, "Step 13": step13Space, "Step 14": step14Space, "Step 15": step15Space,
      "Step 16": step16Space, "Step 17": step17Space, "Step 18": step18Space, "Step 19": step19Space, "Step 20": step20Space,
      // Credentials
      "Platform1": platform1, "CredentialName1": credentialName1,
      "Platform2": platform2, "CredentialName2": credentialName2,
      "Platform3": platform3, "CredentialName3": credentialName3,
      "Platform4": platform4, "CredentialName4": credentialName4,
      metadata = {} 
    } = req.body;

    // Handle multiple field name variations - prioritize Agent1 specific fields
    const messageContent = agentOutput || content || message || response || output;
    
    // Use Agent1 specific field names with fallbacks - prioritize space format
    const finalThreadId = threadIdWithSpace || thread_id;
    const finalUserId = userIdWithSpace || user_id;
    const finalAutomationId = automationIdWithSpace || execution_id;
    const finalProjectContext = projectContextSpace || projectContext;
    
    // Convert string values to proper types
    const requestCredentialsBool = requestCredentials === "1234" || requestCredentials === "true" || requestCredentials === true;
    const flowChangeBool = flowChange === "sadf" || flowChange === "true" || flowChange === true;
    
    console.log('🔧 Type conversion:', {
      requestCredentials: requestCredentials,
      requestCredentialsBool: requestCredentialsBool,
      flowChange: flowChange,
      flowChangeBool: flowChangeBool
    });

    // Validate required fields
    if (!messageContent) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required field: content/message/response/output is required',
        received_fields: Object.keys(req.body || {}),
        expected_fields: ['content (or message/response/output)'],
        note: 'thread_id and user_id are required for proper message routing'
      });
    }

    // Validate thread_id and user_id
    if (!finalThreadId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: thread_id',
        received_fields: Object.keys(req.body || {}),
        expected_fields: ['thread_id (or "Thread Id")'],
        note: 'thread_id is required to route the message to the correct automation thread'
      });
    }

    if (!finalUserId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: user_id',
        received_fields: Object.keys(req.body || {}),
        expected_fields: ['user_id (or "User Id")'],
        note: 'user_id is required to associate the message with the correct user'
      });
    }

    console.log('📋 Agent1 response data:', {
      thread_id: finalThreadId,
      execution_id: finalAutomationId,
      user_id: finalUserId,
      content: messageContent,
      content_length: messageContent ? messageContent.length : 0,
      platform_data: {
        platform1, credentialName1, platform2, credentialName2,
        platform3, credentialName3, platform4, credentialName4
      },
      agent1_specific: {
        output: agentOutput,
        projectContext: finalProjectContext,
        requestCredentials: requestCredentialsBool,
        flowChange: flowChangeBool,
        steps: { step1, step2, step3, step4, step5, step6, step7, step8, step9, step10,
                step11, step12, step13, step14, step15, step16, step17, step18, step19, step20 },
        credentials: {
          platform1, credentialName1, platform2, credentialName2,
          platform3, credentialName3, platform4, credentialName4
        }
      },
      original_fields: { content, message, response, output },
      metadata
    });

    // Process credential request if needed (now included in main message)
    if (requestCredentialsBool === true) {
      console.log('🔐 Processing credential request...');
      console.log('✅ Credential request will be included in main message');
    }

    // Extract steps - prioritize space format, fallback to no-space format
    const steps = [];
    for (let i = 1; i <= 20; i++) {
      const spaceFormat = req.body[`Step ${i}`];
      const noSpaceFormat = req.body[`Step${i}`];
      const stepContent = spaceFormat || noSpaceFormat;
      
      if (stepContent && stepContent.trim()) {
        steps.push({
          id: `step-${Date.now()}-${i}`,
          content: stepContent.trim(),
          order: i - 1
        });
      }
    }

    console.log('📝 Extracted steps:', steps.length);

    // Process flow creation if steps are present (regardless of FlowChange flag)
    if (steps.length > 0) {
      console.log('🔄 Processing flow creation with', steps.length, 'steps...');

      // Call the dedicated create-flow endpoint
      try {
        const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://project-cgvbn1hwy-chases-projects-b3818de8.vercel.app';
        const flowResponse = await fetch(`${baseUrl}/api/create-flow`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            thread_id: finalThreadId,
            user_id: finalUserId,
            project_context: finalProjectContext || '',
            steps: steps
          })
        });

        if (flowResponse.ok) {
          const flowResult = await flowResponse.json();
          console.log('✅ Flow created successfully via API:', flowResult);
        } else {
          const errorText = await flowResponse.text();
          console.error('❌ Flow creation API failed:', errorText);
          
          // Fallback to direct database update
          const { error: flowError } = await supabase
            .from('automation_flows')
            .upsert({
              thread_id: finalThreadId,
              user_id: finalUserId,
              steps: steps,
              project_context: finalProjectContext || ''
            });

          if (flowError) {
            console.error('❌ Fallback flow update failed:', flowError);
          } else {
            console.log('✅ Flow updated via fallback with', steps.length, 'steps');
          }
        }
      } catch (error) {
        console.error('❌ Flow creation API error:', error);
        
        // Fallback to direct database update
        const { error: flowError } = await supabase
          .from('automation_flows')
          .upsert({
            thread_id: finalThreadId,
            user_id: finalUserId,
            steps: steps,
            project_context: finalProjectContext || ''
          });

        if (flowError) {
          console.error('❌ Fallback flow update failed:', flowError);
        } else {
          console.log('✅ Flow updated via fallback with', steps.length, 'steps');
        }
      }
    }

    // Prepare the main response data
    const responseData = {
      success: true,
      message: 'Agent1 response processed successfully',
      message_id: 'agent1-' + Date.now(),
      thread_id: finalThreadId,
      execution_id: finalAutomationId,
      user_id: finalUserId,
      parsed_content: messageContent,
      agent1_data: {
        output: agentOutput,
        projectContext: finalProjectContext,
        requestCredentials: requestCredentialsBool,
        flowChange: flowChangeBool,
        steps_count: [step1, step2, step3, step4, step5, step6, step7, step8, step9, step10,
                     step11, step12, step13, step14, step15, step16, step17, step18, step19, step20]
                     .filter(step => step && step.trim()).length,
        // Include platform and credential data in nested credentials object
        credentials: {
          platform1, credentialName1, platform2, credentialName2,
          platform3, credentialName3, platform4, credentialName4
        },
        // Also include direct properties for backward compatibility
        platform1, credentialName1, platform2, credentialName2,
        platform3, credentialName3, platform4, credentialName4
      },
      timestamp: new Date().toISOString()
    };

    // If this is a credential request, include the credential data in the main message
    if (requestCredentialsBool === true) {
      responseData.credential_request = {
        type: 'credential_request',
        platform: platform1 || 'Unknown Platform',
        requested_credentials: {
          platform1, credentialName1, platform2, credentialName2,
          platform3, credentialName3, platform4, credentialName4
        },
        credential_name: credentialName1 || platform1?.toLowerCase() || 'credentials'
      };
    }

    // Insert regular chat message
    const { data: chatMessage, error: messageError } = await supabase
      .from('chat_messages')
      .insert([
        {
          thread_id: finalThreadId,
          user_id: finalUserId,
          content: JSON.stringify(responseData),
          sender_type: 'agent1',
        },
      ])
      .select()
      .single();

    if (messageError) {
      console.error('❌ Chat message insert failed:', messageError);
      return res.status(500).json({
        success: false,
        error: 'Failed to save message',
        details: messageError.message
      });
    }

    console.log('✅ Agent1 message saved:', chatMessage.id);
    
    return res.status(200).json({
      success: true,
      message: 'Agent1 response processed successfully',
      message_id: chatMessage.id,
      thread_id: finalThreadId,
      execution_id: finalAutomationId,
      user_id: finalUserId,
      parsed_content: messageContent,
      agent1_data: {
        output: agentOutput,
        projectContext: finalProjectContext,
        requestCredentials: requestCredentialsBool,
        flowChange: flowChangeBool,
        steps_count: [step1, step2, step3, step4, step5, step6, step7, step8, step9, step10,
                     step11, step12, step13, step14, step15, step16, step17, step18, step19, step20]
                     .filter(step => step && step.trim()).length,
        // Include all steps for flow generation
        Step1: step1, Step2: step2, Step3: step3, Step4: step4, Step5: step5,
        Step6: step6, Step7: step7, Step8: step8, Step9: step9, Step10: step10,
        Step11: step11, Step12: step12, Step13: step13, Step14: step14, Step15: step15,
        Step16: step16, Step17: step17, Step18: step18, Step19: step19, Step20: step20,
        // Include platform and credential data in nested credentials object
        credentials: {
          platform1, credentialName1, platform2, credentialName2,
          platform3, credentialName3, platform4, credentialName4
        },
        // Also include direct properties for backward compatibility
        platform1, credentialName1, platform2, credentialName2,
        platform3, credentialName3, platform4, credentialName4
      },
      processed_actions: {
        credential_request: requestCredentialsBool === true,
        flow_change: flowChangeBool === true
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Agent1 response processing failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}