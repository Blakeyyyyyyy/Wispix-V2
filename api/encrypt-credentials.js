import { createClient } from '@supabase/supabase-js';
import { encryptCredentials } from '../src/lib/encryption.js';

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
    const { credentials, userId, platform, traceId } = req.body;
    
    console.log(`🔐 Encrypt Credentials API called [${traceId || 'no-trace'}]`);
    console.log('📋 Request body:', JSON.stringify(req.body, null, 2));

    // Validate required parameters
    if (!credentials || !userId || !platform) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        required: ['credentials', 'userId', 'platform'],
        received: {
          credentials: !!credentials,
          userId: !!userId,
          platform: !!platform
        }
      });
    }

    // Encrypt the credentials
    console.log('🔐 Encrypting credentials...');
    const encryptedCredentials = encryptCredentials(credentials);
    console.log('✅ Credentials encrypted successfully');

    // Store in database
    console.log('💾 Storing encrypted credentials in database...');
    const credentialData = {
      user_id: userId,
      platform: platform.toLowerCase(), // Ensure lowercase "airtable"
      service_name: `${platform.toLowerCase()}_credentials`, // "airtable_credentials"
      credentials: { encrypted: encryptedCredentials },
      encrypted: true
    };

    const { data, error } = await supabase
      .from('user_credentials')
      .upsert(credentialData, { onConflict: 'user_id,service_name' }) // Match on existing constraint
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to save credentials:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to save credentials',
        details: error.message
      });
    }

    console.log(`✅ Credentials saved successfully [${traceId || 'no-trace'}]:`, data.id);

    return res.status(200).json({
      success: true,
      message: 'Credentials encrypted and saved successfully',
      credential_id: data.id,
      encrypted: true
    });

  } catch (error) {
    console.error('❌ Encrypt Credentials API failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}
