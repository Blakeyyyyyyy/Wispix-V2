import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, CheckCircle, Zap, Sparkles } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
  metadata?: any;
}

interface ChatInterfaceProps {
  messages: Message[];
  onUserInput: (input: string) => void;
  currentPhase: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onUserInput, currentPhase }) => {
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && currentPhase === 'input') {
      onUserInput(inputValue.trim());
      setInputValue('');
      setIsTyping(true);
    }
  };

  const renderMessage = (message: Message) => {
    const isUser = message.type === 'user';
    
    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`message ${isUser ? 'message-user' : 'message-ai'}`}
      >
        <div className="message-avatar">
          {isUser ? (
            <div className="avatar-user">
              <User size={16} />
            </div>
          ) : (
            <div className="avatar-ai">
              <Bot size={16} />
            </div>
          )}
        </div>
        
        <div className="message-content">
          {message.metadata?.type === 'planning-step' && (
            <div className="planning-step">
              <CheckCircle className="check-icon" size={16} />
              <span>{message.content.replace('✓ ', '')}</span>
            </div>
          )}
          
          {message.metadata?.type === 'building-step' && (
            <div className="building-step">
              <Zap className="zap-icon" size={16} />
              <span>{message.content.replace('[⚡] ', '')}</span>
            </div>
          )}
          
          {message.metadata?.type === 'completion' && (
            <div className="completion-message">
              <Sparkles className="sparkles-icon" size={16} />
              <span>{message.content}</span>
            </div>
          )}
          
          {!message.metadata && (
            <div className="message-text">{message.content}</div>
          )}
          
          <div className="message-timestamp">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="chat-interface">
      {/* Messages Area */}
      <div className="messages-container">
        <AnimatePresence>
          {messages.map(renderMessage)}
        </AnimatePresence>
        
        {/* Typing Indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="typing-indicator"
          >
            <div className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
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
              placeholder={currentPhase === 'input' ? "Describe what you need help with..." : "Processing..."}
              disabled={currentPhase !== 'input'}
              className="chat-input"
            />
            <button
              type="submit"
              disabled={currentPhase !== 'input' || !inputValue.trim()}
              className="send-button"
            >
              <Send size={20} />
            </button>
          </div>
        </form>
        
        {currentPhase === 'input' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="input-suggestions"
          >
            <div className="suggestion-chips">
              <button 
                className="suggestion-chip"
                onClick={() => setInputValue("I need help managing my inbox")}
              >
                I need help managing my inbox
              </button>
              <button 
                className="suggestion-chip"
                onClick={() => setInputValue("Create an AI assistant for customer support")}
              >
                Create an AI assistant for customer support
              </button>
              <button 
                className="suggestion-chip"
                onClick={() => setInputValue("Build an automation for lead generation")}
              >
                Build an automation for lead generation
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;
