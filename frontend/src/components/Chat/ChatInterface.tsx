import { MessageList } from './MessageList';
import { useState, useRef, useEffect } from 'react';
import { Message } from '../../types/chat';

interface ChatInterfaceProps {
  onAddMessage?: (message: Message) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ onAddMessage }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch(`http://localhost:3000/api/automation/sse/chat?sessionId=test&msg=${encodeURIComponent(inputValue)}`);
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      let assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        text: '',
        timestamp: new Date(),
        streamingState: 'analyzing'
      };

      // Add initial message about comprehensive template system
      assistantMessage.text = '🔍 **Analyzing your request with comprehensive template system...**\n\n';
      assistantMessage.text += '✅ **Supported Providers**: Airtable, OpenAI, Notion, Slack, Stripe, GitHub, Email, Google\n';
      assistantMessage.text += '✅ **API Docs Integration**: Validating endpoints and parameters\n';
      assistantMessage.text += '✅ **Template System**: Using provider-specific templates for accurate code generation\n\n';

      setMessages(prev => [...prev, assistantMessage]);

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.delta) {
                assistantMessage.text += data.delta;
                assistantMessage.streamingState = data.streamingState;
                
                if (data.planJSON) {
                  assistantMessage.planJSON = data.planJSON;
                }
                
                if (data.done) {
                  assistantMessage.done = true;
                }
                
                setMessages(prev => [...prev.slice(0, -1), { ...assistantMessage }]);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        text: '❌ **Error**: Failed to send message. Please try again.',
        timestamp: new Date(),
        streamingState: 'error'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprovePlan = async (planJSON: any) => {
    console.log('✅ Approving plan:', planJSON);
    
    try {
      const response = await fetch('http://localhost:3000/api/automation/sse/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: 'test',
          msg: 'APPROVE_PLAN',
          planJSON: planJSON
        })
      });

      if (!response.ok) {
        throw new Error('Failed to approve plan');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      let approvalMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        text: '',
        timestamp: new Date(),
        streamingState: 'executing'
      };

      setMessages(prev => [...prev, approvalMessage]);

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.delta) {
                approvalMessage.text += data.delta;
                approvalMessage.streamingState = data.streamingState;
                
                if (data.done) {
                  approvalMessage.done = true;
                }
                
                setMessages(prev => [...prev.slice(0, -1), { ...approvalMessage }]);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }

      // Add success message
      const successMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: 'assistant',
        text: '✅ **Automation created successfully!** The automation has been deployed and is ready to use.',
        timestamp: new Date(),
        streamingState: 'complete'
      };
      setMessages(prev => [...prev, successMessage]);
      onAddMessage?.(successMessage);

    } catch (error) {
      console.error('Error approving plan:', error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: 'assistant',
        text: '❌ **Error**: Failed to approve plan. Please try again.',
        timestamp: new Date(),
        streamingState: 'error'
      };
      setMessages(prev => [...prev, errorMessage]);
      onAddMessage?.(errorMessage);
    }
  };

  const handleRejectPlan = () => {
    console.log('❌ Rejecting plan');
    const rejectMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      text: '❌ **Plan rejected**. Please provide a new request or modify your requirements.',
      timestamp: new Date(),
      streamingState: 'complete'
    };
    setMessages(prev => [...prev, rejectMessage]);
    onAddMessage?.(rejectMessage);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <MessageList 
          messages={messages} 
          onApprovePlan={handleApprovePlan}
          onRejectPlan={handleRejectPlan}
        />
      </div>
      
      <div className="border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Describe the automation you want to create..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
      
      <div ref={messagesEndRef} />
    </div>
  );
}; 