import React, { useState, FormEvent } from 'react';
import { createAgent } from '../services/api';
import { CredentialForm } from './CredentialForm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  type?: 'credential_request';
  service?: string;
  fields?: string[];
  render_inputs?: boolean;
}

interface CredentialRequirement {
  service: string;
  fields: string[];
  message: string;
  instructions: string;
}

export const AgentBuilder: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isBuilding, setIsBuilding] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [deployedUrl, setDeployedUrl] = useState('');
  const [error, setError] = useState('');
  const [credentialRequirement, setCredentialRequirement] = useState<CredentialRequirement | null>(null);
  const [tempCredentials, setTempCredentials] = useState<Record<string, string>>({});
  const [pendingCredentialService, setPendingCredentialService] = useState<string | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState<string>('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isBuilding) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsBuilding(true);
    setError('');
    setCurrentResponse('');
    setDeployedUrl('');
    setCredentialRequirement(null);
    setLastUserMessage(userMessage); // Store the last user message

    // Add user message
    const newMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(newMessages);

    try {
      const response = await createAgent(userMessage);

      // Check if this is a credential requirement (new format)
      if (response.type === 'credential_required') {
        console.log('Credential required, adding to chat');
        const credentialMessage: Message = {
          role: 'assistant',
          content: response.message,
          type: 'credential_request',
          service: response.service,
          fields: response.fields,
          render_inputs: true
        };
        setMessages(prev => [...prev, credentialMessage]);
        setPendingCredentialService(response.service);
        setIsBuilding(false);
        return;
      }

      // Check if this is a credential requirement (legacy format)
      if (response.isCredentialRequired) {
        setCredentialRequirement(response);
        setIsBuilding(false);
        return;
      }

      // Check if response is a fetch Response object
      if (response instanceof Response && !response.ok) {
        throw new Error('Failed to connect to backend');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantResponse = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              if (assistantResponse) {
                setMessages(prev => [...prev, { role: 'assistant', content: assistantResponse }]);
                setCurrentResponse('');
              }
              setIsBuilding(false);
              return;
            }

            try {
              const parsed = JSON.parse(data);
              
              if (parsed.type === 'thinking') {
                assistantResponse += parsed.message;
                setCurrentResponse(assistantResponse);
              } else if (parsed.type === 'deployment-success') {
                setDeployedUrl(parsed.metadata?.url || '');
              } else if (parsed.type === 'error') {
                setError(parsed.message);
              } else if (parsed.type === 'credential_request') {
                // Handle credential request from tool
                const credentialMessage: Message = {
                  role: 'assistant',
                  content: parsed.message,
                  type: 'credential_request',
                  service: parsed.service,
                  fields: parsed.fields,
                  render_inputs: true
                };
                setMessages(prev => [...prev, credentialMessage]);
                setPendingCredentialService(parsed.service);
                setIsBuilding(false);
                return;
              }
            } catch (e) {
              console.error('Parse error:', e);
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsBuilding(false);
    }
  };

  const handleCredentialSuccess = () => {
    setCredentialRequirement(null);
    // Retry the agent creation now that credentials are stored
    handleSubmit({ preventDefault: () => {} } as FormEvent);
  };

  const handleCredentialCancel = () => {
    setCredentialRequirement(null);
  };

  const submitCredentials = async (service: string, credentials: Record<string, string>) => {
    try {
      // Store credentials using the existing credential system
      const response = await fetch('http://localhost:3000/api/credentials/' + service, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',  // ADD THIS
        body: JSON.stringify({ credentials })
      });

      if (!response.ok) {
        throw new Error('Failed to store credentials');
      }

      const result = await response.json();

      // Add success message to chat
      const successMessage: Message = {
        role: 'assistant',
        content: `✅ Credentials for ${service} stored securely! Continuing with your request...`
      };
      setMessages(prev => [...prev, successMessage]);
      
      // Clear temporary state
      setTempCredentials({});
      setPendingCredentialService(null);
      
      // IMPORTANT: Automatically continue the original request
      if (lastUserMessage && result.shouldContinue) {
        console.log('🔄 [AUTO-CONTINUE] Re-sending original message:', lastUserMessage);
        setTimeout(async () => {
          // Trigger the agent creation flow with the original message
          setIsBuilding(true);
          setCurrentResponse('');
          setError('');
          
          try {
            const response = await createAgent(lastUserMessage);
            
            // Handle streaming response
            if (response instanceof Response) {
              const reader = response.body?.getReader();
              const decoder = new TextDecoder();
              let assistantResponse = '';

              while (reader) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    
                    if (data === '[DONE]') {
                      if (assistantResponse) {
                        setMessages(prev => [...prev, { role: 'assistant', content: assistantResponse }]);
                        setCurrentResponse('');
                      }
                      setIsBuilding(false);
                      return;
                    }

                    try {
                      const parsed = JSON.parse(data);
                      
                      if (parsed.type === 'thinking') {
                        assistantResponse += parsed.message;
                        setCurrentResponse(assistantResponse);
                      } else if (parsed.type === 'deployment-success') {
                        setDeployedUrl(parsed.metadata?.url || '');
                      } else if (parsed.type === 'error') {
                        setError(parsed.message);
                      }
                    } catch (e) {
                      console.error('Parse error:', e);
                    }
                  }
                }
              }
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to continue request');
            setIsBuilding(false);
          }
        }, 1000);
      }
      
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `❌ Failed to store credentials: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
        AI Agent Builder
      </h1>

      {/* Chat Messages */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-4 h-[500px] overflow-y-auto">
        {messages.length === 0 && !currentResponse && (
          <div className="text-center text-gray-500 mt-20">
            <p className="text-lg mb-2">Welcome! I'm Claude, your AI agent builder.</p>
            <p>Describe the automation you want to build, and I'll help you create and deploy it.</p>
            <p className="mt-4 text-sm text-blue-600">
              💡 Try: "Build an agent that monitors Stripe for failed payments and sends email alerts"
            </p>
          </div>
        )}
                    
        {messages.map((msg, idx) => (
          <div key={idx} className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
            <div className={`inline-block max-w-[80%] p-3 rounded-lg ${
              msg.role === 'user' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
              
              {/* Render credential inputs inline */}
              {msg.type === 'credential_request' && msg.render_inputs && msg.fields && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800 mb-3">
                    Please provide your {msg.service} credentials:
                  </p>
                  <div className="space-y-3">
                    {msg.fields.map((field) => {
                      const fieldName = typeof field === 'string' ? field : field.name;
                      const fieldLabel = typeof field === 'string' ? field : field.label;
                      const fieldType = typeof field === 'string' ? 'password' : field.type;
                      
                      return (
                      <div key={fieldName}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {fieldLabel || (fieldName === 'pat' ? 'Personal Access Token' : 
                           fieldName === 'api_key' ? 'API Key' :
                           fieldName === 'email' ? 'Email' :
                           fieldName === 'appPassword' ? 'App Password' :
                           fieldName.charAt(0).toUpperCase() + fieldName.slice(1))}
                        </label>
                        <input
                          type={fieldType === 'email' ? 'text' : fieldType || 'password'}
                          placeholder={`Enter your ${fieldLabel || fieldName}`}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onChange={(e) => setTempCredentials(prev => ({ ...prev, [fieldName]: e.target.value }))}
                        />
                      </div>
                      );
                    })}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => submitCredentials(msg.service!, tempCredentials)}
                        disabled={Object.keys(tempCredentials).length === 0 || Object.values(tempCredentials).some(v => !v.trim())}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Continue with these credentials
                      </button>
                      <button
                        onClick={() => {
                          setTempCredentials({});
                          setPendingCredentialService(null);
                        }}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {currentResponse && (
          <div className="text-left mb-4">
            <div className="inline-block max-w-[80%] p-3 rounded-lg bg-gray-100">
              <pre className="whitespace-pre-wrap font-sans">{currentResponse}</pre>
              <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1"></span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-700">Error: {error}</p>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={pendingCredentialService ? `Please provide ${pendingCredentialService} credentials above first` : "E.g., 'Build an agent that monitors Stripe for failed payments and sends email alerts'"}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900"
            disabled={isBuilding || pendingCredentialService !== null}
          />
          <button
            type="submit"
            disabled={isBuilding || !inputValue.trim() || pendingCredentialService !== null}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isBuilding ? 'Building...' : pendingCredentialService ? 'Waiting for credentials...' : 'Send'}
          </button>
        </div>
      </form>

      {/* Deployment Success */}
      {deployedUrl && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            ✅ Agent Successfully Deployed!
          </h3>
          <p className="text-gray-700 mb-2">Your agent is now live at:</p>
          <a 
            href={deployedUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline break-all"
          >
            {deployedUrl}
          </a>
        </div>
      )}

      {/* Credential Requirement Modal */}
      {credentialRequirement && (
        <CredentialForm
          service={credentialRequirement.service}
          fields={credentialRequirement.fields}
          message={credentialRequirement.message}
          instructions={credentialRequirement.instructions}
          onSuccess={handleCredentialSuccess}
          onCancel={handleCredentialCancel}
        />
      )}
    </div>
  );
};
