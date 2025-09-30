import { supabase } from './supabase';
import { encrypt, decrypt } from './encryption';

export interface Credentials {
  username?: string;
  password?: string;
  email?: string;
  appPassword?: string;
  token?: string;
  pat?: string;
  baseId?: string;
  tableId?: string;
  [key: string]: any; // Allow additional fields
}

export async function storeCredentials(
  userId: string,
  service: string,
  credentials: Credentials
): Promise<{ success: boolean; error?: string }> {
  try {
    const encryptedCreds = encrypt(JSON.stringify(credentials));
    
    const { error } = await supabase
      .from('credentials')
      .upsert({
        user_id: userId,
        provider: service.toLowerCase(),
        credentials: { encrypted: encryptedCreds },
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Failed to store credentials:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to store credentials' 
    };
  }
}

export async function getCredentials(
  userId: string,
  service: string
): Promise<{ success: boolean; credentials?: Credentials; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('credentials')
      .select('credentials')
      .eq('user_id', userId)
      .eq('provider', service.toLowerCase())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'No credentials found' };
      }
      throw error;
    }

    // Check if credentials are encrypted (new format) or plain (old format)
    if (data.credentials.encrypted) {
      const decryptedCreds = decrypt(data.credentials.encrypted);
      const credentials = JSON.parse(decryptedCreds);
      return { success: true, credentials };
    } else {
      // Handle old format credentials
      return { success: true, credentials: data.credentials };
    }
  } catch (error) {
    console.error('Failed to get credentials:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to retrieve credentials' 
    };
  }
}

export async function deleteCredentials(
  userId: string,
  service: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('credentials')
      .delete()
      .eq('user_id', userId)
      .eq('provider', service.toLowerCase());

    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Failed to delete credentials:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete credentials' 
    };
  }
}
