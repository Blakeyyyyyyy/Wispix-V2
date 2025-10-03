import React, { useState } from 'react';
import StreamingChatInterface from './StreamingChatInterface';

const StreamingDemo: React.FC = () => {
  const [currentPhase, setCurrentPhase] = useState<'input' | 'processing' | 'complete'>('input');

  const handleUserInput = (input: string) => {
    setCurrentPhase('processing');
    // The streaming chat interface will handle the actual API call
    // We just need to track the phase for UI state
  };

  return (
    <div className="streaming-demo">
      <div className="demo-header">
        <h1>🚀 AI Agent Builder - Streaming Demo</h1>
        <p>Experience the Vibe-inspired streaming interface for building AI agents</p>
      </div>
      
      <div className="demo-content">
        <div className="demo-info">
          <h3>✨ Features</h3>
          <ul>
            <li>Real-time streaming updates from Claude AI</li>
            <li>Step-by-step agent building process</li>
            <li>Interactive plan approval workflow</li>
            <li>Beautiful animated UI with progress indicators</li>
            <li>Responsive design with modern aesthetics</li>
          </ul>
          
          <h3>🔧 How it works</h3>
          <ol>
            <li>Describe the AI agent you need</li>
            <li>Watch as Claude analyzes your requirements</li>
            <li>Review the generated plan</li>
            <li>Approve or reject the plan</li>
            <li>Monitor the building process in real-time</li>
          </ol>
        </div>
        
        <div className="chat-container">
          <StreamingChatInterface 
            onUserInput={handleUserInput}
            currentPhase={currentPhase}
          />
        </div>
      </div>
    </div>
  );
};

export default StreamingDemo;
