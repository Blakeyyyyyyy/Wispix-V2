<<<<<<< HEAD
import React from 'react';
import { useAuth } from './hooks/useAuth';
import { AuthForm } from './components/AuthForm';
import { Dashboard } from './components/Dashboard';
import { WebhookHandler } from './components/WebhookHandler';

function App() {
  const { user, loading } = useAuth();

  // Add error boundary
  React.useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('App Error:', error);
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <WebhookHandler />
      {user ? <Dashboard /> : <AuthForm />}
    </>
  );
}

export default App;
=======
import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Bot, User, Loader2 } from 'lucide-react';
import { LandingPage } from './components/LandingPage';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isThinking?: boolean;
  type?: string;
  metadata?: any;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<'landing' | 'chat'>('landing');
  const [userRequest, setUserRequest] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startUnifiedStreaming = async (request: string, thinkingId?: string) => {
    try {
      console.log('🚀 Starting smart model routing for:', request);
      
      const response = await fetch('http://localhost:3001/api/build-agent-smart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: request, sessionId: sessionId || Date.now().toString() })
      });

      console.log('📡 Unified streaming response received:', response.status, 'Headers');
      
      if (!response.body) {
        throw new Error('No response body');
      }

      console.log('📖 Starting to read unified stream...');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              console.log('🏁 Unified server sent [DONE]');
              continue;
            }

            try {
              const evt = JSON.parse(data);
              console.log('📦 Received unified chunk:', data);
              
              if (evt.type && evt.message) {
                console.log('📋 Parsed unified event:', evt.type, evt.message);
                
                // Remove thinking message if it exists
                if (thinkingId) {
                  setMessages(prev => prev.filter(msg => msg.id !== thinkingId));
                }

                // Handle different event types
                if (evt.type === 'analyzing') {
                  setMessages(prev => [...prev, {
                    id: Date.now().toString() + '_analyzing',
                    role: 'assistant',
                    content: `🔍 ${evt.message}`,
                    timestamp: new Date(),
                    type: 'analyzing'
                  }]);
                } else if (evt.type === 'planning') {
                  setMessages(prev => [...prev, {
                    id: Date.now().toString() + '_planning',
                    role: 'assistant',
                    content: `📋 ${evt.message}`,
                    timestamp: new Date(),
                    type: 'planning'
                  }]);
                } else if (evt.type === 'plan-ready') {
                  // Plan displayed directly in chat
                  if (evt.metadata?.sessionId) {
                    setSessionId(evt.metadata.sessionId);
                  }
                  
                  setMessages(prev => [...prev, {
                    id: Date.now().toString() + '_plan',
                    role: 'assistant',
                    content: `📋 **AI Agent Plan Ready!**\n\n${evt.metadata?.plan || evt.message}\n\n💡 **Next Steps:** Ask me questions about this plan or request modifications. I remember our conversation context!`,
                    timestamp: new Date(),
                    type: 'plan-ready',
                    metadata: evt.metadata
                  }]);
                } else if (evt.type === 'complete') {
                  setMessages(prev => [...prev, {
                    id: Date.now().toString() + '_complete',
                    role: 'assistant',
                    content: `✅ ${evt.message}`,
                    timestamp: new Date(),
                    type: 'complete'
                  }]);
                } else if (evt.type === 'error') {
                  setMessages(prev => [...prev, {
                    id: Date.now().toString() + '_error',
                    role: 'assistant',
                    content: `❌ Error: ${evt.message}`,
                    timestamp: new Date(),
                    type: 'error'
                  }]);
                }
              }
            } catch (parseError) {
              console.error('❌ Failed to parse event:', parseError);
            }
          }
        }
      }

      console.log('✅ Unified stream complete');
    } catch (error) {
      console.error('❌ Unified streaming error:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString() + '_error',
        role: 'assistant',
        content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        timestamp: new Date(),
        type: 'error'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Add thinking message
    const thinkingId = Date.now().toString() + '_thinking';
    setMessages(prev => [...prev, {
      id: thinkingId,
      role: 'assistant',
      content: '🤔 Thinking...',
      timestamp: new Date(),
      isThinking: true
    }]);

    // Use unified streaming for both employee and agent modes
    startUnifiedStreaming(input.trim(), thinkingId);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleBackToLanding = () => {
    setCurrentPage('landing');
    setUserRequest('');
    setMessages([]);
    setInput('');
    setIsLoading(false);
  };

  if (currentPage === 'landing') {
    return <LandingPage onGetStarted={handleGetStarted} />;
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className="w-64 bg-gray-50 border-r border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <Sparkles className="w-8 h-8 text-blue-600 mr-3" />
          <h1 className="text-xl font-bold text-gray-900">Wispix AI</h1>
        </div>
        
        <button
          onClick={handleBackToLanding}
          className="w-full mb-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          ← Back to Landing
        </button>

        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">AI Agent Builder</h3>
            <p className="text-sm text-blue-700">
              Build intelligent AI agents for any task. Just describe what you need!
            </p>
          </div>
        </div>

        <div className="mt-8 text-xs text-gray-500">
          <p>Session ID: {sessionId || 'New'}</p>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900">AI Agent Builder</h2>
          <p className="text-sm text-gray-600">Describe your AI agent and I'll build it for you</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : message.type === 'error'
                    ? 'bg-red-100 text-red-800'
                    : message.type === 'complete'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <div className="flex items-start space-x-2">
                  {message.role === 'user' ? (
                    <User className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  ) : (
                    <Bot className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Describe your AI agent..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              onClick={handleSubmit}
              disabled={isLoading || !input.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  function handleGetStarted() {
    setCurrentPage('chat');
  }
}
>>>>>>> d013e51c10be891e59a50667e06d78248963144b
