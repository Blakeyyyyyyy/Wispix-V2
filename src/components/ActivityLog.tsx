import { useState, useEffect, useRef } from 'react';
import { supabase, AutomationThread, ActivityLog as ActivityLogType, FlowExecution } from '../lib/supabase';
import { Clock, Loader2, MessageCircle, CheckCircle, XCircle, ChevronRight, Calendar, RefreshCw, Trash2, AlertTriangle, Calendar as Schedule, Zap, Square, X } from 'lucide-react';

interface ActivityLogProps {
  thread: AutomationThread;
}

interface ExecutionWithLogs extends FlowExecution {
  logs: ActivityLogType[];
}

export function ActivityLog({ thread }: ActivityLogProps) {
  const [executions, setExecutions] = useState<ExecutionWithLogs[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<ExecutionWithLogs | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    executionId: string;
    executionStatus: string;
  }>({
    isOpen: false,
    executionId: '',
    executionStatus: ''
  });
  const [forceStopModal, setForceStopModal] = useState<{
    isOpen: boolean;
    executionId: string;
    executionStatus: string;
  }>({
    isOpen: false,
    executionId: '',
    executionStatus: ''
  });
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    type: 'success' | 'error';
    message: string;
  }>({
    isOpen: false,
    type: 'success',
    message: ''
  });
  const [clearAllModal, setClearAllModal] = useState<{
    isOpen: boolean;
  }>({
    isOpen: false
  });
  const [nextScheduledRun, setNextScheduledRun] = useState<{
    time: Date | null;
    type: 'one-time' | 'recurring' | null;
    cronExpression: string | null;
  }>({
    time: null,
    type: null,
    cronExpression: null
  });
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadLogs();
    
    // Add real-time subscription to flow_executions
    const executionsSubscription = supabase
      .channel(`executions_updates:${thread.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'flow_executions',
          filter: `thread_id=eq.${thread.id}`,
        },
        (payload) => {
          console.log('🔄 Real-time execution update:', payload);
          console.log('🔄 Payload details:', {
            eventType: payload.eventType,
            table: payload.table,
            new: payload.new,
            old: payload.old
          });
          // Show updating indicator
          setUpdating(true);
          // Refresh the executions list
          loadLogs(true); // Pass true to indicate this is a refresh, not initial load
          }
        )
      .subscribe();

    // Add real-time subscription to chat_messages for thinking indicators
    const chatSubscription = supabase
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
          console.log('🔄 Real-time chat update:', payload);
          // Refresh the executions list to include new thinking messages
          loadLogs(true);
        }
      )
      .subscribe();

    // No need for direct activity log handling since we only use execution results
    const handleRefreshActivityLog = (event: CustomEvent) => {
      if (event.detail.threadId === thread.id) {
        loadLogs(true);
      }
    };

    window.addEventListener('refreshActivityLog', handleRefreshActivityLog as EventListener);

    return () => {
      executionsSubscription.unsubscribe();
      chatSubscription.unsubscribe();
      window.removeEventListener('refreshActivityLog', handleRefreshActivityLog as EventListener);
    };
  }, [thread.id]);

  useEffect(() => {
    scrollToBottom();
  }, [selectedExecution?.logs]);

  // Update next run countdown every minute
  useEffect(() => {
    if (!nextScheduledRun.time) return;

    const interval = setInterval(() => {
      // Force a re-render to update the countdown
      setNextScheduledRun(prev => ({ ...prev }));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [nextScheduledRun.time]);

  const loadLogs = async (isRefresh = false) => {
    console.log('📺 ACTIVITY - Loading executions for thread:', thread.id);
    if (!isRefresh) {
    setLoading(true);
    }
    setRefreshing(true);
    try {
      // Load all executions for this thread
      const { data: executions, error: executionError } = await supabase
        .from('flow_executions')
        .select('*')
        .eq('thread_id', thread.id)
        .order('created_at', { ascending: false });

      if (executionError) throw executionError;

      console.log('📺 ACTIVITY - Loaded executions from database:', executions?.map(exec => ({
        id: exec.id,
        status: exec.status,
        created_at: exec.created_at,
        updated_at: exec.updated_at
      })));

      // Load chat messages for this thread (including thinking messages)
      const { data: chatMessages, error: chatError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('thread_id', thread.id)
        .order('created_at', { ascending: true });

      if (chatError) {
        console.error('❌ Error loading chat messages:', chatError);
      }

      // Optimize log processing with memoization
      const executionsWithLogs: ExecutionWithLogs[] = (executions || []).map(execution => {
        const stepLogs: ActivityLogType[] = [];
        
        // Add execution start log
        stepLogs.push({
          id: `exec-${execution.id}-start`,
          thread_id: execution.thread_id,
          user_id: execution.user_id,
          content: `Starting automation with ${execution.total_steps} steps...`,
          sender_type: 'system',
          created_at: execution.created_at
        } as ActivityLogType);

        // Add thinking messages and agent responses from chat_messages
        if (chatMessages) {
          const executionChatMessages = chatMessages.filter(msg => 
            msg.created_at >= execution.created_at && 
            (msg.created_at <= execution.completed_at || !execution.completed_at)
          );

          executionChatMessages.forEach(msg => {
            // Check if this is a thinking message
            const isThinking = msg.content.includes('Agent is thinking') || msg.content.includes('Agent 2 is thinking');
            
            stepLogs.push({
              id: msg.id,
              thread_id: msg.thread_id,
              user_id: msg.user_id,
              content: msg.content,
              sender_type: isThinking ? 'system' : (msg.sender_type as 'system' | 'agent1' | 'agent2'),
              created_at: msg.created_at
            } as ActivityLogType);
          });
        }

        // Process results - only show HTTP POST responses, not webhook responses
        if (execution.results && execution.results.length > 0) {
          execution.results.forEach((result: any) => {
            // Add step execution log
            stepLogs.push({
              id: `exec-${execution.id}-step-${result.step_number}`,
              thread_id: execution.thread_id,
              user_id: execution.user_id,
              content: `Step ${result.step_number}: ${result.content}`,
              sender_type: 'system',
              created_at: result.timestamp || execution.created_at
            } as ActivityLogType);

            // Only show agent response if it came from HTTP POST (not webhook)
            // Check if this is a real HTTP POST response (not webhook response)
            if (result.response && result.status !== 'pending') {
              let responseContent: string;
              
              // The response field contains the actual agent content from the HTTP request
              // This is what should be displayed, not the webhook response
              console.log('🔍 Processing agent response:', {
                step_number: result.step_number,
                response_type: typeof result.response,
                response_value: result.response,
                status: result.status
              });
              
              if (typeof result.response === 'string') {
                responseContent = result.response;
              } else if (typeof result.response === 'object') {
                try {
                  // Handle nested JSON structure - look for the actual agent content
                  if (result.response.output && typeof result.response.output === 'object') {
                    // This is the actual agent response content
                    responseContent = result.response.output.Output || result.response.output.content || JSON.stringify(result.response.output);
                  } else if (result.response.content) {
                    // Direct content field
                    responseContent = result.response.content;
                  } else if (result.response.message) {
                    // Message field
                    responseContent = result.response.message;
                  } else {
                    // Fallback to stringify
                    responseContent = JSON.stringify(result.response);
                  }
                } catch (e) {
                  responseContent = String(result.response);
                }
              } else {
                responseContent = String(result.response);
              }
              
              console.log('🔍 Final response content:', responseContent);

              stepLogs.push({
                id: `exec-${execution.id}-response-${result.step_number}`,
                thread_id: execution.thread_id,
                user_id: execution.user_id,
                content: responseContent,
                sender_type: 'agent2',
                created_at: result.timestamp || execution.created_at
              } as ActivityLogType);
            } else if (result.status === 'pending') {
              // Show waiting message for pending steps
              stepLogs.push({
                id: `exec-${execution.id}-waiting-${result.step_number}`,
                thread_id: execution.thread_id,
                user_id: execution.user_id,
                content: `Waiting for Agent 2 response...`,
                sender_type: 'system',
                created_at: result.timestamp || execution.created_at
              } as ActivityLogType);
            }
          });
        }

        // Sort logs by timestamp
        stepLogs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        return {
          ...execution,
          logs: stepLogs
        };
      });

      console.log('📺 ACTIVITY - Loaded executions with logs:', executionsWithLogs);
      setExecutions(executionsWithLogs);
      
      // Also load next scheduled run
      await loadNextScheduledRun();

      // Update selected execution if it exists and has been updated
      if (selectedExecution) {
        const updatedSelectedExecution = executionsWithLogs.find(exec => exec.id === selectedExecution.id);
        if (updatedSelectedExecution) {
          console.log('🔄 Updating selected execution with new data');
          setSelectedExecution(updatedSelectedExecution);
        }
      } else if (executionsWithLogs.length > 0) {
        // Auto-select the most recent execution if none selected
        setSelectedExecution(executionsWithLogs[0]);
      }
    } catch (error) {
      console.error('Error loading executions:', error);
    } finally {
      if (!isRefresh) {
      setLoading(false);
      }
      setRefreshing(false);
      setUpdating(false);
    }
  };

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'stopped':
        return <Square className="w-4 h-4 text-orange-400" />;
      case 'scheduled':
        return <Calendar className="w-4 h-4 text-purple-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'running':
        return 'Running';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'stopped':
        return 'Stopped';
      case 'scheduled':
        return 'Scheduled';
      default:
        return status;
    }
  };

  const parseLogContent = (content: string) => {
    try {
      const parsed = JSON.parse(content);
      
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
        
        return {
          isAgentResponse: true,
          agentType: parsed.agent1_data ? 'Agent1' : parsed.agent2_data ? 'Agent2' : 'Agent',
          content: displayContent,
          rawData: parsed
        };
      }
      
      // Handle other JSON responses
      if (parsed.message) {
        return {
          isAgentResponse: false,
          content: parsed.message
        };
      }
      
    } catch {
      // Not JSON, treat as regular message
    }
    
    return {
      isAgentResponse: false,
      content: content
    };
  };

  const handleDeleteExecution = (executionId: string, executionStatus: string) => {
    setDeleteModal({
      isOpen: true,
      executionId,
      executionStatus
    });
  };

  const handleForceStopExecution = (executionId: string, executionStatus: string) => {
    setForceStopModal({
      isOpen: true,
      executionId,
      executionStatus
    });
  };

  const confirmDeleteExecution = async () => {
    const { executionId } = deleteModal;
    
    try {
      const { error } = await supabase
        .from('flow_executions')
        .delete()
        .eq('id', executionId)
        .eq('thread_id', thread.id);

      if (error) throw error;

      // Update local state
      setExecutions(prev => prev.filter(exec => exec.id !== executionId));
      
      // Clear selection if deleted execution was selected
      if (selectedExecution?.id === executionId) {
        setSelectedExecution(null);
      }
      
      // Refresh next scheduled run
      await loadNextScheduledRun();
      
      // Close modal
      setDeleteModal({ isOpen: false, executionId: '', executionStatus: '' });
    } catch (error) {
      console.error('Error deleting execution:', error);
      showNotification('error', 'Failed to delete execution. Please try again.');
    }
  };

  const cancelDeleteExecution = () => {
    setDeleteModal({ isOpen: false, executionId: '', executionStatus: '' });
  };

  const confirmForceStopExecution = async () => {
    const { executionId } = forceStopModal;
    
    try {
      // Get the current user ID for validation
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        showNotification('error', 'You must be logged in to stop executions');
        return;
      }

      // Call the force stop API endpoint
      const response = await fetch('/api/force-stop-execution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          executionId: executionId,
          userId: user.id
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to force stop execution');
      }

      const result = await response.json();
      console.log('🛑 Force stop API response:', result);

      // Update the execution status locally
      setExecutions(prev => prev.map(exec => 
        exec.id === executionId 
          ? { ...exec, status: 'cancelled' as const, error_message: 'Force stopped by user' }
          : exec
      ));

      // Update selected execution if it's the one being stopped
      if (selectedExecution?.id === executionId) {
        setSelectedExecution(prev => prev ? { ...prev, status: 'cancelled' as const, error_message: 'Force stopped by user' } : null);
      }

      console.log('🛑 Local state updated for execution:', executionId);
      
      // Force a refresh from the database to ensure UI is in sync
      // Use multiple refresh attempts to handle any timing issues
      setTimeout(() => {
        console.log('🛑 Refreshing from database after force stop (attempt 1)');
        loadLogs(true);
      }, 500);
      
      setTimeout(() => {
        console.log('🛑 Refreshing from database after force stop (attempt 2)');
        loadLogs(true);
      }, 2000);
      
      showNotification('success', 'Execution force stopped successfully');
    } catch (error) {
      console.error('Error force stopping execution:', error);
      showNotification('error', 'Failed to force stop execution. Please try again.');
    } finally {
      setForceStopModal({
        isOpen: false,
        executionId: '',
        executionStatus: ''
      });
    }
  };

  const cancelForceStopExecution = () => {
    setForceStopModal({
      isOpen: false,
      executionId: '',
      executionStatus: ''
    });
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({
      isOpen: true,
      type,
      message
    });
    
    // Auto-hide notification after 3 seconds
    setTimeout(() => {
      setNotification(prev => ({ ...prev, isOpen: false }));
    }, 3000);
  };

  const closeNotification = () => {
    setNotification(prev => ({ ...prev, isOpen: false }));
  };

  const handleClearAllExecutions = () => {
    setClearAllModal({ isOpen: true });
  };

  const confirmClearAllExecutions = async () => {

    try {
      const { error } = await supabase
        .from('flow_executions')
        .delete()
        .eq('thread_id', thread.id);

      if (error) throw error;

      // Clear local state
      setExecutions([]);
      setSelectedExecution(null);
      setNextScheduledRun({ time: null, type: null, cronExpression: null });
      
      // Close modal and show success notification
      setClearAllModal({ isOpen: false });
      showNotification('success', 'All executions cleared successfully');
    } catch (error) {
      console.error('Error clearing all executions:', error);
      showNotification('error', 'Failed to clear all executions. Please try again.');
    }
  };

  const cancelClearAllExecutions = () => {
    setClearAllModal({ isOpen: false });
  };

  const loadNextScheduledRun = async () => {
    try {
      // Load the next scheduled execution
      const { data: scheduledExecutions, error } = await supabase
        .from('flow_executions')
        .select('scheduled_for, next_scheduled_run, cron_expression, status')
        .eq('thread_id', thread.id)
        .eq('is_scheduled', true)
        .in('status', ['scheduled'])
        .order('created_at', { ascending: true })
        .limit(1);

      if (error) {
        console.error('Error loading next scheduled run:', error);
        return;
      }

      if (scheduledExecutions && scheduledExecutions.length > 0) {
        const execution = scheduledExecutions[0];
        let nextRunTime: Date | null = null;
        let type: 'one-time' | 'recurring' | null = null;

        if (execution.scheduled_for) {
          // One-time execution
          nextRunTime = new Date(execution.scheduled_for);
          type = 'one-time';
        } else if (execution.next_scheduled_run) {
          // Recurring execution
          nextRunTime = new Date(execution.next_scheduled_run);
          type = 'recurring';
        }

        setNextScheduledRun({
          time: nextRunTime,
          type: type,
          cronExpression: execution.cron_expression
        });
      } else {
        setNextScheduledRun({ time: null, type: null, cronExpression: null });
      }
    } catch (error) {
      console.error('Error loading next scheduled run:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mx-auto mb-2" />
          <p className="text-slate-300">Loading executions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden h-full">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-slate-200">Execution History</h3>
          <div className="flex items-center space-x-2">
            {executions.length > 0 && (
              <button
                onClick={handleClearAllExecutions}
                className="p-2 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-900/20 transition-all duration-200 flex items-center space-x-2"
                title="Clear all executions"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-xs">Clear All</span>
              </button>
            )}
            <button
              onClick={() => loadLogs(true)}
              disabled={refreshing || updating}
              className="p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-700 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh executions"
            >
              <RefreshCw className={`w-4 h-4 ${(refreshing || updating) ? 'animate-spin' : ''}`} />
              <span className="text-xs">
                {refreshing ? 'Refreshing...' : updating ? 'Updating...' : 'Refresh'}
              </span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Next Run Tracker */}
      {nextScheduledRun.time && (
        <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-3 mx-4 mb-4">
          <div className="flex items-center space-x-2">
            {nextScheduledRun.type === 'one-time' ? (
              <Schedule className="w-4 h-4 text-purple-400" />
            ) : (
              <Zap className="w-4 h-4 text-purple-400" />
            )}
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-purple-200">
                  Next {nextScheduledRun.type === 'one-time' ? 'Run' : 'Scheduled Run'}:
                </span>
                <span className="text-sm text-purple-300">
                  {nextScheduledRun.time.toLocaleString()} ({Intl.DateTimeFormat().resolvedOptions().timeZone})
                </span>
              </div>
              <div className="text-xs text-purple-400 mt-1">
                {nextScheduledRun.type === 'one-time' 
                  ? 'One-time execution' 
                  : `Recurring (${nextScheduledRun.cronExpression || 'cron'})`
                }
              </div>
            </div>
            <div className="text-xs text-purple-400">
              {(() => {
                const now = new Date();
                const diff = nextScheduledRun.time.getTime() - now.getTime();
                const minutes = Math.floor(diff / (1000 * 60));
                const hours = Math.floor(minutes / 60);
                const days = Math.floor(hours / 24);
                
                if (days > 0) {
                  return `in ${days}d ${hours % 24}h`;
                } else if (hours > 0) {
                  return `in ${hours}h ${minutes % 60}m`;
                } else if (minutes > 0) {
                  return `in ${minutes}m`;
                } else {
                  return 'soon';
                }
              })()}
            </div>
          </div>
        </div>
      )}
      
      <div className="flex-1 flex h-0">
        {/* Execution List */}
        <div className="w-1/3 border-r border-slate-700 bg-slate-900/50 flex flex-col">
          <div className="p-4 border-b border-slate-700 flex-shrink-0">
            <h4 className="text-sm font-medium text-slate-200 mb-2">Executions</h4>
            <p className="text-xs text-slate-400">{executions.length} total</p>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {executions.length === 0 ? (
              <div className="p-4 text-center">
                <MessageCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No executions yet</p>
                <p className="text-xs text-slate-500 mt-1">
                  Execute an automation to see Wispix history
            </p>
          </div>
        ) : (
              executions.map((execution) => (
                <div
                  key={execution.id}
                  onClick={() => setSelectedExecution(execution)}
                  className={`p-4 border-b border-slate-700 cursor-pointer transition-colors duration-200 ${
                    selectedExecution?.id === execution.id
                      ? 'bg-cyan-900/30 border-l-4 border-l-cyan-500'
                      : execution.status === 'failed'
                      ? 'bg-red-900/20 border-l-4 border-l-red-500 hover:bg-red-900/30'
                      : 'hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(execution.status)}
                      <span className="text-sm font-medium text-slate-200">
                        {getStatusText(execution.status)}
                  </span>
                </div>
                    <div className="flex items-center space-x-1">
                      {execution.status === 'running' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleForceStopExecution(execution.id, execution.status);
                          }}
                          className="p-1 text-slate-400 hover:text-orange-400 rounded hover:bg-orange-900/20 transition-all duration-200"
                          title="Force stop execution"
                        >
                          <Square className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteExecution(execution.id, execution.status);
                        }}
                        className="p-1 text-slate-400 hover:text-red-400 rounded hover:bg-red-900/20 transition-all duration-200"
                        title="Delete execution"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-xs text-slate-400">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(execution.created_at).toLocaleString()} ({Intl.DateTimeFormat().resolvedOptions().timeZone})</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MessageCircle className="w-3 h-3" />
                      <span>{execution.total_steps} steps</span>
                    </div>
                    {execution.status === 'failed' && execution.error_message && (
                      <div className="flex items-center space-x-1 text-red-400">
                        <XCircle className="w-3 h-3" />
                        <span className="truncate max-w-48" title={execution.error_message}>
                          {execution.error_message}
                        </span>
                      </div>
                    )}
              </div>
            </div>
          ))
        )}
          </div>
        </div>

        {/* Execution Details */}
        <div className="flex-1 flex flex-col bg-slate-900/30 h-full">
          {selectedExecution ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Execution Header */}
              <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(selectedExecution.status)}
                    <div>
                      <h4 className="font-medium text-slate-200">
                        {getStatusText(selectedExecution.status)}
                      </h4>
                      <p className="text-sm text-slate-400">
                        {selectedExecution.total_steps} steps • {new Date(selectedExecution.created_at).toLocaleString()} ({Intl.DateTimeFormat().resolvedOptions().timeZone})
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {selectedExecution.status === 'running' && (
                      <div className="flex items-center space-x-2 text-cyan-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Processing...</span>
                      </div>
                    )}
                    {selectedExecution.status === 'failed' && selectedExecution.error_message && (
                      <div className="flex items-center space-x-2 text-red-400">
                        <XCircle className="w-4 h-4" />
                        <span className="text-sm">Failed</span>
                      </div>
                    )}
                    {updating && (
                      <div className="flex items-center space-x-2 text-cyan-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Updating...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {selectedExecution.status === 'failed' && selectedExecution.error_message && (
                <div className="bg-red-900/20 border-l-4 border-l-red-500 px-4 py-3 mx-4 mt-4 rounded-r-lg flex-shrink-0">
                  <div className="flex items-start space-x-2">
                    <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-red-200 mb-1">Execution Failed</h4>
                      <p className="text-sm text-red-100 whitespace-pre-wrap">{selectedExecution.error_message}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Execution Logs */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {selectedExecution.logs.map((log) => {
                    // Check if this is a thinking message
                    const isThinking = log.content.includes('Agent is thinking') || log.content.includes('Agent 2 is thinking');
                    
                    return (
                      <div
                        key={log.id}
                        className={`w-full rounded-lg border-l-4 px-4 py-3 ${
                          isThinking
                            ? 'border-l-amber-500 bg-amber-500/10 text-amber-100 animate-pulse'
                            : log.sender_type === 'system'
                            ? 'border-l-blue-500 bg-blue-500/10 text-blue-100'
                            : 'border-l-gray-500 bg-gray-500/10 text-gray-100'
                        }`}
                      >
              <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {isThinking ? (
                              <span className="text-xs font-medium px-2 py-1 rounded bg-amber-500/20 text-amber-300 flex items-center">
                                <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse mr-2"></div>
                                {log.content.includes('Agent 2 is thinking') ? 'AGENT 2 THINKING' : 'AGENT 1 THINKING'}
                              </span>
                            ) : (
                              <span className={`text-xs font-medium px-2 py-1 rounded ${
                                log.sender_type === 'system'
                                  ? 'bg-blue-500/20 text-blue-300'
                                  : 'bg-gray-500/20 text-gray-300'
                              }`}>
                                {log.sender_type === 'system' ? 'SYSTEM' : 'AGENT'}
                              </span>
                            )}
                            <span className="text-xs text-slate-400">
                              {new Date(log.created_at).toLocaleTimeString()} ({Intl.DateTimeFormat().resolvedOptions().timeZone})
                            </span>
                          </div>
                        </div>
                        {(() => {
                          const parsedLog = parseLogContent(log.content);
                          return (
                            <div>
                              {parsedLog.isAgentResponse && !isThinking && (
                                <div className="mb-2">
                                  <span className="inline-block bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                                    {parsedLog.agentType}
                </span>
                                </div>
                              )}
                              <p className="text-sm whitespace-pre-wrap leading-relaxed">{parsedLog.content}</p>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                  <div ref={logsEndRef} />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-300 mb-2">Select an Execution</h3>
                <p className="text-slate-400">
                  Choose an execution from the list to view its details
                </p>
              </div>
            </div>
          )}
          </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-modal>
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-red-600/20 rounded-full flex items-center justify-center mr-4">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-100">Delete Execution</h3>
                <p className="text-sm text-gray-400">This action cannot be undone</p>
              </div>
            </div>
            
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete this execution? 
              <br />
              <span className="text-sm text-gray-400">
                Status: <span className="font-medium text-gray-200">{deleteModal.executionStatus}</span>
              </span>
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={cancelDeleteExecution}
                className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-xl hover:bg-gray-700 transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteExecution}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-300"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Force Stop Confirmation Modal */}
      {forceStopModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-modal>
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-orange-600/20 rounded-full flex items-center justify-center mr-4">
                <Square className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-100">Force Stop Execution</h3>
                <p className="text-sm text-gray-400">This will immediately stop the running execution</p>
              </div>
            </div>
            
            <p className="text-gray-300 mb-6">
              Are you sure you want to force stop this execution? 
              <br />
              <span className="text-sm text-gray-400">
                Status: <span className="font-medium text-gray-200">{forceStopModal.executionStatus}</span>
              </span>
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={cancelForceStopExecution}
                className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-xl hover:bg-gray-700 transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={confirmForceStopExecution}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-all duration-300"
              >
                Force Stop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {clearAllModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-modal>
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-red-600/20 rounded-full flex items-center justify-center mr-4">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-100">Clear All Executions</h3>
                <p className="text-sm text-gray-400">This action cannot be undone</p>
              </div>
            </div>
            
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete <span className="font-medium text-gray-100">ALL executions</span> for this automation? 
              This will permanently remove all execution history.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={cancelClearAllExecutions}
                className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-xl hover:bg-gray-700 transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={confirmClearAllExecutions}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-300"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification.isOpen && (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
          <div className={`rounded-lg p-4 shadow-lg border-l-4 ${
            notification.type === 'success' 
              ? 'bg-green-900/20 border-green-500 text-green-100' 
              : 'bg-red-900/20 border-red-500 text-red-100'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-3 ${
                  notification.type === 'success' ? 'bg-green-400' : 'bg-red-400'
                }`}></div>
                <p className="text-sm font-medium">{notification.message}</p>
              </div>
              <button
                onClick={closeNotification}
                className="ml-4 text-gray-400 hover:text-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}