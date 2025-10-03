import React, { useState } from 'react';
import { ChatInterface } from './Chat/ChatInterface';
import BuilderPane from './Chat/BuilderPane';
import MyAutomations from './MyAutomations';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Message } from '../types/chat';
import { getHealth, getDocs, runInboxManager } from '../services/api';

interface DashboardProps {
  onShowTemplateInfo?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onShowTemplateInfo }) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'builder' | 'automations'>('chat');

  const handleHealthCheck = async () => {
    try {
      const result = await getHealth();
      alert(`✅ Backend Health: ${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      alert(`❌ Backend Health Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDocsDemo = async () => {
    try {
      const result = await getDocs('airtable', 'list records');
      console.log('📚 Docs / Vector Search Demo Result:', result);
      alert(`✅ Docs search completed! Check console for results.`);
    } catch (error) {
      console.error('❌ Docs search error:', error);
      alert(`❌ Docs Search Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleInboxManager = async () => {
    try {
      const r = await runInboxManager();
      console.log('[InboxManager] started', r);
      alert(`✅ InboxManager started! Execution ID: ${r.executionId}`);
    } catch (e) {
      console.error('[InboxManager] failed', e);
      alert(`❌ InboxManager failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const handleGmailOAuth = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/oauth/gmail/auth');
      const data = await response.json();
      
      if (data.authUrl) {
        // Open OAuth URL in new window
        window.open(data.authUrl, '_blank', 'width=600,height=700');
        alert('🔐 Gmail OAuth window opened! Complete the authentication and then try running InboxManager again.');
      } else {
        throw new Error('No auth URL received');
      }
    } catch (e) {
      console.error('[Gmail OAuth] failed', e);
      alert(`❌ Gmail OAuth failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border">
          {/* Tab Navigation */}
          <div className="border-b">
            <nav className="flex justify-between items-center px-6">
              <div className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'chat'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Chat with Cline
                </button>
                <button
                  onClick={() => setActiveTab('builder')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'builder'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Automation Builder
                </button>
                <button
                  onClick={() => setActiveTab('automations')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'automations'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  My Automations
                </button>
              </div>
              
              {/* Action Buttons */}
              <div className="flex space-x-2">
                <button
                  onClick={onShowTemplateInfo}
                  className="px-3 py-1 text-xs bg-purple-100 text-purple-800 rounded hover:bg-purple-200 transition-colors"
                  title="Learn about template system"
                >
                  Template System
                </button>
                <button
                  onClick={handleHealthCheck}
                  className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors"
                  title="Test backend health"
                >
                  Backend Health
                </button>
                <button
                  onClick={handleDocsDemo}
                  className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
                  title="Test docs/vector search"
                >
                  Docs Search Demo
                </button>
                <button
                  onClick={handleInboxManager}
                  className="px-3 py-1 text-xs bg-orange-100 text-orange-800 rounded hover:bg-orange-200 transition-colors"
                  title="Run InboxManager agent"
                >
                  Run InboxManager (dev)
                </button>
                <button
                  onClick={handleGmailOAuth}
                  className="px-3 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
                  title="Set up Gmail OAuth"
                >
                  Gmail OAuth
                </button>
              </div>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="min-h-96">
            {activeTab === 'chat' ? (
              <ChatInterface />
            ) : activeTab === 'builder' ? (
              <BuilderPane className="h-full" />
            ) : (
              <MyAutomations onBack={() => setActiveTab('chat')} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 