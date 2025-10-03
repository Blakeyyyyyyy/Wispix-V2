import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, CheckCircle, Zap, Sparkles, AlertCircle, Clock, FileText } from 'lucide-react';

interface StreamingMessage {
  id: string;
  type: 'user' | 'ai' | 'system' | 'analyzing' | 'planning' | 'building' | 'testing' | 'complete' | 'error';
  content: string;
  timestamp: Date;
  metadata?: any;
  isStreaming?: boolean;
}

interface PlanData {
  plan: string;
  requiresApproval: boolean;
  estimatedTime?: string;
}

interface StreamingChatInterfaceProps {
  onUserInput: (input: string) => void;
  currentPhase: string;
}

const StreamingChatInterface: React.FC<StreamingChatInterfaceProps> = ({ onUserInput, currentPhase }) => {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<StreamingMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<PlanData | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (currentPhase === 'input' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentPhase]);

  const buildAgent = async (message: string) => {
    setIsStreaming(true);
    
    // Add user message
    const userMessage: StreamingMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await fetch('http://localhost:3000/api/build-agent-streaming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId: Date.now() })
      });

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data === '[DONE]') {
                setIsStreaming(false);
                break;
              }

              // Handle different message types
              if (data.type === 'analyzing') {
                setMessages(prev => [...prev, {
                  id: Date.now().toString(),
                  type: 'analyzing',
                  content: data.message,
                  timestamp: new Date(data.timestamp || Date.now()),
                  metadata: { isAnalysis: true }
                }]);
              } else if (data.type === 'planning') {
                setMessages(prev => [...prev, {
                  id: Date.now().toString(),
                  type: 'planning',
                  content: data.message,
                  timestamp: new Date(data.timestamp || Date.now()),
                  metadata: { isPlanning: true }
                }]);
              } else if (data.type === 'plan-ready') {
                setCurrentPlan({
                  plan: data.plan,
                  requiresApproval: data.requiresApproval,
                  estimatedTime: data.estimatedTime
                });
                setShowApprovalDialog(data.requiresApproval);
                
                setMessages(prev => [...prev, {
                  id: Date.now().toString(),
                  type: 'planning',
                  content: 'Plan ready for your approval!',
                  timestamp: new Date(data.timestamp || Date.now()),
                  metadata: { isPlanReady: true, plan: data.plan }
                }]);
              } else if (data.type === 'complete') {
                setMessages(prev => [...prev, {
                  id: Date.now().toString(),
                  type: 'complete',
                  content: data.message,
                  timestamp: new Date(data.timestamp || Date.now()),
                  metadata: { isComplete: true }
                }]);
              } else if (data.type === 'error') {
                setMessages(prev => [...prev, {
                  id: Date.now().toString(),
                  type: 'error',
                  content: data.message,
                  timestamp: new Date(data.timestamp || Date.now()),
                  metadata: { isError: true, code: data.code, retryable: data.retryable }
                }]);
              }
            } catch (parseError) {
              console.error('Error parsing streaming data:', parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error building agent:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'error',
        content: 'Failed to build agent. Please try again.',
        timestamp: new Date(),
        metadata: { isError: true }
      }]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && currentPhase === 'input' && !isStreaming) {
      buildAgent(inputValue.trim());
      setInputValue('');
    }
  };

  const handleApprovePlan = () => {
    if (currentPlan) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'system',
        content: 'Plan approved! Starting build process...',
        timestamp: new Date(),
        metadata: { isApproved: true }
      }]);
      setShowApprovalDialog(false);
      // Here you would trigger the actual build process
    }
  };

  const handleRejectPlan = () => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      type: 'system',
      content: 'Plan rejected. Please try again with different requirements.',
      timestamp: new Date(),
      metadata: { isRejected: true }
    }]);
    setShowApprovalDialog(false);
    setCurrentPlan(null);
  };

  const renderMessage = (message: StreamingMessage) => {
    const getIcon = () => {
      switch (message.type) {
        case 'analyzing': return <Clock size={16} className="text-blue-500" />;
        case 'planning': return <FileText size={16} className="text-purple-500" />;
        case 'building': return <Zap size={16} className="text-yellow-500" />;
        case 'testing': return <CheckCircle size={16} className="text-green-500" />;
        case 'complete': return <Sparkles size={16} className="text-green-500" />;
        case 'error': return <AlertCircle size={16} className="text-red-500" />;
        case 'user': return <User size={16} className="text-blue-500" />;
        default: return <Bot size={16} className="text-gray-500" />;
      }
    };

    const getMessageClass = () => {
      switch (message.type) {
        case 'analyzing': return 'message-analyzing';
        case 'planning': return 'message-planning';
        case 'building': return 'message-building';
        case 'testing': return 'message-testing';
        case 'complete': return 'message-complete';
        case 'error': return 'message-error';
        case 'user': return 'message-user';
        default: return 'message-ai';
      }
    };

    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`message ${getMessageClass()}`}
      >
        <div className="message-avatar">
          <div className={`avatar-${message.type}`}>
            {getIcon()}
          </div>
        </div>
        
        <div className="message-content">
          <div className="message-text">{message.content}</div>
          
          {message.metadata?.isPlanReady && currentPlan && (
            <div className="plan-preview">
              <div className="plan-header">
                <h4>Agent Configuration Plan</h4>
                <span className="estimated-time">⏱️ {currentPlan.estimatedTime}</span>
              </div>
              <div className="plan-content">
                <pre>{currentPlan.plan}</pre>
              </div>
              {currentPlan.requiresApproval && (
                <div className="plan-actions">
                  <button 
                    onClick={handleApprovePlan}
                    className="approve-btn"
                  >
                    ✅ Approve & Build
                  </button>
                  <button 
                    onClick={handleRejectPlan}
                    className="reject-btn"
                  >
                    ❌ Reject
                  </button>
                </div>
              )}
            </div>
          )}
          
          <div className="message-timestamp">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="streaming-chat-interface">
      {/* Messages Area */}
      <div className="messages-container">
        <AnimatePresence>
          {messages.map(renderMessage)}
        </AnimatePresence>
        
        {/* Streaming Indicator */}
        {isStreaming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="streaming-indicator"
          >
            <div className="streaming-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span className="streaming-text">Building your agent...</span>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="input-container">
        <form onSubmit={handleSubmit} className="input-form">
          <div className="input-wrapper">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={currentPhase === 'input' && !isStreaming ? "Describe what AI agent you need..." : "Processing..."}
              disabled={currentPhase !== 'input' || isStreaming}
              className="chat-input"
            />
            <button
              type="submit"
              disabled={currentPhase !== 'input' || !inputValue.trim() || isStreaming}
              className="send-button"
            >
              <Send size={20} />
            </button>
          </div>
        </form>
        
        {currentPhase === 'input' && !isStreaming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="input-suggestions"
          >
            <div className="suggestion-chips">
              <button 
                className="suggestion-chip"
                onClick={() => setInputValue("I need an AI agent to manage my email inbox")}
              >
                Email Management Agent
              </button>
              <button 
                className="suggestion-chip"
                onClick={() => setInputValue("Create an AI assistant for customer support automation")}
              >
                Customer Support Agent
              </button>
              <button 
                className="suggestion-chip"
                onClick={() => setInputValue("Build an automation agent for lead generation and qualification")}
              >
                Lead Generation Agent
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Approval Dialog */}
      {showApprovalDialog && currentPlan && (
        <div className="approval-overlay">
          <div className="approval-dialog">
            <h3>Approve Agent Plan?</h3>
            <p>Review the plan above and decide whether to proceed with building this agent.</p>
            <div className="approval-actions">
              <button onClick={handleApprovePlan} className="approve-btn">
                ✅ Approve & Build
              </button>
              <button onClick={handleRejectPlan} className="reject-btn">
                ❌ Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StreamingChatInterface;
