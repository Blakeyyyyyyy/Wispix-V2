import React, { useState, useEffect } from 'react';
import { Key, Lock, Save, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

type SubmittedPayload = {
  platform: string;
  service_name: string;
  credential_id: string;
  traceId: string;
};

interface CredentialFormProps {
  credentialData: any;
  threadId: string;
  userId: string;
  onCredentialSubmitted: (payload: SubmittedPayload) => Promise<void> | void;
}

// Define field configurations for different credential types
const CREDENTIAL_FIELDS: Record<string, { label: string; type: string; placeholder: string }> = {
  client_id: {
    label: 'Client ID',
    type: 'text',
    placeholder: 'Enter your OAuth Client ID (e.g., 123456789.apps.googleusercontent.com)'
  },
  client_secret: {
    label: 'Client Secret',
    type: 'password',
    placeholder: 'Enter your OAuth Client Secret'
  },
  refresh_token: {
    label: 'Refresh Token',
    type: 'password',
    placeholder: 'Enter your OAuth Refresh Token (starts with 1//)'
  },
  api_key: {
    label: 'API Key',
    type: 'password',
    placeholder: 'Enter your API key'
  },
  access_token: {
    label: 'Access Token',
    type: 'password',
    placeholder: 'Enter your access token'
  },
  bot_token: {
    label: 'Bot Token',
    type: 'password',
    placeholder: 'Enter your bot token (starts with xoxb-)'
  },
  app_token: {
    label: 'App Token',
    type: 'password',
    placeholder: 'Enter your app token (starts with xapp-)'
  },
  token: {
    label: 'Token',
    type: 'password',
    placeholder: 'Enter your token'
  },
  integration_token: {
    label: 'Integration Token',
    type: 'password',
    placeholder: 'Enter your integration token (starts with secret_)'
  },
  base_id: {
    label: 'Base ID',
    type: 'text',
    placeholder: 'Enter your base ID (starts with app)'
  },
  'Base ID': {
    label: 'Base ID',
    type: 'text',
    placeholder: 'Enter your base ID (starts with app)'
  },
  'Table Name': {
    label: 'Table Name',
    type: 'text',
    placeholder: 'Enter your table name'
  },
  username: {
    label: 'Username',
    type: 'text',
    placeholder: 'Enter your username'
  },
  password: {
    label: 'Password',
    type: 'password',
    placeholder: 'Enter your password'
  },
  email: {
    label: 'Email',
    type: 'email',
    placeholder: 'Enter your email address'
  }
};

export function CredentialForm({
  credentialData,
  threadId,
  userId,
  onCredentialSubmitted
}: CredentialFormProps) {
  const traceIdRef = React.useRef<string>(typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));
  // Parse platforms from credential data
  const platforms = React.useMemo(() => {
    console.log('🔐 CredentialForm - Raw credentialData received:', credentialData);
    console.log('🔐 CredentialForm - credentialData type:', typeof credentialData);
    console.log('🔐 CredentialForm - credentialData keys:', Object.keys(credentialData || {}));
    
    const platformList: Array<{
      platform: string;
      credentialName: string;
      requestedFields: string[];
    }> = [];
    
    // Parse numbered platform/credential pairs (Platform1, Platform2, etc.)
    const platformGroups: Record<string, {
      platform: string;
      requestedFields: string[];
    }> = {};
    
    for (let i = 1; i <= 10; i++) {
      const platformKey = `Platform${i}`;
      const credentialKey = `CredentialName${i}`;
      
      const platformValue = credentialData[platformKey];
      const credentialValue = credentialData[credentialKey];
      
      console.log(`🔐 CredentialForm - Checking ${platformKey}: "${platformValue}", ${credentialKey}: "${credentialValue}"`);
      
      if (platformValue && platformValue.trim() !== '' && credentialValue && credentialValue.trim() !== '') {
        const platformName = platformValue.trim();
        const credentialName = credentialValue.trim();
        
        console.log(`🔐 CredentialForm - Processing ${platformKey}: "${platformName}", ${credentialKey}: "${credentialName}"`);
        
        // Group by platform name
        if (!platformGroups[platformName]) {
          platformGroups[platformName] = {
            platform: platformName,
            requestedFields: []
          };
        }
        
        // Use exact credential name from agent
        platformGroups[platformName].requestedFields.push(credentialName);
        console.log(`🔐 CredentialForm - Added field "${credentialName}" to platform "${platformName}"`);
      } else {
        console.log(`🔐 CredentialForm - Skipping ${platformKey} (empty or undefined)`);
      }
    }
    
    // Handle single platform case (Platform + RequestedCredentials)
    if (credentialData.Platform && !credentialData.Platform1) {
      const platformName = credentialData.Platform;
      const requestedFields = credentialData.RequestedCredentials || [];
      
      platformGroups[platformName] = {
        platform: platformName,
        requestedFields: requestedFields // Use exact names from agent
      };
    }
    
    // Convert grouped platforms to the expected format
    Object.values(platformGroups).forEach(group => {
      const uniqueFields = [...new Set(group.requestedFields)]; // Remove duplicates
      console.log(`🔐 CredentialForm - Final platform "${group.platform}" with fields:`, uniqueFields);
      
      platformList.push({
        platform: group.platform,
        credentialName: group.platform.toLowerCase(),
        requestedFields: uniqueFields
      });
    });
    
    console.log('🔐 CredentialForm - Final platforms list:', platformList);
    console.log('🔐 CredentialForm - Platform count:', platformList.length);
    if (platformList.length === 0) {
      console.log('🔐 CredentialForm - NO PLATFORMS FOUND - This is the problem!');
    }
    return platformList;
  }, [credentialData]);

  // Initialize state for all platform credentials
  const [credentials, setCredentials] = useState<Record<string, Record<string, string>>>(() => {
    const initial: Record<string, Record<string, string>> = {};
    platforms.forEach(({ platform, credentialName, requestedFields }) => {
      initial[credentialName] = { platform: platform };
      requestedFields.forEach(field => {
        initial[credentialName][field] = '';
      });
    });
    return initial;
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [existingCredentials, setExistingCredentials] = useState<Record<string, string>>({});

  // Check if credentials already exist for this request and load them
  useEffect(() => {
    const checkExistingCredentials = async () => {
      if (!userId || platforms.length === 0) {
        setCheckingExisting(false);
        return;
      }

      try {
        const existingCreds: Record<string, string> = {};
        let hasAnyCredentials = false;
        
        // Load existing credentials for all requested fields
        for (const { platform, requestedFields } of platforms) {
          for (const field of requestedFields) {
            // Create the same safe service name used for storage
            const safeFieldName = field.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            const serviceName = `${platform.toLowerCase()}_${safeFieldName}`;
            
            const { data, error } = await supabase
              .from('user_credentials')
              .select('credentials')
              .eq('user_id', userId)
              .eq('service_name', serviceName)
              .maybeSingle();

            if (data && data.credentials?.credential_value) {
              const key = `${platform.toLowerCase()}_${field}`;
              existingCreds[key] = data.credentials.credential_value;
              hasAnyCredentials = true;
            }
          }
        }

        setExistingCredentials(existingCreds);
        
        // Pre-fill form with existing credentials
        if (hasAnyCredentials) {
          setCredentials(prev => {
            const updated = { ...prev };
            platforms.forEach(({ platform, credentialName, requestedFields }) => {
              requestedFields.forEach(field => {
                const key = `${platform.toLowerCase()}_${field}`;
                if (existingCreds[key]) {
                  updated[credentialName] = {
                    ...updated[credentialName],
                    [field]: existingCreds[key]
                  };
                }
              });
            });
            return updated;
          });
        }
      } catch (error) {
        console.error('Error checking existing credentials:', error);
      } finally {
        setCheckingExisting(false);
      }
    };

    checkExistingCredentials();
  }, [userId, platforms]);

  const handleCredentialChange = (credentialName: string, field: string, value: string) => {
    setCredentials(prev => ({
      ...prev,
      [credentialName]: { ...prev[credentialName], [field]: value }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate user authentication before proceeding
    if (!userId) {
      const errorMsg = 'User not authenticated. Please refresh the page and try again.';
      console.error('CredentialForm - Save failed: User ID is undefined');
      setError(errorMsg);
      return;
    }
    
    setSaving(true);
    setError(null);

    console.log('CredentialForm - Starting save with user ID:', userId);
    console.log('CredentialForm - Platforms to save:', platforms);

    // Validate all fields are filled
    const emptyCredentials = platforms.filter(({ credentialName, requestedFields }) => 
      requestedFields.some(field => !credentials[credentialName]?.[field]?.trim())
    );
    if (emptyCredentials.length > 0) {
      setError(`Please fill in all required credentials`);
      setSaving(false);
      return;
    }

    try {
      // Save credentials with encryption
      for (const { platform, credentialName, requestedFields } of platforms) {
        // Collect all credentials for this platform
        const platformCredentials: Record<string, string> = {};
        
        for (const field of requestedFields) {
          const credentialValue = credentials[credentialName]?.[field];
          if (credentialValue?.trim()) {
            platformCredentials[field] = credentialValue;
          }
        }
        
        if (Object.keys(platformCredentials).length > 0) {
          console.log(`CredentialForm - Saving credentials for ${platform}:`, Object.keys(platformCredentials));
          
          // Call backend encryption API
          console.log('CredentialForm - Calling backend encryption API...');
          const response = await fetch('/api/encrypt-credentials', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              credentials: platformCredentials,
              userId: userId,
              platform: platform,
              traceId: traceIdRef.current
            })
          });
          
          const result = await response.json();
          console.log('CredentialForm - Encryption API response:', result);
          
          if (!result.success) {
            throw new Error(result.error || 'Encryption failed');
          }
          
          console.log('CredentialForm - Credentials encrypted and saved successfully');
        }
      }
      
      console.log('CredentialForm - All credentials saved successfully!');
      
      // Show success message briefly
      setSaved(true);
      
      // Hide form after successful submission
      setTimeout(() => {
        setIsSubmitted(true);
      }, 2000); // Show success message for 2 seconds before hiding
      
      // Send structured event on user's behalf
      const platformName = (platforms?.[0]?.platform || '').toLowerCase();
      if (platformName) {
        await onCredentialSubmitted?.({
          platform: platformName,
          service_name: `${platformName}_credentials`,
          credential_id: 'saved', // We don't have the actual ID from the current API
          traceId: traceIdRef.current
        });
      }
        
    } catch (err) {
      console.error('CredentialForm - Error during save:', err);
      setError(`Failed to save credentials: ${err}`);
    } finally {
      setSaving(false);
    }
  };

  const getFieldConfig = (field: string) => {
    // Use exact field name from agent, but provide smart defaults
    const lowerField = field.toLowerCase();
    
    // Determine input type based on field name
    let inputType = 'password'; // Default to password for security
    if (lowerField.includes('email') || lowerField.includes('username')) {
      inputType = 'text';
    } else if (lowerField.includes('id') && !lowerField.includes('secret') && !lowerField.includes('token')) {
      inputType = 'text';
    }
    
    // Smart label mapping for better UX
    let label = field;
    if (lowerField === 'api_key' || lowerField === 'airtable_pat') {
      label = 'Personal Access Token';
    } else if (lowerField === 'token' || lowerField === 'asana_token') {
      label = 'Personal Access Token';
    } else if (lowerField === 'webhook_url') {
      label = 'Webhook URL';
    } else if (lowerField === 'api_secret') {
      label = 'API Secret';
    }
    
    return {
      label: label,
      type: inputType,
      placeholder: `Enter your ${label.toLowerCase()}`
    };
  };

  // Show loading state while checking existing credentials
  if (checkingExisting) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full shadow-glow">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-500"></div>
          <span className="ml-2 text-gray-300">Loading credentials...</span>
        </div>
      </div>
    );
  }

  // Hide form after successful submission
  if (isSubmitted) {
    return null;
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full shadow-glow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Lock className="w-5 h-5 text-cyan-500 mr-2" />
          <h3 className="font-medium text-gray-100">
            Credentials Required
          </h3>
        </div>
      </div>

      <p className="text-sm text-slate-400 mb-4">
        Please provide the following credentials to continue with the Wispix automation:
      </p>

      {saved && (
        <div className="bg-green-900/20 border border-green-700 rounded-xl p-3 mb-4">
          <p className="text-green-300 text-sm flex items-center">
            <Save className="w-4 h-4 mr-2" />
            Credentials updated successfully! You can modify them below if needed.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {platforms.map(({ platform, credentialName, requestedFields }) => (
          <div key={credentialName} className="space-y-3">
            <h4 className="text-sm font-medium text-cyan-400">{platform}</h4>
            {requestedFields.map(field => {
              const fieldConfig = getFieldConfig(field);
              console.log(`🔐 CredentialForm - Rendering field "${field}" with config:`, fieldConfig);
              return (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-200 mb-1">
                    {fieldConfig.label}
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={fieldConfig.type}
                      value={credentials[credentialName]?.[field] || ''}
                      onChange={(e) => handleCredentialChange(credentialName, field, e.target.value)}
                      required
                      className="w-full pl-10 pr-3 py-3 border border-gray-600 bg-gray-800 text-gray-100 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 focus:shadow-glow text-sm placeholder-gray-400 transition-all duration-300"
                      placeholder={fieldConfig.placeholder}
                    />
                  </div>
                </div>
              );
            })}
            </div>
        ))}

        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-xl p-3">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-cyan-600 text-white py-3 px-4 rounded-xl hover:bg-cyan-700 hover:shadow-glow focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {Object.keys(existingCredentials).length > 0 ? 'Update Credentials' : 'Save Credentials'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}