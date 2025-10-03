import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase, AutomationThread, ChatMessage } from '../lib/supabase';
import { Send, Loader2, Bot } from 'lucide-react';
import { CredentialForm } from './CredentialForm';

interface ChatInterfaceProps {
  thread: AutomationThread;
}

export function ChatInterface({ thread }: ChatInterfaceProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [oldestMessageId, setOldestMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const MESSAGE_LIMIT = 40;

  useEffect(() => {
    console.log('🔐 ChatInterface useEffect triggered for thread:', thread.id);
    loadMessages();
    
    // Note: Old brittle event listener code removed - now using structured API calls
    
    // Subscribe to real-time updates
    const subscription = supabase
      .channel(`chat_updates:${thread.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `thread_id=eq.${thread.id}`,
        },
        (payload) => {
          console.log('🔐 Real-time subscription received payload:', payload);
          if (payload.eventType === 'INSERT') {
            console.log('🔐 New message inserted:', payload.new);
            setMessages(prev => {
              // Check if message already exists to prevent duplicates
              const messageExists = prev.some(msg => msg.id === payload.new.id);
              if (messageExists) {
                console.log('🔐 DUPLICATE MESSAGE DETECTED - Message already exists, skipping:', payload.new.id);
                return prev;
              }
              
              // If this is a real agent response, remove any "thinking" messages
              if ((payload.new.sender_type === 'agent1' || payload.new.sender_type === 'agent2') && 
                  !payload.new.content.includes('Agent is thinking')) {
                const filteredMessages = prev.filter(msg => 
                  !(msg.sender_type === payload.new.sender_type && msg.content.includes('Agent is thinking'))
                );
                console.log('🔐 Removed thinking message, adding real agent response:', payload.new.id);
                return [...filteredMessages, payload.new as ChatMessage];
              }
              
              console.log('🔐 Adding new message to state:', payload.new.id);
              return [...prev, payload.new as ChatMessage];
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔐 ChatInterface cleanup for thread:', thread.id);
      subscription.unsubscribe();
    };
  }, [thread.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const checkForPendingCredentialRequests = (messages: ChatMessage[]) => {
    console.log('🔐 Checking for pending credential requests in', messages.length, 'messages');
    
    // Check the last few messages for credential requests
    const recentMessages = messages.slice(-3); // Check last 3 messages
    for (const msg of recentMessages) {
      if (msg.sender_type === 'agent1') {
        try {
          const parsed = JSON.parse(msg.content);
          if (parsed.agent1_data && parsed.agent1_data.requestCredentials === true) {
            console.log('🔐 Found pending credential request in loaded messages');
            
            // Check if credential popup is already showing
            const hasCredentialPopup = messages.some(m => {
              try {
                const p = JSON.parse(m.content);
                return p.agent1_data && p.agent1_data.requestCredentials === true;
              } catch {
                return false;
              }
            });
            
            if (!hasCredentialPopup) {
              console.log('🔐 Triggering credential popup from loaded messages');
              // The message parsing will handle showing the popup
            }
            break;
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
    }
  };

  const loadMessages = async (loadOlder = false) => {
    if (loadOlder) {
      setLoadingOlder(true);
    } else {
      setLoading(true);
    }
    
    try {
      let query = supabase
        .from('chat_messages')
        .select('*')
        .eq('thread_id', thread.id)
        .order('created_at', { ascending: false })
        .limit(MESSAGE_LIMIT);

      // If loading older messages, get messages before the oldest one we have
      if (loadOlder && oldestMessageId) {
        const { data: oldestMessage } = await supabase
          .from('chat_messages')
          .select('created_at')
          .eq('id', oldestMessageId)
          .single();
        
        if (oldestMessage) {
          query = query.lt('created_at', oldestMessage.created_at);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      
      const sortedData = (data || []).reverse(); // Reverse to get chronological order
      
      if (loadOlder) {
        // Prepend older messages to the beginning
        setMessages(prev => [...sortedData, ...prev]);
      } else {
        // Replace all messages
        setMessages(sortedData);
      }
      
      // Update pagination state
      if (sortedData.length > 0) {
        setOldestMessageId(sortedData[0].id);
        setHasOlderMessages(sortedData.length === MESSAGE_LIMIT);
      } else {
        setHasOlderMessages(false);
      }
      
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      if (loadOlder) {
        setLoadingOlder(false);
      } else {
        setLoading(false);
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const saveFlowToDatabase = async (steps: any[], projectContext: string) => {
    try {
      console.log('💾 Saving flow to database:', { steps, projectContext, threadId: thread.id });
      
      const { data: existingFlow } = await supabase
        .from('automation_flows')
        .select('id')
        .eq('thread_id', thread.id)
        .maybeSingle();

      console.log('💾 Existing flow check:', existingFlow);
      if (existingFlow) {
        console.log('💾 Updating existing flow...');
        await supabase
          .from('automation_flows')
          .update({ 
            steps: steps,
            project_context: projectContext 
          })
          .eq('thread_id', thread.id);
      } else {
        console.log('💾 Creating new flow...');
        await supabase
          .from('automation_flows')
          .insert({
            thread_id: thread.id,
            user_id: user?.id,
            steps: steps,
            project_context: projectContext
          });
      }

      console.log('💾 Flow saved successfully!');
      
      // Force FlowMapping to reload
      window.dispatchEvent(new CustomEvent('flowStepsUpdated', {
        detail: { threadId: thread.id, steps: steps, projectContext }
      }));
      
      console.log('💾 Dispatched flowStepsUpdated event');
    } catch (error) {
      console.error('Error saving flow:', error);
    }
  };

  // parseAgentResponse function removed - agents now POST directly to our endpoints
  
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;
    
    const messageContent = newMessage.trim();
    setNewMessage('');
    await sendMessageDirectly(messageContent);
  };

  const sendMessageDirectly = async (messageContent: string) => {
    if (!messageContent.trim() || sending) return;

    setSending(true);

    try {
      // For "approve" messages, just send them normally - the real-time subscription will handle credential popups
      console.log('📤 Sending message:', messageContent);

      // Save user message to database and get the created message
      const { data: userMessage, error: dbError } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user?.id,
          thread_id: thread.id,
          sender_type: 'user',
          content: messageContent
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Add user message to local state immediately (real-time will handle duplicates)
      if (userMessage) {
        setMessages(prev => [...prev, userMessage]);
      }

      // Check if this is an "approve" message and if the previous message was a credential request
      if (messageContent.toLowerCase().trim() === 'approve') {
        console.log('🔐 Approve message detected, checking for pending credential request...');
        
        // Find the most recent agent message that might be a credential request
        const recentMessages = messages.slice(-5); // Check last 5 messages
        for (const msg of recentMessages.reverse()) {
          if (msg.sender_type === 'agent1') {
            try {
              const parsed = JSON.parse(msg.content);
              if (parsed.agent1_data && parsed.agent1_data.requestCredentials === true) {
                console.log('🔐 Found pending credential request, triggering popup immediately');
                // The credential popup will be shown automatically by the message parsing logic
                // No need to call the agent again
                setSending(false);
                return;
              }
            } catch (e) {
              // Continue checking other messages
            }
          }
        }
      }

      // Send to Agent 1 using the new HTTP-based system
      console.log('🤖 About to call Agent 1 with:', {
        thread_id: thread.id,
        automation_id: thread.automation_id,
        user_id: user?.id,
        message: messageContent
      });
      
      // Create AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout
      
      console.log('🤖 Making fetch request to /api/send-message-agent1');
      const webhookResponse = await fetch('/api/send-message-agent1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          thread_id: thread.id,
          automation_id: thread.automation_id,
          user_id: user?.id,
          message: messageContent,
          timestamp: new Date().toISOString(),
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!webhookResponse.ok) {
        // Handle webhook error response
        const errorText = await webhookResponse.text();
        console.error('Webhook error:', errorText);
        
        const { data: errorMessage } = await supabase
          .from('chat_messages')
          .insert({
            user_id: user?.id,
            thread_id: thread.id,
            sender_type: 'agent1',
            content: `Agent 1 is currently unavailable. Please try again later. (Error: ${webhookResponse.status})`
          })
          .select()
          .single();

        if (errorMessage) {
          setMessages(prev => [...prev, errorMessage]);
        }
      }
      
      // Add "agent is thinking" message
      const thinkingMessage = {
        id: 'thinking-' + Date.now(),
        thread_id: thread.id,
        user_id: user?.id,
        content: 'Agent is thinking...',
        sender_type: 'agent1',
        created_at: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, thinkingMessage as ChatMessage]);
      
      // Note: Agent responses are now handled by the real-time subscription
      // when agents POST directly to /api/agent1-response and /api/agent2-response
    } catch (error) {
      console.error('Error sending message:', error);
      // Show error message in chat
      const { data: errorMessage } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user?.id,
          thread_id: thread.id,
          sender_type: 'agent1',
          content: 'Sorry, there was an error processing your message. Please try again.'
        })
        .select()
        .single();

      if (errorMessage) {
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setSending(false);
    }
  };

  const parseMessageContent = (message: ChatMessage) => {
    try {
      console.log('🔐 parseMessageContent called for message:', message.id, message.sender_type);
      const parsed = JSON.parse(message.content);
      console.log('🔐 parseMessageContent - Raw message:', message.content);
      console.log('🔐 parseMessageContent - Parsed:', parsed);
      
      // Handle new Agent 1 credential requests
      if (parsed.action === 'CREDENTIAL_REQUEST') {
        console.log('🔐 NEW AGENT 1 CREDENTIAL REQUEST DETECTED!');
        console.log('🔐 Parsed data:', parsed);
        console.log('🔐 Platform:', parsed.platform);
        console.log('🔐 Fields:', parsed.fields);
        console.log('🔐 Requested credentials:', parsed.requested_credentials);
        
        const fields = parsed.fields || parsed.requested_credentials || [];
        const platform = parsed.platform;
        
        console.log('🔐 Creating credential data with Platform1 format');
        const credentialData = {
          Platform1: platform,
          CredentialName1: fields[0] || 'api_key',
          ...fields.slice(1).reduce((acc, field, index) => {
            acc[`CredentialName${index + 2}`] = field;
            return acc;
          }, {})
        };
        
        console.log('🔐 Final credential data:', credentialData);
        
        return {
          isCredentialRequest: true,
          isAgentResponse: true,
          agentType: 'Agent1',
          content: parsed.message || `Please provide your ${parsed.platform} credentials`,
          credentialData: credentialData,
          rawData: parsed
        };
      }
      
      // Handle CREDENTIALS_SAVED system events
      if (parsed.action === 'CREDENTIALS_SAVED') {
        console.log('🔐 CREDENTIALS_SAVED system event detected!');
        console.log('🔐 Platform:', parsed.platform, 'TraceId:', parsed.traceId);
        
        // This is a system event - don't render anything special, just let it pass through
        // The backend Agent 1 will process this and respond with the next step
        return {
          isCredentialRequest: false,
          isAgentResponse: false,
          agentType: 'system',
          content: parsed.message || 'Credentials saved successfully',
          rawData: parsed
        };
      }
      
      // Handle new Agent 1 flow changes
      if (parsed.action === 'FLOW_CHANGE' && parsed.steps) {
        console.log('🔄 NEW AGENT 1 FLOW CHANGE DETECTED!');
        return {
          isFlowChange: true,
          isAgentResponse: true,
          agentType: 'Agent1',
          content: parsed.message || 'Automation plan created',
          steps: parsed.steps,
          projectContext: parsed.projectContext || '',
          rawData: parsed
        };
      }
      
      // Handle credential requests (new format)
      if (parsed.action === 'CREDENTIAL_REQUEST') {
        return {
          isCredentialRequest: true,
          credentialData: parsed,
          content: parsed.message || 'I need your credentials to continue with the automation.'
        };
      }
      
      // Handle credential requests (legacy format)
      if (parsed.type === 'credential_request') {
        return {
          isCredentialRequest: true,
          credentialData: parsed,
          content: parsed.message || 'I need your credentials to continue with the automation.'
        };
      }
      
      // Handle agent responses (Agent1 and Agent2)
      if (parsed.success && parsed.message) {
        // Extract the actual content from agent responses
        let displayContent = '';
        
        if (parsed.parsed_content) {
          // Use parsed_content if available (this is the actual message content)
          displayContent = parsed.parsed_content;
        } else if (parsed.agent1_data?.output) {
          // Agent1 specific content
          displayContent = parsed.agent1_data.output;
        } else if (parsed.agent2_data?.output) {
          // Agent2 specific content
          displayContent = parsed.agent2_data.output;
        } else {
          // Fallback to the success message
          displayContent = parsed.message;
        }
        
        // Check for special Agent1 actions
        const isAgent1 = parsed.agent1_data;
        const hasCredentialRequest = isAgent1 && parsed.agent1_data.requestCredentials === true;
        const hasFlowChange = isAgent1 && parsed.agent1_data.flowChange === true;
        
        console.log('🔍 Flow change detection:', {
          isAgent1: !!isAgent1,
          flowChange: parsed.agent1_data?.flowChange,
          hasFlowChange: hasFlowChange,
          agent1_data: parsed.agent1_data
        });
        
        // If this is a credential request, trigger the credential form
        if (hasCredentialRequest) {
          console.log('🔐 CREDENTIAL REQUEST DETECTED!');
          console.log('🔐 Full parsed data:', parsed);
          console.log('🔐 agent1_data:', parsed.agent1_data);
          console.log('🔐 credential_request:', parsed.credential_request);
          
          // Extract credential data from either credential_request or agent1_data
          let credentialData = {};
          
          if (parsed.credential_request && parsed.credential_request.requested_credentials) {
            console.log('🔐 Using credential_request data');
            const req = parsed.credential_request.requested_credentials;
            credentialData = {
              Platform1: req.platform1 && req.platform1.trim() !== '' ? req.platform1 : undefined,
              CredentialName1: req.credentialName1 && req.credentialName1.trim() !== '' ? req.credentialName1 : undefined,
              Platform2: req.platform2 && req.platform2.trim() !== '' ? req.platform2 : undefined,
              CredentialName2: req.credentialName2 && req.credentialName2.trim() !== '' ? req.credentialName2 : undefined,
              Platform3: req.platform3 && req.platform3.trim() !== '' ? req.platform3 : undefined,
              CredentialName3: req.credentialName3 && req.credentialName3.trim() !== '' ? req.credentialName3 : undefined,
              Platform4: req.platform4 && req.platform4.trim() !== '' ? req.platform4 : undefined,
              CredentialName4: req.credentialName4 && req.credentialName4.trim() !== '' ? req.credentialName4 : undefined
            };
          } else if (parsed.agent1_data) {
            console.log('🔐 Using agent1_data fallback');
            const data = parsed.agent1_data;
            
            // Check if credentials are in a nested credentials object
            if (data.credentials) {
              console.log('🔐 Found credentials in nested object:', data.credentials);
              const creds = data.credentials;
              credentialData = {
                Platform1: creds.platform1 && creds.platform1.trim() !== '' ? creds.platform1 : undefined,
                CredentialName1: creds.credentialName1 && creds.credentialName1.trim() !== '' ? creds.credentialName1 : undefined,
                Platform2: creds.platform2 && creds.platform2.trim() !== '' ? creds.platform2 : undefined,
                CredentialName2: creds.credentialName2 && creds.credentialName2.trim() !== '' ? creds.credentialName2 : undefined,
                Platform3: creds.platform3 && creds.platform3.trim() !== '' ? creds.platform3 : undefined,
                CredentialName3: creds.credentialName3 && creds.credentialName3.trim() !== '' ? creds.credentialName3 : undefined,
                Platform4: creds.platform4 && creds.platform4.trim() !== '' ? creds.platform4 : undefined,
                CredentialName4: creds.credentialName4 && creds.credentialName4.trim() !== '' ? creds.credentialName4 : undefined
              };
            } else {
              // Fallback to direct properties
              credentialData = {
                Platform1: data.platform1 && data.platform1.trim() !== '' ? data.platform1 : undefined,
                CredentialName1: data.credentialName1 && data.credentialName1.trim() !== '' ? data.credentialName1 : undefined,
                Platform2: data.platform2 && data.platform2.trim() !== '' ? data.platform2 : undefined,
                CredentialName2: data.credentialName2 && data.credentialName2.trim() !== '' ? data.credentialName2 : undefined,
                Platform3: data.platform3 && data.platform3.trim() !== '' ? data.platform3 : undefined,
                CredentialName3: data.credentialName3 && data.credentialName3.trim() !== '' ? data.credentialName3 : undefined,
                Platform4: data.platform4 && data.platform4.trim() !== '' ? data.platform4 : undefined,
                CredentialName4: data.credentialName4 && data.credentialName4.trim() !== '' ? data.credentialName4 : undefined
              };
            }
          }
          
          console.log('🔐 FINAL CREDENTIAL DATA:', credentialData);
          
          // Count non-undefined values
          const nonUndefinedCount = Object.values(credentialData).filter(val => val !== undefined).length;
          console.log('🔐 Non-undefined credential values count:', nonUndefinedCount);
          
          // Only show credential form if we have valid credential data
          if (nonUndefinedCount > 0) {
            console.log('✅ CREDENTIAL DATA FOUND - Showing popup!');
            return {
              isCredentialRequest: true,
              isAgentResponse: true,
              agentType: 'Agent1',
              content: displayContent,
              credentialData,
              rawData: parsed
            };
          } else {
            console.log('❌ NO CREDENTIAL DATA FOUND - Skipping credential form');
            // Return as regular agent response without credential form
            return {
              isCredentialRequest: false,
              isAgentResponse: true,
              agentType: 'Agent1',
              content: displayContent,
              rawData: parsed
            };
          }
        }
        
        // Handle credential request from new Agent 1
        if (parsed.action === 'CREDENTIAL_REQUEST') {
          console.log('🔐 Detected credential request from Agent1');
          console.log('🔐 Platform:', parsed.platform);
          console.log('🔐 Fields:', parsed.fields);
          
          const credentialData = {
            platforms: [{
              platform: parsed.platform,
              credentialName: parsed.platform,
              requestedFields: parsed.fields || []
            }]
          };
          
          return {
            isCredentialRequest: true,
            isAgentResponse: true,
            agentType: 'Agent1',
            content: parsed.message || `Please provide your ${parsed.platform} credentials`,
            credentialData,
            rawData: parsed
          };
        }
        
        // Handle new Agent 1 response format
        if (parsed.action === 'FLOW_CHANGE' && parsed.steps) {
          console.log('🔄 Detected new format flow change from Agent1');
          console.log('🔄 Steps:', parsed.steps);
          
          // Convert new format to legacy format for compatibility
          const steps: Array<{id: string, content: string, order: number, tool_id?: string, context?: any}> = [];
          parsed.steps.forEach((step: any, index: number) => {
            steps.push({
              id: `step-${Date.now()}-${index + 1}`,
              content: step.instruction,
              order: index,
              tool_id: step.tool_id,
              context: step.context
            });
            console.log(`✅ Added step ${index + 1}:`, step.instruction);
          });
          
          const projectContext = parsed.projectContext || '';
          console.log('🔄 Project context:', projectContext);
          console.log('🔄 Total steps found:', steps.length);
          
          // Dispatch flow update event only once per message
          if (!message.flowEventDispatched) {
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('flowStepsUpdated', {
                detail: { 
                  threadId: message.thread_id, 
                  steps: steps, 
                  projectContext: projectContext 
                }
              }));
              console.log('📡 Dispatched flowStepsUpdated event with', steps.length, 'steps');
              // Mark message as having dispatched the event
              message.flowEventDispatched = true;
            }, 100);
          } else {
            console.log('🔄 Flow event already dispatched for this message, skipping');
          }
        }
        
        // Handle legacy flow change format
        if (hasFlowChange) {
          console.log('🔄 Detected legacy flow change from Agent1');
          console.log('🔄 Full agent1_data:', parsed.agent1_data);
          
          // Extract steps and project context
          const steps: Array<{id: string, content: string, order: number}> = [];
          for (let i = 1; i <= 20; i++) {
            const stepKey = `Step${i}`; // Use capital S to match API field names
            const stepContent = parsed.agent1_data[stepKey];
            console.log(`🔄 Checking ${stepKey}:`, stepContent);
            
            if (stepContent && stepContent.trim()) {
              steps.push({
                id: `step-${Date.now()}-${i}`,
                content: stepContent.trim(),
                order: i - 1
              });
              console.log(`✅ Added step ${i}:`, stepContent.trim());
            }
          }
          
          const projectContext = parsed.agent1_data.projectContext || '';
          console.log('🔄 Project context:', projectContext);
          console.log('🔄 Total steps found:', steps.length);
          
          // Dispatch flow update event only once per message
          if (!message.flowEventDispatched) {
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('flowStepsUpdated', {
                detail: { 
                  threadId: message.thread_id, 
                  steps: steps, 
                  projectContext: projectContext 
                }
              }));
              console.log('📡 Dispatched flowStepsUpdated event with', steps.length, 'steps');
              // Mark message as having dispatched the event
              message.flowEventDispatched = true;
            }, 100);
          } else {
            console.log('🔄 Flow event already dispatched for this message, skipping');
          }
        }
        
        return {
          isCredentialRequest: false,
          isAgentResponse: true,
          agentType: parsed.agent1_data ? 'Agent1' : parsed.agent2_data ? 'Agent2' : 'Agent',
          content: displayContent,
          rawData: parsed
        };
      }
      
      // Handle other JSON responses
      if (parsed.message) {
        return {
          isCredentialRequest: false,
          isAgentResponse: false,
          content: parsed.message
        };
      }
      
    } catch {
      // Not JSON, treat as regular message
    }
    
    return {
      isCredentialRequest: false,
      isAgentResponse: false,
      content: message.content
    };
  };

  const formatTime = (dateString: string) => {
    const time = new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return `${time} (${timezone})`;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
          <p className="text-gray-300">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden" data-chat-interface>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Load Older Messages Button */}
        {hasOlderMessages && (
          <div className="flex justify-center mb-4">
            <button
              onClick={() => loadMessages(true)}
              disabled={loadingOlder}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50"
            >
              {loadingOlder ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading...</span>
                </>
              ) : (
                <span>Load Older Messages</span>
              )}
            </button>
          </div>
        )}
        
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <Bot className="w-12 h-12 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-400 mb-3">Describe what you want to build</p>
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 max-w-md mx-auto">
              <p className="text-sm text-slate-300 mb-2 font-medium">Example:</p>
              <p className="text-sm text-slate-400 italic">
                "Create a Wispix automation that monitors my Gmail inbox for new emails from clients, 
                extracts key information, and adds tasks to my project management tool"
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className="flex justify-start"
            >
              {(() => {
                const parsedMessage = parseMessageContent(message);
                console.log('🔐 Message parsing result:', {
                  isCredentialRequest: parsedMessage.isCredentialRequest,
                  isAgentResponse: parsedMessage.isAgentResponse,
                  agentType: parsedMessage.agentType,
                  credentialData: parsedMessage.credentialData
                });
                
                if (parsedMessage.isCredentialRequest) {
                  console.log('🔐 Rendering agent output + CredentialForm with data:', parsedMessage.credentialData);
                  return (
                    <div className="w-full space-y-4">
                      {/* Agent's output message */}
                      <div className="max-w-2xl lg:max-w-4xl px-4 py-3 rounded-2xl bg-blue-900/30 text-blue-100 border-l-4 border-blue-500">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs opacity-60">
                            {formatTime(message.created_at)}
                          </span>
                          <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                            {parsedMessage.agentType}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap">{parsedMessage.content}</p>
                      </div>
                      
                      {/* Credential form */}
                      <div className="max-w-md">
                        <CredentialForm
                          credentialData={parsedMessage.credentialData}
                          threadId={thread.id}
                          userId={user?.id || ''}
                          onCredentialSubmitted={async ({ platform, service_name, credential_id, traceId }) => {
                            console.log('🔐 onCredentialSubmitted payload', { platform, service_name, credential_id, traceId });
                            await fetch('/api/credentials/submitted', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                thread_id: thread.id,
                                user_id: user?.id,
                                platform,
                                service_name,
                                credential_id,
                                traceId
                              })
                            });
                          }}
                        />
                      </div>
                    </div>
                  );
                }
                
                // Check if this is a thinking message
                const isThinking = message.content.includes('Agent is thinking') || message.content.includes('Agent 2 is thinking');
                
                return (
                  <div
                    className={`max-w-2xl lg:max-w-4xl px-4 py-3 rounded-2xl transition-all duration-300 ${
                      message.sender_type === 'user'
                        ? 'bg-slate-800/50 text-cyan-300'
                        : isThinking
                        ? 'bg-amber-900/30 text-amber-100 border-l-4 border-amber-500 animate-pulse'
                        : parsedMessage.isAgentResponse
                        ? 'bg-blue-900/30 text-blue-100 border-l-4 border-blue-500'
                        : 'bg-slate-800/30 text-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs opacity-60">
                        {formatTime(message.created_at)}
                      </span>
                      {isThinking ? (
                        <span className="text-xs bg-amber-600 text-white px-2 py-1 rounded-full flex items-center">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-2"></div>
                          {message.sender_type === 'agent1' ? 'Agent 1' : 'Agent 2'} Thinking
                        </span>
                      ) : parsedMessage.isAgentResponse ? (
                        <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                          {parsedMessage.agentType}
                        </span>
                      ) : null}
                    </div>
                    <p className="whitespace-pre-wrap">{parsedMessage.content}</p>
                  </div>
                );
              })()}
            </div>
          ))
        )}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-slate-800/30 text-gray-100 max-w-2xl lg:max-w-4xl px-4 py-3 rounded-2xl">
              <div className="flex items-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="ml-2 text-sm">Agent is typing...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-slate-900 border-t border-slate-700 p-6 flex-shrink-0">
        <form onSubmit={sendMessage} className="relative" data-chat-form>
          <div className="flex items-center bg-slate-800 border border-slate-600 rounded-2xl p-2 focus-within:border-cyan-500 focus-within:shadow-glow transition-all duration-300">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              disabled={sending}
              className="flex-1 px-4 py-3 bg-transparent text-gray-100 placeholder-slate-400 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="bg-cyan-600 text-white p-3 rounded-xl hover:bg-cyan-700 hover:shadow-glow focus:ring-2 focus:ring-cyan-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ml-2"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}