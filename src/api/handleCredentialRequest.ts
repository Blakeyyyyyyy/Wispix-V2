// Alternative approach - handle credential requests directly in the frontend
import { supabase } from '../lib/supabase';

export interface CredentialRequest {
  user_id: string;
  thread_id: string;
  platform: string;
  requested_credentials: string[];
  credential_name?: string;
}

export async function handleCredentialRequest(request: CredentialRequest) {
  try {
    // Validate required fields
    if (!request.user_id || !request.thread_id || !request.platform || !request.requested_credentials) {
      throw new Error('Missing required fields');
    }

    // Store the credential request in chat messages as a special type
    const { data, error } = await supabase
      .from('chat_messages')
      .insert([
        {
          thread_id: request.thread_id,
          user_id: request.user_id,
          content: JSON.stringify({
            type: 'credential_request',
            platform: request.platform,
            requested_credentials: request.requested_credentials,
            credential_name: request.credential_name || request.platform.toLowerCase()
          }),
          sender_type: 'agent1',
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      message: 'Credential request created successfully',
      credential_id: data.id
    };
  } catch (error) {
    console.error('Error handling credential request:', error);
    return {
      success: false,
      message: 'Failed to process credential request'
    };
  }
}