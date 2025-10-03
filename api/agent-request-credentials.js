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
    console.log('🌐 API REQUEST LOG: /api/agent-request-credentials called');
    console.log('🔐 Agent Credential Request API called');
    console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
    console.log('🔐 Request headers:', JSON.stringify(req.headers, null, 2));

    const {
      thread_id,
      platform,
      credential_name,
      requested_credentials,
      message,
      // Alternative field names for flexibility
      threadId,
      platformName,
      credentialName,
      credentials,
      userMessage,
      // Agent schema fields (platform1, platform2, etc.)
      platform1, platform2, platform3, platform4, platform5,
      credentialname1, credentialname2, credentialname3, credentialname4, credentialname5
    } = req.body;

    // Parse agent schema (platform1, platform2, etc.)
    const agentPlatforms = [];
    const agentCredentials = [];
    
    for (let i = 1; i <= 5; i++) {
      const platformKey = `platform${i}`;
      const credentialKey = `credentialname${i}`;
      const platformValue = req.body[platformKey];
      const credentialValue = req.body[credentialKey];
      
      if (platformValue && platformValue.trim() && credentialValue && credentialValue.trim()) {
        agentPlatforms.push(platformValue.trim());
        agentCredentials.push(credentialValue.trim());
      }
    }

    console.log('🤖 Agent schema detected:', {
      platforms: agentPlatforms,
      credentials: agentCredentials,
      hasAgentSchema: agentPlatforms.length > 0
    });

    // Use agent schema if available, otherwise fall back to standard schema
    const finalThreadId = thread_id || threadId;
    const finalPlatform = agentPlatforms.length > 0 ? agentPlatforms[0] : (platform || platformName);
    const finalCredentialName = credential_name || credentialName || (agentPlatforms.length > 0 ? agentPlatforms[0].toLowerCase() : (platform || platformName)?.toLowerCase());
    const finalRequestedCredentials = agentCredentials.length > 0 ? agentCredentials : (requested_credentials || credentials || []);
    // Generate a default message if none provided
    const finalMessage = message || userMessage || `I need your ${finalPlatform} credentials to continue with the automation.`;

    console.log('🔍 Parsed parameters:', {
      threadId: finalThreadId,
      platform: finalPlatform,
      credentialName: finalCredentialName,
      requestedCredentials: finalRequestedCredentials,
      message: finalMessage,
      agentSchema: {
        platforms: agentPlatforms,
        credentials: agentCredentials
      }
    });

        // Validate required parameters
        if (!finalPlatform || !finalRequestedCredentials || !Array.isArray(finalRequestedCredentials)) {
          return res.status(400).json({
            success: false,
            error: 'Missing required parameters',
            required: ['platform', 'requested_credentials'],
            received: {
              platform: finalPlatform,
              requested_credentials: finalRequestedCredentials
            },
            note: 'thread_id is optional - will use most recent thread if not provided',
            agent_schema_detected: agentPlatforms.length > 0,
            agent_platforms: agentPlatforms,
            agent_credentials: agentCredentials,
          });
        }

    // Validate requested credentials array
    if (finalRequestedCredentials.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'requested_credentials must be a non-empty array',
        received: finalRequestedCredentials
      });
    }

    // Handle missing thread_id - get most recent thread
    let finalThreadIdToUse = finalThreadId;
    if (!finalThreadIdToUse) {
      console.log('🔍 No thread_id provided, getting most recent thread...');
      const { data: recentThread, error: recentThreadError } = await supabase
        .from('automation_threads')
        .select('id, user_id, name')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (recentThreadError || !recentThread) {
        console.error('❌ No threads found:', recentThreadError);
        return res.status(404).json({
          success: false,
          error: 'No automation threads found',
          details: 'Please create an automation first, or provide a thread_id',
          suggestion: 'Use the /api/agent1-response endpoint to create a thread first'
        });
      }

      finalThreadIdToUse = recentThread.id;
      console.log('✅ Using most recent thread:', recentThread.name, 'ID:', finalThreadIdToUse);
    }

    // Check if thread exists and get user_id
    const { data: thread, error: threadError } = await supabase
      .from('automation_threads')
      .select('id, user_id, name')
      .eq('id', finalThreadIdToUse)
      .single();

    if (threadError) {
      console.error('❌ Thread not found:', threadError);
      return res.status(404).json({
        success: false,
        error: 'Thread not found',
        details: threadError.message
      });
    }

        console.log('✅ Thread found:', thread.name, 'User:', thread.user_id);

        // Check for existing credential requests in the last 5 minutes to prevent duplicates
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data: existingRequests, error: existingError } = await supabase
          .from('chat_messages')
          .select('id, created_at, content')
          .eq('thread_id', finalThreadIdToUse)
          .eq('sender_type', 'agent1')
          .gte('created_at', fiveMinutesAgo)
          .order('created_at', { ascending: false });

        if (existingError) {
          console.error('❌ Error checking existing requests:', existingError);
        } else {
          // Check if any existing requests are credential requests
          const recentCredentialRequests = existingRequests.filter(msg => {
            try {
              const parsed = JSON.parse(msg.content);
              return parsed.type === 'credential_request';
            } catch {
              return false;
            }
          });

          if (recentCredentialRequests.length > 0) {
            console.log('⚠️  Duplicate credential request detected! Found', recentCredentialRequests.length, 'recent credential requests');
            console.log('📋 Recent requests:', recentCredentialRequests.map(req => ({
              id: req.id,
              created: req.created_at,
              content: JSON.parse(req.content)
            })));

            // Return the existing credential request instead of creating a new one
            const existingRequest = recentCredentialRequests[0];
            console.log('✅ Returning existing credential request:', existingRequest.id);

            return res.status(200).json({
              success: true,
              message: 'Credential request already exists (duplicate prevented)',
              credential_id: existingRequest.id,
              thread_id: finalThreadIdToUse,
              user_id: thread.user_id,
              platform: finalPlatform,
              credential_name: finalCredentialName,
              requested_credentials: finalRequestedCredentials,
              automation_id: req.body.automation_id || null,
              agent_schema: {
                platforms: agentPlatforms,
                credentials: agentCredentials
              },
              duplicate_prevented: true,
              timestamp: new Date().toISOString()
            });
          }
        }

            // Create credential request data structure compatible with existing system
            const credentialRequestData = {
              action: 'CREDENTIAL_REQUEST', // Changed from 'type' to 'action'
              platform: finalPlatform,
              credential_name: finalCredentialName,
              requested_credentials: finalRequestedCredentials,
              fields: finalRequestedCredentials, // Add fields array for consistency
              // Create numbered structure for frontend compatibility at root level
              ...agentPlatforms.reduce((acc, platform, index) => {
                acc[`Platform${index + 1}`] = platform;
                acc[`CredentialName${index + 1}`] = agentCredentials[index] || '';
                return acc;
              }, {}),
              // Agent schema compatibility - include structured data
              agent_schema: {
                platforms: agentPlatforms,
                credentials: agentCredentials
              },
              message: finalMessage
            };

    // If no agent schema was detected, create the numbered format from simple platform/credentials
    if (agentPlatforms.length === 0 && finalPlatform && finalRequestedCredentials.length > 0) {
      console.log('🔐 Creating numbered format from simple platform/credentials');
      credentialRequestData.Platform1 = finalPlatform;
      credentialRequestData.CredentialName1 = finalRequestedCredentials[0] || finalPlatform.toLowerCase();
      console.log('🔐 Created Platform1:', credentialRequestData.Platform1);
      console.log('🔐 Created CredentialName1:', credentialRequestData.CredentialName1);
    }

    console.log('💾 Creating credential request in chat messages...');

    // Store the credential request in chat messages
    const { data: chatMessage, error: messageError } = await supabase
      .from('chat_messages')
      .insert({
        thread_id: finalThreadIdToUse,
        user_id: thread.user_id,
        content: JSON.stringify(credentialRequestData),
        sender_type: 'agent1'
      })
      .select()
      .single();

    if (messageError) {
      console.error('❌ Failed to create chat message:', messageError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create credential request',
        details: messageError.message
      });
    }

    console.log('✅ Credential request created successfully:', chatMessage.id);

    // Real-time update is handled automatically by Supabase
    // The frontend subscribes to INSERT events on chat_messages table
    console.log('📡 Real-time update handled automatically by Supabase INSERT event');

    // Return success response
    const response = {
      success: true,
      message: 'Credential request created successfully',
      credential_id: chatMessage.id,
      thread_id: finalThreadIdToUse,
      user_id: thread.user_id,
      platform: finalPlatform,
      credential_name: finalCredentialName,
      requested_credentials: finalRequestedCredentials,
      // Include additional fields from agent
      automation_id: req.body.automation_id || null,
      agent_schema: {
        platforms: agentPlatforms,
        credentials: agentCredentials
      },
      timestamp: new Date().toISOString()
    };

    console.log('✅ Agent Credential Request API completed successfully');
    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ Agent Credential Request API failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}