'use client';

import { useState } from 'react';
import CredentialModal from './CredentialModal';
import { ENV_CONFIG } from '../config/env';

export default function CredentialTestPage() {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState('');
  const [credentialModal, setCredentialModal] = useState<{ 
    isOpen: boolean; 
    service: string 
  }>({ isOpen: false, service: '' });

  const handleAgentAction = async (service: string, action: string) => {
    try {
      const response = await fetch(`${ENV_CONFIG.API_BASE_URL}/api/agents/${service}/act`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      const data = await response.json();

      if (response.status === 401 && data.requiresCredentials) {
        // Open credential modal
        setCredentialModal({ isOpen: true, service: data.service });
        return false;
      }

      return data;
    } catch (error) {
      console.error('Agent action failed:', error);
      return false;
    }
  };

  const saveCredentials = async (credentials: { username: string; password: string }) => {
    const response = await fetch(`${ENV_CONFIG.API_BASE_URL}/api/credentials/${credentialModal.service}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credentials })
    });

    if (!response.ok) {
      throw new Error('Failed to save credentials');
    }

    // Retry the action after saving credentials
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: `Credentials saved! Now connecting to ${credentialModal.service}...` 
    }]);

    // Retry the original action
    const result = await handleAgentAction(credentialModal.service, 'check');
    if (result) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Successfully connected to ${credentialModal.service}! ${result.message}` 
      }]);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    // Simple command parsing for demo
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('gmail')) {
      const result = await handleAgentAction('gmail', 'check');
      if (result) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'Successfully checked Gmail!' 
        }]);
      }
    } else if (lowerMessage.includes('calendar')) {
      const result = await handleAgentAction('calendar', 'check');
      if (result) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'Successfully checked Calendar!' 
        }]);
      }
    } else if (lowerMessage.includes('airtable')) {
      const result = await handleAgentAction('airtable', 'check');
      if (result) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'Successfully connected to Airtable!' 
        }]);
      }
    } else if (lowerMessage.includes('stripe')) {
      const result = await handleAgentAction('stripe', 'check');
      if (result) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'Successfully connected to Stripe!' 
        }]);
      }
    } else {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I can help you with Gmail, Calendar, Airtable, Stripe, and other services. Just ask!' 
      }]);
    }
  };

  return (
    <main className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-8">Wispix AI Assistant - Credential Test</h1>
      
      <div className="bg-gray-50 rounded-lg p-4 mb-4 h-96 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-gray-500">
            <p>Start a conversation...</p>
            <p className="text-sm mt-2">Try: "Check my Gmail", "Check my Calendar", "Connect to Airtable", "Check Stripe"</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
              <span className={`inline-block px-4 py-2 rounded-lg ${
                msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}>
                {msg.content}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ask me to check Gmail, Calendar, Airtable, Stripe, etc..."
        />
        <button
          onClick={handleSendMessage}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Send
        </button>
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">🔒 Security Features:</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Credentials are encrypted before storage</li>
          <li>• No credentials appear in logs or error messages</li>
          <li>• Secure API endpoints with proper error handling</li>
          <li>• Defensive programming throughout</li>
        </ul>
      </div>

      <CredentialModal
        service={credentialModal.service}
        isOpen={credentialModal.isOpen}
        onClose={() => setCredentialModal({ isOpen: false, service: '' })}
        onSubmit={saveCredentials}
      />
    </main>
  );
}
