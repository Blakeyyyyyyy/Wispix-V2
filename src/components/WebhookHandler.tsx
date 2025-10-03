import React, { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export function WebhookHandler() {
  const { user } = useAuth();

  useEffect(() => {
    const handleCredentialRequest = async (requestData: any) => {
      try {
        // Validate required fields
        if (!requestData.user_id || !requestData.thread_id || !requestData.platform || !requestData.requested_credentials) {
          return {
            success: false,
            message: 'Missing required fields: user_id, thread_id, platform, requested_credentials'
          };
        }

        // Store the credential request in chat messages as a special type
        const { data, error } = await supabase
          .from('chat_messages')
          .insert([
            {
              thread_id: requestData.thread_id,
              user_id: requestData.user_id,
              content: JSON.stringify({
                type: 'credential_request',
                platform: requestData.platform,
                requested_credentials: requestData.requested_credentials,
                credential_name: requestData.credential_name || requestData.platform.toLowerCase()
              }),
              sender_type: 'agent1',
            },
          ])
          .select()
          .single();

        if (error) {
          console.error('Database error:', error);
          return {
            success: false,
            message: 'Failed to create credential request'
          };
        }

        return {
          success: true,
          message: 'Credential request created successfully',
          credential_id: data.id
        };

      } catch (error) {
        console.error('Error handling credential request:', error);
        return {
          success: false,
          message: 'Internal server error'
        };
      }
    };

    // Handle postMessage from webhook endpoint
    const handleMessage = async (event: MessageEvent) => {
      if (event.data.type === 'credential_request') {
        try {
          const result = await handleCredentialRequest(event.data.payload);
          
          // Send response back to the webhook endpoint
          event.source?.postMessage({
            type: 'credential_response',
            requestId: event.data.requestId,
            result
          }, event.origin);
          
        } catch (error) {
          event.source?.postMessage({
            type: 'credential_response',
            requestId: event.data.requestId,
            result: {
              success: false,
              message: 'Error processing request'
            }
          }, event.origin);
        }
      }
    };

    // Listen for messages from webhook endpoint
    window.addEventListener('message', handleMessage);

    // Also expose global function for direct calls
    (window as any).handleCredentialRequest = handleCredentialRequest;

    return () => {
      window.removeEventListener('message', handleMessage);
      delete (window as any).handleCredentialRequest;
    };
  }, [user]);

  return null;
}