// API functions for credential management
import { supabase } from '../lib/supabase';

export interface CredentialRequest {
  user_id: string;
  thread_id: string;
  platform: string;
  requested_credentials: string[];
  credential_name: string;
}

export interface CredentialResponse {
  success: boolean;
  message: string;
  credential_id?: string;
}

export async function handleCredentialRequest(request: CredentialRequest): Promise<CredentialResponse> {
  try {
    // Validate required fields
    if (!request.user_id || !request.thread_id || !request.platform || !request.requested_credentials) {
      return {
        success: false,
        message: 'Missing required fields'
      };
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
            credential_name: request.credential_name
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

export async function saveUserCredentials(
  userId: string,
  serviceName: string,
  credentials: Record<string, any>
): Promise<CredentialResponse> {
  try {
    console.log('🔧 saveUserCredentials called with:');
    console.log('👤 userId:', userId);
    console.log('🏷️ serviceName:', serviceName);
    console.log('🔑 credentials:', credentials);

    const { data, error } = await supabase
      .from('user_credentials')
      .upsert({
        user_id: userId,
        service_name: serviceName,
        credentials: credentials
      }, {
        onConflict: 'user_id,service_name'
      })
      .select()
      .single();

    console.log('📊 Supabase upsert result:');
    console.log('✅ data:', data);
    console.log('❌ error:', error);

    if (error) throw error;

    return {
      success: true,
      message: 'Credentials saved successfully',
      credential_id: data.id
    };
  } catch (error) {
    console.error('Error saving credentials:', error);
    return {
      success: false,
      message: 'Failed to save credentials'
    };
  }
}