import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase, AutomationThread } from '../lib/supabase';
import { Plus, MessageSquare, Clock, LogOut, Settings, Bot, Workflow, Activity, Trash2, ArrowLeft, User, ChevronDown, AlertTriangle, X, MoreVertical, Edit3, Copy, Files } from 'lucide-react';
import { ChatInterface } from './ChatInterface';
import { FlowMapping } from './FlowMapping';
import { ActivityLog } from './ActivityLog';
import { CredentialsView } from './CredentialsView';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  threadName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmationModal({ isOpen, threadName, onConfirm, onCancel }: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-modal>
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 max-w-md w-full">
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 bg-red-600/20 rounded-full flex items-center justify-center mr-4">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-100">Delete Automation</h3>
            <p className="text-sm text-gray-400">This action cannot be undone</p>
          </div>
        </div>
        
        <p className="text-gray-300 mb-6">
          Are you sure you want to delete <span className="font-medium text-gray-100">"{threadName}"</span>? 
          This will permanently remove the automation and all its data.
        </p>
        
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-xl hover:bg-gray-700 transition-all duration-300"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-300"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export function Dashboard() {
  const { user, signOut } = useAuth();
  const [threads, setThreads] = useState<AutomationThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<AutomationThread | null>(null);
  const [isAutomationExecuting, setIsAutomationExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState<'split' | 'activity'>('split');
  const [hasFlowSteps, setHasFlowSteps] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [renamingThread, setRenamingThread] = useState<string | null>(null);
  const [newThreadName, setNewThreadName] = useState('');
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'info';
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    message: ''
  });
  // Removed global scheduling toggle - not needed
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    threadId: string;
    threadName: string;
  }>({
    isOpen: false,
    threadId: '',
    threadName: ''
  });

  useEffect(() => {
    // Listen for activity tab switch requests from flow interface
    const handleActivityTabSwitch = (event: CustomEvent) => {
      if (event.detail.threadId === selectedThread?.id) {
        setActiveTab('activity');
      }
    };
    
    // Listen for activity log refresh events from flow interface
    const handleActivityRefresh = (event: CustomEvent) => {
      if (event.detail.threadId === selectedThread?.id) {
        // Activity log will handle its own refresh
        console.log('Activity log refresh requested for thread:', selectedThread.id);
      }
    };
    
    // Listen for flow steps updates
    const handleFlowStepsUpdated = (event: CustomEvent) => {
      if (event.detail.threadId === selectedThread?.id) {
        console.log('🔄 Flow steps updated, showing flow panel');
        setHasFlowSteps(true);
      }
    };
    
    window.addEventListener('switchToActivityTab', handleActivityTabSwitch as EventListener);
    window.addEventListener('refreshActivityLog', handleActivityRefresh as EventListener);
    window.addEventListener('flowStepsUpdated', handleFlowStepsUpdated as EventListener);
    
    return () => {
      window.removeEventListener('switchToActivityTab', handleActivityTabSwitch as EventListener);
      window.removeEventListener('refreshActivityLog', handleActivityRefresh as EventListener);
      window.removeEventListener('flowStepsUpdated', handleFlowStepsUpdated as EventListener);
    };
  }, [selectedThread?.id]);

  useEffect(() => {
    if (user) {
      loadThreads();
    }
  }, [user]);

  // Check for running executions on mount and reset executing state if none found
  useEffect(() => {
    if (!user?.id) return;

    const checkRunningExecutions = async () => {
      try {
        const { data: runningExecutions, error } = await supabase
          .from('flow_executions')
          .select('id, status')
          .eq('user_id', user.id)
          .in('status', ['running', 'pending']);

        if (error) {
          console.error('❌ Error checking running executions:', error);
          return;
        }

        if (runningExecutions.length === 0) {
          console.log('✅ No running executions found, resetting executing state');
          setIsAutomationExecuting(false);
        } else {
          console.log(`📊 Found ${runningExecutions.length} running executions`);
        }
      } catch (error) {
        console.error('❌ Error checking running executions:', error);
      }
    };

    checkRunningExecutions();
  }, [user?.id]);

  // Listen for flow creation events to auto-open split screen
  useEffect(() => {
    if (!user?.id) return;

    console.log('🔄 Setting up flow creation listener for user:', user.id);
    
    const flowSubscription = supabase
      .channel(`flow_creation:${user.id}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'automation_flows',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 Flow creation detected:', payload);
          const newFlow = payload.new;
          
          // Find the thread for this flow
          const thread = threads.find(t => t.id === newFlow.thread_id);
          if (thread) {
            console.log('✅ Opening split screen for flow creation:', thread.name);
            setSelectedThread(thread);
            // Default to Chat&Flow tab when opening thread
            setActiveTab('split');
            
            // Show a notification
            window.dispatchEvent(new CustomEvent('showNotification', {
              detail: {
                type: 'success',
                message: `Flow created for ${thread.name} with ${newFlow.steps?.length || 0} steps`
              }
            }));
          }
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'automation_flows',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 Flow update detected:', payload);
          const updatedFlow = payload.new;
          
          // If this thread is currently selected, refresh the flow
          if (selectedThread?.id === updatedFlow.thread_id) {
            console.log('✅ Refreshing flow for selected thread');
            // Trigger a flow refresh event
            window.dispatchEvent(new CustomEvent('flowStepsUpdated', {
              detail: {
                threadId: updatedFlow.thread_id,
                steps: updatedFlow.steps || [],
                projectContext: updatedFlow.project_context || ''
              }
            }));
          }
        }
      )
      .subscribe();

    // Also monitor execution status changes to reset executing state
    const executionSubscription = supabase
      .channel(`execution_status:${user.id}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'flow_executions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 Execution status change detected:', payload);
          const execution = payload.new;
          
          // If execution is completed, failed, or cancelled, reset executing state
          if (execution.status === 'completed' || execution.status === 'failed' || execution.status === 'cancelled') {
            console.log('✅ Execution finished, resetting executing state');
            setIsAutomationExecuting(false);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 Cleaning up flow creation listener');
      flowSubscription.unsubscribe();
      executionSubscription.unsubscribe();
    };
  }, [user?.id, threads, selectedThread?.id]);

  // Listen for notification events
  useEffect(() => {
    const handleNotification = (event: CustomEvent) => {
      setNotification({
        isOpen: true,
        type: event.detail.type,
        message: event.detail.message
      });
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        setNotification(prev => ({ ...prev, isOpen: false }));
      }, 5000);
    };

    window.addEventListener('showNotification', handleNotification as EventListener);
    
    return () => {
      window.removeEventListener('showNotification', handleNotification as EventListener);
    };
  }, []);

  // Check for existing flow steps when thread is selected
  useEffect(() => {
    const checkExistingFlowSteps = async () => {
      if (selectedThread && user) {
        try {
          const { data: flow } = await supabase
            .from('automation_flows')
            .select('steps')
            .eq('thread_id', selectedThread.id)
            .maybeSingle();
          
          if (flow && flow.steps && flow.steps.length > 0) {
            console.log('🔄 Existing flow steps found, showing flow panel');
            setHasFlowSteps(true);
          } else {
            console.log('🔄 No existing flow steps, hiding flow panel');
            setHasFlowSteps(false);
          }
        } catch (error) {
          console.error('Error checking existing flow steps:', error);
          setHasFlowSteps(false);
        }
      } else {
        setHasFlowSteps(false);
      }
    };

    checkExistingFlowSteps();
  }, [selectedThread, user]);

  // Close dropdown when clicking outside (disabled for now to fix delete button)
  // useEffect(() => {
  //   const handleClickOutside = (event: MouseEvent) => {
  //     if (activeDropdown) {
  //       setActiveDropdown(null);
  //     }
  //   };

  //   if (activeDropdown) {
  //     document.addEventListener('mousedown', handleClickOutside);
  //   }

  //   return () => {
  //     document.removeEventListener('mousedown', handleClickOutside);
  //   };
  // }, [activeDropdown]);

  const loadThreads = async () => {
    try {
      const { data, error } = await supabase
        .from('automation_threads')
        .select('*')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setThreads(data || []);
    } catch (error) {
      console.error('Error loading threads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (threadId: string, threadName: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    setDeleteModal({
      isOpen: true,
      threadId,
      threadName
    });
  };

  const confirmDelete = async () => {
    const { threadId } = deleteModal;

    try {
      const { error } = await supabase
        .from('automation_threads')
        .delete()
        .eq('id', threadId)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Update threads list
      setThreads(threads.filter(thread => thread.id !== threadId));
      
      // Clear selection if deleted thread was selected
      if (selectedThread?.id === threadId) {
        setSelectedThread(null);
      }
      
      // Close modal
      setDeleteModal({ isOpen: false, threadId: '', threadName: '' });
    } catch (error) {
      console.error('Error deleting thread:', error);
      alert('Failed to delete automation. Please try again.');
    }
  };

  const cancelDelete = () => {
    setDeleteModal({ isOpen: false, threadId: '', threadName: '' });
  };

  const handleRenameClick = (threadId: string, currentName: string) => {
    setRenamingThread(threadId);
    setNewThreadName(currentName);
    setActiveDropdown(null);
  };

  const confirmRename = async (threadId: string) => {
    if (!newThreadName.trim()) return;

    try {
      const { error } = await supabase
        .from('automation_threads')
        .update({ 
          name: newThreadName.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', threadId)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Update threads list
      const updatedThread = { 
        ...threads.find(t => t.id === threadId), 
        name: newThreadName.trim(),
        updated_at: new Date().toISOString()
      };
      
      setThreads(threads.map(thread => 
        thread.id === threadId 
          ? updatedThread
          : thread
      ));
      
      // Update selected thread if it's the one being renamed
      if (selectedThread?.id === threadId) {
        setSelectedThread(updatedThread);
      }
      
      setRenamingThread(null);
      setNewThreadName('');
    } catch (error) {
      console.error('Error renaming thread:', error);
      alert('Failed to rename automation. Please try again.');
    }
  };

  const cancelRename = () => {
    setRenamingThread(null);
    setNewThreadName('');
  };

  const toggleAutomation = async (threadId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('automation_threads')
        .update({ 
          enabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', threadId)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Update threads list
      const updatedThread = { 
        ...threads.find(t => t.id === threadId), 
        enabled,
        updated_at: new Date().toISOString()
      };
      
      setThreads(threads.map(thread => 
        thread.id === threadId 
          ? updatedThread
          : thread
      ));
      
      // Update selected thread if it's the one being toggled
      if (selectedThread?.id === threadId) {
        setSelectedThread(updatedThread);
      }
    } catch (error) {
      console.error('Error toggling automation:', error);
      alert('Failed to toggle automation. Please try again.');
    }
  };

  const createNewThread = async () => {
    try {
      console.log('🧵 Creating new thread:', { userId: user?.id, threadsCount: threads.length });
      
      // Check if user is authenticated
      if (!user?.id) {
        throw new Error('User not authenticated. Please sign in and try again.');
      }

      const threadName = `Automation ${threads.length + 1}`;
      const automationId = `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const { data, error } = await supabase
        .from('automation_threads')
        .insert({
          user_id: user.id,
          name: threadName,
          automation_id: automationId,
          enabled: false
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating thread:', error);
        throw error;
      }

      console.log('✅ Thread created successfully:', data.id);
      setThreads([data, ...threads]);
      setSelectedThread(data);
      // Ensure we start on the Chat&Flow tab when creating a new automation
      setActiveTab('split');
    } catch (error) {
      console.error('❌ Error creating thread:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to create automation: ${errorMessage}`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const copyAutomationId = async (automationId: string) => {
    try {
      await navigator.clipboard.writeText(automationId);
      // You could add a toast notification here
      console.log('Automation ID copied to clipboard');
    } catch (error) {
      console.error('Failed to copy automation ID:', error);
    }
  };

  const duplicateAutomation = async (threadId: string) => {
    try {
      const response = await fetch('/api/duplicate-automation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceThreadId: threadId,
          userId: user?.id
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Add new thread to the list and select it
        setThreads([result.newThread, ...threads]);
        setSelectedThread(result.newThread);
        // Default to Chat&Flow tab when duplicating automation
        setActiveTab('split');
        setActiveDropdown(null); // Close dropdown
        console.log('✅ Automation duplicated successfully');
      } else {
        throw new Error(result.error || 'Failed to duplicate automation');
      }
    } catch (error) {
      console.error('Error duplicating automation:', error);
      alert('Failed to duplicate automation. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
            <p className="mt-4 text-gray-300">Loading your Wispix automations...</p>
        </div>
      </div>
    );
  }

  // Dashboard view - show cards of all automations
  if (!selectedThread) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 overflow-y-auto">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-100">Wispix Dashboard</h1>
              <p className="text-gray-400 mt-1">Manage and monitor your automations</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={createNewThread}
                className="bg-cyan-600 text-white px-6 py-3 rounded-xl hover:bg-cyan-700 hover:shadow-glow transition-all duration-300 flex items-center"
              >
                <Plus className="w-5 h-5 mr-2" />
                New Automation
              </button>
              
              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center space-x-2 p-3 text-gray-400 hover:text-gray-200 rounded-xl hover:bg-gray-700 transition-all duration-300"
                >
                  <User className="w-5 h-5" />
                  <ChevronDown className="w-4 h-4" />
                </button>
                
                {/* Dropdown Menu */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-xl shadow-lg z-50">
                    <div className="py-2">
                      <div className="px-4 py-2 border-b border-gray-700">
                        <p className="text-sm text-gray-300 truncate">{user?.email}</p>
                      </div>
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          setShowCredentials(true);
                        }}
                        className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-gray-100 transition-colors duration-200 flex items-center"
                      >
                        <Settings className="w-4 h-4 mr-3" />
                        View Credentials
                      </button>
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          signOut();
                        }}
                        className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors duration-200 flex items-center"
                      >
                        <LogOut className="w-4 h-4 mr-3" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Agent URLs Display - Dynamic */}
        <div className="bg-amber-900/20 border-b border-amber-700/30 px-6 py-3">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-amber-200">Agent Endpoints (Live)</span>
              </div>
              <div className="text-xs text-amber-300/70">For n8n webhook configuration</div>
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span className="text-sm font-medium text-blue-200">Agent 1 (Chat Messages)</span>
                </div>
                <div className="bg-gray-900/50 rounded p-2 font-mono text-xs text-gray-300 break-all">
                  {window.location.origin}/api/agent1-response
                </div>
                <div className="text-xs text-gray-400 mt-1">POST requests for chat responses</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-sm font-medium text-green-200">Agent 2 (Automation Steps)</span>
                </div>
                <div className="bg-gray-900/50 rounded p-2 font-mono text-xs text-gray-300 break-all">
                  {window.location.origin}/api/agent2-response
                </div>
                <div className="text-xs text-gray-400 mt-1">POST requests for step executions</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span className="text-sm font-medium text-purple-200">Flow Creation</span>
                </div>
                <div className="bg-gray-900/50 rounded p-2 font-mono text-xs text-gray-300 break-all">
                  {window.location.origin}/api/create-flow
                </div>
                <div className="text-xs text-gray-400 mt-1">POST requests for creating automation flows</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                  <span className="text-sm font-medium text-orange-200">Credential Requests</span>
                </div>
                <div className="bg-gray-900/50 rounded p-2 font-mono text-xs text-gray-300 break-all">
                  {window.location.origin}/api/agent-request-credentials
                </div>
                <div className="text-xs text-gray-400 mt-1">POST requests for requesting user credentials</div>
              </div>
            </div>
          </div>
        </div>

        {/* Click outside to close dropdown */}
        {/* Dashboard Content */}
        <div className="p-6">
          {showCredentials ? (
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center mb-6">
                <button
                  onClick={() => setShowCredentials(false)}
                  className="p-2 text-gray-400 hover:text-gray-200 rounded-xl hover:bg-gray-700 transition-all duration-300 mr-4"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-bold text-gray-100">Credentials</h1>
              </div>
              <CredentialsView />
            </div>
          ) : (
          threads.length === 0 ? (
            <div className="text-center py-20">
              <MessageSquare className="w-20 h-20 text-gray-500 mx-auto mb-6" />
              <h3 className="text-xl font-medium text-gray-100 mb-3">
                No automations yet
              </h3>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">
                Create your first automation to get started with Wispix
              </p>
              <button
                onClick={createNewThread}
                className="bg-cyan-600 text-white px-8 py-4 rounded-xl hover:bg-cyan-700 hover:shadow-glow transition-all duration-300 flex items-center mx-auto"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create First Automation
              </button>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              {/* Table Header */}
              <div className="bg-gray-700 px-6 py-4 border-b border-gray-600">
                <div className="grid grid-cols-12 gap-4 items-center text-sm font-medium text-gray-300">
                  <div className="col-span-1 hidden sm:block">Status</div>
                  <div className="col-span-6 sm:col-span-5">Name</div>
                  <div className="col-span-3 sm:col-span-2 hidden md:block">Automation ID</div>
                  <div className="col-span-3 hidden lg:block">Features</div>
                  <div className="col-span-1">Actions</div>
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-gray-700">
              {threads.map((thread) => (
                <div
                  key={thread.id}
                    className={`px-6 py-4 transition-all duration-300 cursor-pointer group hover:bg-gray-750 ${
                      thread.enabled 
                        ? 'hover:bg-gray-750' 
                        : 'opacity-60'
                    }`}
                    onClick={() => {
                      setSelectedThread(thread);
                      // Default to Chat&Flow tab when selecting a thread
                      setActiveTab('split');
                    }}
                  >
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* Status Toggle */}
                      <div className="col-span-1 hidden sm:block">
                        <label className="flex items-center space-x-2 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={thread.enabled}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleAutomation(thread.id, e.target.checked);
                              }}
                              className="sr-only"
                            />
                            <div className={`w-11 h-6 rounded-full transition-colors duration-200 ${
                              thread.enabled ? 'bg-cyan-500' : 'bg-gray-600'
                            }`}>
                              <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                                thread.enabled ? 'translate-x-5' : 'translate-x-0.5'
                              }`} style={{ marginTop: '2px' }}></div>
                            </div>
                          </div>
                        </label>
                      </div>

                      {/* Name */}
                      <div className="col-span-6 sm:col-span-5">
                        {renamingThread === thread.id ? (
                          <input
                            type="text"
                            value={newThreadName}
                            onChange={(e) => setNewThreadName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                confirmRename(thread.id);
                              } else if (e.key === 'Escape') {
                                cancelRename();
                              }
                              e.stopPropagation();
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onBlur={() => confirmRename(thread.id)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm font-semibold"
                            autoFocus
                          />
                        ) : (
                          <div>
                            <div className="flex items-center space-x-2">
                              {/* Mobile Status Toggle */}
                              <div className="sm:hidden">
                                <label className="flex items-center space-x-1 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                  <div className="relative">
                                    <input
                                      type="checkbox"
                                      checked={thread.enabled}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        toggleAutomation(thread.id, e.target.checked);
                                      }}
                                      className="sr-only"
                                    />
                                    <div className={`w-8 h-4 rounded-full transition-colors duration-200 ${
                                      thread.enabled ? 'bg-cyan-500' : 'bg-gray-600'
                                    }`}>
                                      <div className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                                        thread.enabled ? 'translate-x-4' : 'translate-x-0.5'
                                      }`} style={{ marginTop: '2px' }}></div>
                                    </div>
                                  </div>
                                </label>
                              </div>
                              <h3 className="font-semibold text-gray-100 group-hover:text-cyan-100 transition-colors duration-300">
                                {thread.name}
                              </h3>
                            </div>
                            <div className="flex items-center text-sm text-gray-400 mt-1">
                              <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
                              <span className="text-xs">{formatDate(thread.updated_at)}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Automation ID */}
                      <div className="col-span-3 sm:col-span-2 hidden md:block">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500 font-mono bg-gray-700 px-2 py-1 rounded flex items-center space-x-2">
                            <span className="truncate">{thread.automation_id}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyAutomationId(thread.automation_id);
                              }}
                              className="hover:text-gray-300 transition-colors flex-shrink-0"
                              title="Copy Automation ID"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </span>
                        </div>
                      </div>


                      {/* Features */}
                      <div className="col-span-3 hidden lg:block">
                        <div className="flex items-center space-x-3 text-gray-500">
                          <MessageSquare className="w-4 h-4" title="Chat Interface" />
                          <Workflow className="w-4 h-4" title="Flow Mapping" />
                          <Activity className="w-4 h-4" title="Activity Log" />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="col-span-1">
                        <div className="flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdown(activeDropdown === thread.id ? null : thread.id);
                      }}
                      className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-all duration-200"
                      title="More options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    
                    {/* Dropdown menu */}
                    {activeDropdown === thread.id && (
                            <div className="absolute right-6 z-50 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl min-w-[160px] overflow-hidden" data-dropdown>
                        <div className="py-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    duplicateAutomation(thread.id);
                                  }}
                                  className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-gray-100 transition-colors duration-200 flex items-center"
                                >
                                  <Files className="w-4 h-4 mr-3" />
                                  Duplicate
                                </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRenameClick(thread.id, thread.name);
                                    setActiveDropdown(null);
                            }}
                            className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-gray-100 transition-colors duration-200 flex items-center"
                          >
                            <Edit3 className="w-4 h-4 mr-3" />
                            Rename
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteModal({ isOpen: true, threadId: thread.id, threadName: thread.name });
                              setActiveDropdown(null);
                            }}
                            className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors duration-200 flex items-center"
                          >
                            <Trash2 className="w-4 h-4 mr-3" />
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                      </div>
                    </div>
                  </div>
                ))}
                </div>
            </div>
          )
          )}
        </div>

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={deleteModal.isOpen}
          threadName={deleteModal.threadName}
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      </div>
    );
  }

  // Thread view - show selected automation interface with split screen
  return (
    <div className="h-screen bg-gray-900 text-gray-100 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSelectedThread(null)}
              className="p-2 text-gray-400 hover:text-gray-200 rounded-xl hover:bg-gray-700 transition-all duration-300"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-gray-100">
              {selectedThread.name}
            </h2>
          </div>
          <button className="p-2 text-gray-400 hover:text-gray-200 rounded-xl hover:bg-gray-700 transition-all duration-300">
            <Settings className="w-5 h-5" />
          </button>
        </div>
        <div className="text-sm text-gray-400">
          {isAutomationExecuting ? (
            <div className="flex items-center">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse mr-2"></div>
              Automation running...
            </div>
          ) : (
            'Ready to automate'
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tab Navigation */}
        <div className="bg-gray-800 border-b border-gray-700 px-6">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('split')}
              className={`px-4 py-3 text-sm font-medium rounded-t-lg transition-all duration-300 flex items-center ${
                activeTab === 'split'
                  ? 'bg-gray-900 text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
              }`}
            >
              <Bot className="w-4 h-4 mr-2" />
              Chat & Flow
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-4 py-3 text-sm font-medium rounded-t-lg transition-all duration-300 flex items-center ${
                activeTab === 'activity'
                  ? 'bg-gray-900 text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
              }`}
            >
              <Activity className="w-4 h-4 mr-2" />
              Activity
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeTab === 'split' && (
            <div className="flex-1 flex overflow-hidden">
              {/* Left Panel - Chat */}
              <div className={`flex flex-col ${hasFlowSteps ? 'w-1/2 border-r border-gray-700' : 'w-full'} transition-all duration-500`}>
                <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex-shrink-0">
                  <div className="flex items-center text-sm font-medium text-gray-200">
                    <Bot className="w-4 h-4 mr-2" />
                    Chat
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
            <ChatInterface thread={selectedThread} />
                </div>
              </div>

              {/* Right Panel - Flow (Conditionally Visible) */}
              {hasFlowSteps && (
                <div className="w-1/2 flex flex-col bg-slate-950 transition-all duration-500">
                  <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex-shrink-0">
                    <div className="flex items-center text-sm font-medium text-gray-200">
                      <Workflow className="w-4 h-4 mr-2" />
                      Flow
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
            <FlowMapping 
              thread={selectedThread} 
              setIsAutomationExecuting={setIsAutomationExecuting}
              isExecuting={isAutomationExecuting}
                      onToggleAutomation={toggleAutomation}
            />
                  </div>
                </div>
              )}
            </div>
          )}
          {activeTab === 'activity' && (
            <ActivityLog thread={selectedThread} />
          )}
        </div>
      </div>

      {/* Notification */}
      {notification.isOpen && (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
          <div className={`rounded-lg p-4 shadow-lg border-l-4 ${
            notification.type === 'success'
              ? 'bg-green-900/20 border-green-500 text-green-100'
              : notification.type === 'error'
              ? 'bg-red-900/20 border-red-500 text-red-100'
              : 'bg-blue-900/20 border-blue-500 text-blue-100'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-3 ${
                  notification.type === 'success' 
                    ? 'bg-green-400' 
                    : notification.type === 'error'
                    ? 'bg-red-400'
                    : 'bg-blue-400'
                }`}></div>
                <p className="text-sm font-medium">{notification.message}</p>
              </div>
              <button
                onClick={() => setNotification(prev => ({ ...prev, isOpen: false }))}
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