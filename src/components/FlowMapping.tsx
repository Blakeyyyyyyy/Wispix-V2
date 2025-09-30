import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase, AutomationThread, AutomationFlow, FlowStep, FlowExecution } from '../lib/supabase';
import { Plus, Trash2, Play, GripVertical, ArrowDown, Clock, Calendar, Settings, Pause, PlayCircle, StopCircle } from 'lucide-react';

interface FlowMappingProps {
  thread: AutomationThread;
  setIsAutomationExecuting: (executing: boolean) => void;
  isExecuting: boolean;
  onToggleAutomation?: (threadId: string, enabled: boolean) => void;
}

interface ScheduleConfig {
  enabled: boolean;
  frequency: 'minutes' | 'hours' | 'days' | 'weeks';
  interval: number;
  startTime?: string;
  endTime?: string;
  daysOfWeek?: number[]; // 0 = Sunday, 1 = Monday, etc.
  endDate?: string;
  scheduledFor?: string; // For one-time scheduling
  hasTimeRange: boolean; // Whether to use start and end time
}

interface ScheduledJob {
  id: string;
  executionId: string;
  jobId: string;
  cronExpression?: string;
  scheduledFor?: string;
  status: string;
  nextRun?: string;
  isRecurring: boolean;
}

export function FlowMapping({ thread, setIsAutomationExecuting, isExecuting, onToggleAutomation }: FlowMappingProps) {
  const { user } = useAuth();
  const [flow, setFlow] = useState<AutomationFlow | null>(null);
  const [steps, setSteps] = useState<FlowStep[]>([]);
  const [projectContext, setProjectContext] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig>({
    enabled: false,
    frequency: 'hours',
    interval: 1,
    startTime: '09:00',
    endTime: '17:00',
    daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
    hasTimeRange: true,
  });
  const [isScheduled, setIsScheduled] = useState(false);
  const [currentExecution, setCurrentExecution] = useState<FlowExecution | null>(null);
  const [executionStatus, setExecutionStatus] = useState<'idle' | 'starting' | 'running' | 'completed' | 'failed'>('idle');
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([]);
  const [showAdvancedSchedule, setShowAdvancedSchedule] = useState(false);
  const [isUpdatingFromEvent, setIsUpdatingFromEvent] = useState(false);

  useEffect(() => {
    if (user?.id && !isUpdatingFromEvent) {
      loadFlow();
      loadScheduledJobs();
      loadScheduleConfig(); // Load schedule configuration from database
    }
  }, [thread.id, user?.id, isUpdatingFromEvent]);
  
  useEffect(() => {
    // Listen for flow updates from chat interface
    const handleFlowUpdate = (event: CustomEvent) => {
      console.log('🔄 FlowMapping received flowStepsUpdated event:', event.detail);
      console.log('🔄 Current thread ID:', thread.id);
      console.log('🔄 Event thread ID:', event.detail.threadId);
      
      if (event.detail.threadId === thread.id) {
        console.log('✅ Thread ID matches, updating steps:', event.detail.steps);
        
        // Set flag to prevent loadFlow() from running
        setIsUpdatingFromEvent(true);
        
        setSteps(event.detail.steps);
        if (event.detail.projectContext) {
          console.log('✅ Updating project context:', event.detail.projectContext);
          setProjectContext(event.detail.projectContext);
        }
        
        // Reset flag after a short delay to allow state updates to complete
        setTimeout(() => {
          setIsUpdatingFromEvent(false);
          console.log('✅ Flow state updated directly, flag reset');
        }, 200);
      } else {
        console.log('❌ Thread ID mismatch, ignoring event');
      }
    };
    
    window.addEventListener('flowStepsUpdated', handleFlowUpdate as EventListener);
    
    return () => {
      window.removeEventListener('flowStepsUpdated', handleFlowUpdate as EventListener);
    };
  }, [thread.id]);

  // Function to add message directly to activity
  const addToActivity = (content: string, senderType: 'system' | 'agent2' = 'system') => {
    const newLog = {
      id: crypto.randomUUID(),
      thread_id: thread.id,
      user_id: user?.id,
      content,
      sender_type: senderType,
      created_at: new Date().toISOString()
    };
    
    // Send to Activity tab immediately
    window.dispatchEvent(new CustomEvent('addActivityLog', {
      detail: { threadId: thread.id, log: newLog }
    }));
    
    // Also save to database (but don't wait for it)
    supabase
      .from('activity_logs')
      .insert(newLog)
      .then(({ error }) => {
        if (error) console.error('Failed to save to database:', error);
      });
  };
  const loadFlow = async () => {
    setLoading(true);
    try {
      // Use proper automation_flows table
      let { data, error } = await supabase
        .from('automation_flows')
        .select('*')
        .eq('thread_id', thread.id)
        .maybeSingle();

      if (error) {
        console.log('No existing flow found, will create on first save');
        setSteps([]);
        return;
      }

      if (data) {
        setSteps(data.steps || []);
        setProjectContext(data.project_context || '');
      } else {
        setSteps([]);
        setProjectContext('');
      }
    } catch (error) {
      console.error('Error loading flow:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveFlow = async () => {
    try {
      console.log('💾 Saving flow:', { 
        threadId: thread.id, 
        userId: user?.id, 
        stepsCount: steps.length,
        projectContext: projectContext?.substring(0, 50) + '...'
      });

      // Check if user is authenticated
      if (!user?.id) {
        throw new Error('User not authenticated. Please sign in and try again.');
      }

      // Use proper automation_flows table
      const { data: existingFlow, error: fetchError } = await supabase
        .from('automation_flows')
        .select('id')
        .eq('thread_id', thread.id)
        .maybeSingle();

      if (fetchError) {
        console.error('❌ Error fetching existing flow:', fetchError);
        throw fetchError;
      }

      if (existingFlow) {
        // Update existing flow
        console.log('📝 Updating existing flow:', existingFlow.id);
        const { error } = await supabase
          .from('automation_flows')
          .update({ 
            steps: steps,
            project_context: projectContext 
          })
          .eq('thread_id', thread.id);

        if (error) {
          console.error('❌ Error updating flow:', error);
          throw error;
        }
        console.log('✅ Flow updated successfully');
      } else {
        // Create new flow
        console.log('📝 Creating new flow');
        const { error } = await supabase
          .from('automation_flows')
          .insert({
            thread_id: thread.id,
            user_id: user.id,
            steps: steps,
            project_context: projectContext
          });

        if (error) {
          console.error('❌ Error creating flow:', error);
          throw error;
        }
        console.log('✅ Flow created successfully');
      }
    } catch (error) {
      console.error('❌ Error saving flow:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to save automation flow: ${errorMessage}`);
    }
  };

  const addStep = () => {
    const newStep: FlowStep = {
      id: crypto.randomUUID(),
      content: '',
      order: steps.length,
    };
    const newSteps = [...steps, newStep];
    setSteps(newSteps);
    // Save will be triggered by the next render
    setTimeout(() => saveFlow(), 0);
  };

  const updateStep = (stepId: string, content: string) => {
    const newSteps = steps.map(step =>
      step.id === stepId ? { ...step, content } : step
    );
    setSteps(newSteps);
    setTimeout(() => saveFlow(), 0);
  };

  const deleteStep = (stepId: string) => {
    const newSteps = steps
      .filter(step => step.id !== stepId)
      .map((step, index) => ({ ...step, order: index }));
    setSteps(newSteps);
    setTimeout(() => saveFlow(), 0);
  };

  const moveStep = (stepId: string, direction: 'up' | 'down') => {
    const currentIndex = steps.findIndex(step => step.id === stepId);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === steps.length - 1)
    ) {
      return;
    }

    const newSteps = [...steps];
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    [newSteps[currentIndex], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[currentIndex]];
    
    // Update order
    newSteps.forEach((step, index) => {
      step.order = index;
    });

    setSteps(newSteps);
    setTimeout(() => saveFlow(), 0);
  };

  const executeAutomation = async () => {
    console.log('🚀 Execute automation clicked:', { 
      userId: user?.id, 
      threadId: thread.id, 
      stepsCount: steps.length,
      isExecuting: isExecuting,
      threadEnabled: thread.enabled
    });

    if (!user?.id) {
      console.error('❌ User not authenticated');
      alert('You must be logged in to execute automations.');
      return;
    }

    if (steps.length === 0) {
      console.error('❌ No steps defined');
      alert('Please add at least one step to the automation.');
      return;
    }

    // Check if automation is enabled
    if (!thread.enabled) {
      console.error('❌ Automation disabled');
      alert('This automation is disabled. Please enable it to run automations.');
      return;
    }

    // Prevent multiple executions
    if (isExecuting) {
      console.log('🚫 Automation already running, ignoring execute request');
      return;
    }

    // Switch to activity tab when execution starts
    window.dispatchEvent(new CustomEvent('switchToActivityTab', {
      detail: { threadId: thread.id }
    }));

    setExecutionStatus('starting');
    setIsAutomationExecuting(true);

    try {
      // Generate unique thread ID for this execution
      const executionThreadId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log('🆔 Generated unique execution thread ID:', executionThreadId);

      // Create execution record in database
      console.log('📝 Creating execution record...');
      const { data: execution, error: createError } = await supabase
        .from('flow_executions')
        .insert({
          thread_id: thread.id, // Keep original thread ID for database relationships
          execution_thread_id: executionThreadId, // Add unique thread ID for agent communication
          automation_id: thread.automation_id,
          user_id: user.id, // Use user.id instead of user?.id
          status: 'pending',
          steps: steps,
          project_context: projectContext,
          current_step: 0,
          total_steps: steps.length,
          results: []
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating execution:', createError);
        throw createError;
      }

      console.log('✅ Execution created successfully:', execution.id);

      setCurrentExecution(execution);
      setExecutionStatus('running');

      // Update execution status to running in database immediately
      await supabase
        .from('flow_executions')
        .update({ 
          status: 'running',
          started_at: new Date().toISOString()
        })
        .eq('id', execution.id);

      // Trigger activity log refresh to show new execution
      window.dispatchEvent(new CustomEvent('refreshActivityLog', {
        detail: { threadId: thread.id }
      }));

      // Start backend processing via API
      console.log('🚀 Starting backend execution with:', {
        executionId: execution.id,
        threadId: thread.id,
        automationId: thread.automation_id,
        steps: steps.length
      });

      const response = await fetch('/api/execute-flow', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
          executionId: execution.id,
          threadId: thread.id,
          automationId: thread.automation_id,
          userId: user.id, // Use user.id instead of user?.id
          steps: steps,
          projectContext: projectContext
            }),
          });

      console.log('🚀 Execute-flow response:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🚀 Execute-flow error:', errorText);
        
        let errorMessage = `Failed to start execution: ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage += ` - ${errorData.error}`;
          if (errorData.details) {
            errorMessage += ` (${errorData.details})`;
          }
        } catch {
          errorMessage += ` - ${errorText}`;
        }
        
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      console.log('🚀 Execute-flow success:', responseData);

      // Start polling for updates
      pollExecutionStatus(execution.id);

    } catch (error) {
      console.error('Error starting automation:', error);
      addToActivity('Error starting automation: ' + (error as Error).message, 'system');
      setExecutionStatus('failed');
      setIsAutomationExecuting(false);
    }
  };

  const pollExecutionStatus = async (executionId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const { data: execution, error } = await supabase
          .from('flow_executions')
          .select('*')
          .eq('id', executionId)
          .single();

        if (error) {
          console.error('Error polling execution status:', error);
          return;
        }

        if (execution) {
          setCurrentExecution(execution);

          // Check if execution is complete
          if (execution.status === 'completed') {
            clearInterval(pollInterval);
            setExecutionStatus('completed');
            setIsAutomationExecuting(false);
          } else if (execution.status === 'failed') {
            clearInterval(pollInterval);
            setExecutionStatus('failed');
            setIsAutomationExecuting(false);
          }
        }
      } catch (error) {
        console.error('Error polling execution:', error);
      }
    }, 2000); // Poll every 2 seconds

    // Stop polling after 10 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 600000);
  };

  // Scheduling functions
  const handleScheduleToggle = async () => {
    if (isScheduled) {
      // Stop scheduling - disable in database and cancel any scheduled executions
      try {
        // Disable schedule configuration
        const { error: scheduleError } = await supabase
          .from('automation_schedules')
          .update({ enabled: false })
          .eq('thread_id', thread.id);

        if (scheduleError) {
          console.error('Failed to disable schedule:', scheduleError);
          alert('Failed to stop schedule. Please try again.');
          return;
        }

        // Cancel any pending/running scheduled executions
        const { error: executionError } = await supabase
          .from('flow_executions')
          .update({ status: 'cancelled' })
          .eq('thread_id', thread.id)
          .eq('is_scheduled', true)
          .in('status', ['scheduled', 'pending']);

        if (executionError) {
          console.error('Failed to cancel scheduled executions:', executionError);
        }

        // Update UI state
        setIsScheduled(false);
        setScheduleConfig(prev => ({ ...prev, enabled: false }));
        setScheduledJobs([]);
        addToActivity('Scheduled automation stopped', 'system');
        console.log('✅ Schedule disabled and executions cancelled');
      } catch (error) {
        console.error('Error stopping schedule:', error);
        alert('Failed to stop schedule. Please try again.');
      }
    } else {
      // Show schedule modal (allow even when automation is disabled)
      setShowScheduleModal(true);
    }
  };

  const saveSchedule = async () => {
    // Check if automation is enabled
    if (!thread.enabled) {
      alert('This automation is disabled. Please enable it to schedule automations.');
      return;
    }

    // Check if user is authenticated
    if (!user?.id) {
      alert('You must be logged in to schedule automations.');
      return;
    }

    // Check if thread ID exists
    if (!thread.id) {
      alert('Invalid automation thread. Please refresh the page and try again.');
      return;
    }

    try {
      let cronExpression: string | undefined;
      let scheduledFor: string | undefined;

      if (showAdvancedSchedule) {
        // One-time scheduling
        if (!scheduleConfig.scheduledFor) {
          alert('Please select a date and time for scheduling');
          return;
        }
        // Convert datetime-local value to UTC for validation and storage
        const localDateTime = new Date(scheduleConfig.scheduledFor);
        const now = new Date();
        const timeDiff = localDateTime.getTime() - now.getTime();
        
        console.log('🕐 One-time scheduling validation:');
        console.log('🕐 Selected time (local):', scheduleConfig.scheduledFor);
        console.log('🕐 Converted to UTC:', localDateTime.toISOString());
        console.log('🕐 Current time (UTC):', now.toISOString());
        console.log('🕐 Time difference (minutes):', Math.round(timeDiff / (1000 * 60)));
        
        if (localDateTime <= now) {
          alert(`Please select a future date and time. Selected: ${localDateTime.toLocaleString()} (${Intl.DateTimeFormat().resolvedOptions().timeZone}), Current: ${now.toLocaleString()} (${Intl.DateTimeFormat().resolvedOptions().timeZone})`);
          return;
        }
        
        // Warn if scheduling very close to current time (less than 2 minutes)
        if (timeDiff < 2 * 60 * 1000) {
          const confirmed = confirm(`You're scheduling for just ${Math.round(timeDiff / 1000)} seconds from now. Continue?`);
          if (!confirmed) return;
        }
        
        scheduledFor = localDateTime.toISOString();
      } else {
        // Recurring scheduling
        if (scheduleConfig.interval < 1) {
          alert('Interval must be at least 1');
          return;
        }
        
        // Validate time range if enabled
        if (scheduleConfig.hasTimeRange) {
          if (!scheduleConfig.startTime || !scheduleConfig.startTime.trim()) {
            alert('Please set a start time when time range is enabled');
            return;
          }
          if (!scheduleConfig.endTime || !scheduleConfig.endTime.trim()) {
            alert('Please set an end time when time range is enabled');
            return;
          }
          
          const [startHours, startMinutes] = scheduleConfig.startTime.split(':').map(Number);
          const [endHours, endMinutes] = scheduleConfig.endTime.split(':').map(Number);
          const startTimeMinutes = startHours * 60 + startMinutes;
          const endTimeMinutes = endHours * 60 + endMinutes;
          
          if (endTimeMinutes <= startTimeMinutes) {
            alert('End time must be after start time');
            return;
          }
        }
        
        cronExpression = generateCronExpression();
        if (!cronExpression) {
          alert('Please configure the recurring schedule');
          return;
        }
      }
      
      // Save schedule configuration to database first
      const scheduleData = {
              thread_id: thread.id,
              user_id: user?.id,
        enabled: true,
        frequency: scheduleConfig.frequency,
        interval_value: scheduleConfig.interval,
        start_time: scheduleConfig.startTime && scheduleConfig.startTime.trim() ? scheduleConfig.startTime : null,
        end_time: scheduleConfig.endTime && scheduleConfig.endTime.trim() ? scheduleConfig.endTime : null,
        days_of_week: scheduleConfig.daysOfWeek,
        cron_expression: cronExpression,
        scheduled_for: scheduledFor,
        has_time_range: scheduleConfig.hasTimeRange
      };

      console.log('🔍 Schedule data being saved:', scheduleData);
      console.log('🔍 Schedule config:', scheduleConfig);

      const { data: scheduleResult, error: scheduleError } = await supabase
        .from('automation_schedules')
        .upsert(scheduleData, {
          onConflict: 'thread_id'
        })
        .select();

      if (scheduleError) {
        console.error('❌ Failed to save schedule config:', scheduleError);
        console.error('❌ Schedule data that failed:', scheduleData);
        alert(`Failed to save schedule configuration: ${scheduleError.message}`);
        return;
      }

      console.log('✅ Schedule configuration saved successfully:', scheduleResult);

      // Update UI state
      setIsScheduled(true);
      setScheduleConfig(prev => ({ ...prev, enabled: true }));
      setShowScheduleModal(false);
      
      const scheduleText = getScheduleDescription();
      addToActivity(`Schedule configuration saved: ${scheduleText}`, 'system');

      // Create the scheduled execution separately (don't fail if this fails)
      try {
        await scheduleAutomation(cronExpression, scheduledFor);
        addToActivity(`Automation execution scheduled successfully`, 'system');
      } catch (executionError) {
        console.error('❌ Failed to create scheduled execution:', executionError);
        addToActivity(`Schedule configuration saved, but failed to create execution: ${executionError.message}`, 'system');
        // Don't throw error - the schedule config was saved successfully
      }
    } catch (error) {
      console.error('Error in saveSchedule:', error);
      alert(`Failed to save schedule configuration: ${error.message}`);
    }
  };

  const getScheduleDescription = () => {
    const { frequency, interval, startTime, endTime, hasTimeRange, daysOfWeek, scheduledFor } = scheduleConfig;
    
    // One-time scheduling
    if (showAdvancedSchedule) {
      if (scheduledFor) {
        const scheduledDate = new Date(scheduledFor);
        return `Scheduled for: ${scheduledDate.toLocaleString()} (${Intl.DateTimeFormat().resolvedOptions().timeZone})`;
      } else {
        return 'One-time execution (no date selected)';
      }
    }
    
    // Recurring scheduling
    let desc = `Every ${interval} ${frequency}`;
    
    // Only show time if hasTimeRange is enabled
    if (hasTimeRange && startTime) {
      desc += ` at ${startTime}`;
      if (endTime) {
        desc += `-${endTime}`;
      }
    }
    
    if (frequency === 'weeks' && daysOfWeek && daysOfWeek.length > 0) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const selectedDays = daysOfWeek.map(day => dayNames[day]).join(', ');
      desc += ` on ${selectedDays}`;
    }
    
    return desc;
  };

  const getNextRunTime = () => {
    if (!scheduleConfig.enabled) return null;
    
    const now = new Date();
    const { frequency, interval, startTime } = scheduleConfig;
    
    let nextRun = new Date(now);
    
    if (startTime) {
      const [hours, minutes] = startTime.split(':').map(Number);
      nextRun.setHours(hours, minutes, 0, 0);
      
      if (nextRun <= now) {
        // If start time has passed today, move to next interval
        if (frequency === 'minutes') {
          nextRun.setMinutes(nextRun.getMinutes() + interval);
        } else if (frequency === 'hours') {
          nextRun.setHours(nextRun.getHours() + interval);
        } else if (frequency === 'days') {
          nextRun.setDate(nextRun.getDate() + interval);
        } else if (frequency === 'weeks') {
          nextRun.setDate(nextRun.getDate() + (interval * 7));
        }
      }
    } else {
      // No specific start time, just add interval from now
      if (frequency === 'minutes') {
        nextRun.setMinutes(nextRun.getMinutes() + interval);
      } else if (frequency === 'hours') {
        nextRun.setHours(nextRun.getHours() + interval);
      } else if (frequency === 'days') {
        nextRun.setDate(nextRun.getDate() + interval);
      } else if (frequency === 'weeks') {
        nextRun.setDate(nextRun.getDate() + (interval * 7));
      }
    }
    
    return nextRun;
  };

  // BullMQ Scheduling Functions
  const scheduleAutomation = async (cronExpression?: string, scheduledFor?: string) => {
    console.log('🚀 scheduleAutomation called with:', { cronExpression, scheduledFor, stepsLength: steps.length });
    
    // Log the scheduling type
    if (cronExpression) {
      console.log('🔄 Scheduling type: RECURRING');
    } else if (scheduledFor) {
      console.log('⏰ Scheduling type: ONE-TIME');
      console.log('⏰ Scheduled for (UTC):', scheduledFor);
      console.log('⏰ Time until execution:', Math.round((new Date(scheduledFor).getTime() - new Date().getTime()) / (1000 * 60)), 'minutes');
    } else {
      console.log('⚡ Scheduling type: IMMEDIATE');
    }
    
    if (steps.length === 0) {
      alert('Please add at least one step before scheduling');
      return;
    }

    try {
      // For immediate execution, use the existing execute-flow endpoint
      if (!cronExpression && !scheduledFor) {
        console.log('🚀 Running automation immediately...');
        
        // Switch to activity tab when execution starts
        window.dispatchEvent(new CustomEvent('switchToActivityTab', {
          detail: { threadId: thread.id }
        }));

        setExecutionStatus('starting');
        setIsAutomationExecuting(true);

        // Create execution record
        const { data: execution, error: createError } = await supabase
          .from('flow_executions')
          .insert({
            thread_id: thread.id,
            automation_id: thread.automation_id,
            user_id: user?.id,
            status: 'pending',
            steps: steps,
              project_context: projectContext,
            current_step: 0,
              total_steps: steps.length,
            results: [],
            is_scheduled: false
          })
          .select()
          .single();

        if (createError) throw createError;

        setCurrentExecution(execution);
        setExecutionStatus('running');

        addToActivity(`Starting automation with ${steps.length} steps...`, 'system');
        addToActivity(`Execution ID: ${execution.id}`, 'system');

        // Start background execution via BullMQ
        const response = await fetch('/api/execute-flow', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            executionId: execution.id,
            threadId: thread.id,
            automationId: thread.automation_id,
            userId: user?.id,
            steps: steps,
            projectContext: projectContext
            }),
          });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to start execution: ${response.status} - ${errorText}`);
        }

        const responseData = await response.json();
        console.log('✅ Immediate execution started:', responseData);

        // Start polling for updates
        pollExecutionStatus(execution.id);
        
        return;
      }

      // For scheduled execution, use the schedule-automation endpoint
      const response = await fetch('/api/schedule-automation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          threadId: thread.id,
          automationId: thread.automation_id,
          userId: user?.id,
          cronExpression,
          scheduledFor,
          steps: steps,
          projectContext: projectContext,
          endTime: scheduleConfig.endTime,
          hasEndTime: scheduleConfig.hasTimeRange
        }),
      });

      const result = await response.json();

      if (result.success) {
        const newJob: ScheduledJob = {
          id: result.executionId,
          executionId: result.executionId,
          jobId: result.jobId,
          cronExpression,
          scheduledFor,
          status: 'waiting',
          nextRun: result.scheduledFor,
          isRecurring: !!cronExpression
        };

        setScheduledJobs(prev => [...prev, newJob]);
        setIsScheduled(true);
        
        const scheduleText = cronExpression ? `Cron: ${cronExpression}` : 
                           scheduledFor ? `Scheduled for: ${new Date(scheduledFor).toLocaleString()} (${Intl.DateTimeFormat().resolvedOptions().timeZone})` : 
                           'Immediate execution';
        addToActivity(`Automation scheduled: ${scheduleText}`, 'system');
        
        setShowScheduleModal(false);
      } else {
        throw new Error(result.error || 'Failed to schedule automation');
      }
    } catch (error) {
      console.error('Scheduling failed:', error);
      addToActivity(`Scheduling failed: ${error.message}`, 'system');
      setExecutionStatus('failed');
      setIsAutomationExecuting(false);
    }
  };

  const manageSchedule = async (action: string, executionId: string, jobId: string) => {
    try {
      if (action === 'delete') {
        // Cancel the execution
        const { error } = await supabase
          .from('flow_executions')
          .update({ status: 'cancelled' })
          .eq('id', executionId);

        if (error) {
          console.error('Failed to cancel execution:', error);
          alert('Failed to delete schedule. Please try again.');
          return;
        }

        // Update UI state
        setScheduledJobs(prev => prev.filter(job => job.executionId !== executionId));
        setIsScheduled(scheduledJobs.length > 1);
        addToActivity('Schedule deleted successfully', 'system');
        
      } else if (action === 'pause') {
        // For now, we'll just update the UI state
        // In a full implementation, you might want to store pause state in database
        setScheduledJobs(prev => prev.map(job => 
          job.executionId === executionId ? { ...job, status: 'paused' } : job
        ));
        addToActivity('Schedule paused', 'system');
        
      } else if (action === 'resume') {
        // For now, we'll just update the UI state
        setScheduledJobs(prev => prev.map(job => 
          job.executionId === executionId ? { ...job, status: 'waiting' } : job
        ));
        addToActivity('Schedule resumed', 'system');
      }
    } catch (error) {
      console.error('Schedule management failed:', error);
      addToActivity(`Schedule management failed: ${error.message}`, 'system');
    }
  };

  const loadScheduleConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('automation_schedules')
        .select('*')
        .eq('thread_id', thread.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error loading schedule config:', error);
        return;
      }

      if (data) {
        // Load schedule configuration from database
        setScheduleConfig({
          enabled: data.enabled,
          frequency: data.frequency,
          interval: data.interval_value,
          startTime: data.start_time,
          endTime: data.end_time,
          daysOfWeek: data.days_of_week,
          cronExpression: data.cron_expression,
          scheduledFor: data.scheduled_for,
          hasTimeRange: data.has_time_range
        });
        setIsScheduled(data.enabled);
        console.log('✅ Loaded schedule config from database:', data);
          } else {
        // No schedule config found, reset to defaults
        setScheduleConfig({
          enabled: false,
          frequency: 'hours',
          interval: 1,
          startTime: '09:00',
          endTime: '17:00',
          daysOfWeek: [1, 2, 3, 4, 5],
          hasTimeRange: true,
        });
        setIsScheduled(false);
        console.log('✅ No schedule config found, using defaults');
      }
    } catch (error) {
      console.error('Failed to load schedule config:', error);
    }
  };

  const loadScheduledJobs = async () => {
    try {
      // Load scheduled executions directly from database
      const { data: executions, error } = await supabase
        .from('flow_executions')
        .select('*')
        .eq('thread_id', thread.id)
        .eq('is_scheduled', true)
        .in('status', ['scheduled', 'pending', 'running'])
        .order('created_at', 'desc');

      if (error) {
        console.error('Error loading scheduled jobs:', error);
        return;
      }

      if (executions && executions.length > 0) {
        const jobs: ScheduledJob[] = executions.map((exec: any) => ({
          id: exec.id,
          executionId: exec.id,
          jobId: exec.id, // Use execution ID as job ID
          cronExpression: exec.cron_expression,
          scheduledFor: exec.scheduled_for,
          status: exec.status === 'scheduled' ? 'waiting' : exec.status,
          nextRun: exec.next_scheduled_run,
          isRecurring: !!exec.cron_expression
        }));

        setScheduledJobs(jobs);
        setIsScheduled(jobs.length > 0);
        console.log('✅ Loaded scheduled jobs from database:', jobs);
      } else {
        setScheduledJobs([]);
        setIsScheduled(false);
        console.log('✅ No scheduled jobs found');
      }
    } catch (error) {
      console.error('Failed to load scheduled jobs:', error);
    }
  };

  const generateCronExpression = () => {
    const { frequency, interval, startTime, endTime, hasTimeRange, daysOfWeek } = scheduleConfig;
    
    if (frequency === 'custom' && scheduleConfig.cronExpression) {
      return scheduleConfig.cronExpression;
    }

    let cron = '';
    
    if (startTime) {
      const [startHours, startMinutes] = startTime.split(':').map(Number);
      
      if (frequency === 'minutes') {
        if (hasTimeRange && endTime) {
          const [endHours, endMinutes] = endTime.split(':').map(Number);
          // For minutes with end time, we need to create a more complex expression
          // This is a simplified version - in production you might want to use multiple cron jobs
          cron = `${startMinutes} ${startHours}-${endHours} * * *`;
        } else {
          cron = `${startMinutes} */${interval} * * *`;
        }
      } else if (frequency === 'hours') {
        if (hasTimeRange && endTime) {
          const [endHours] = endTime.split(':').map(Number);
          cron = `${startMinutes} ${startHours}-${endHours} * * *`;
        } else {
          // For hours with intervals, we need to calculate specific hours
          if (interval === 1) {
            cron = `${startMinutes} * * * *`; // Every hour
          } else {
            // Calculate hours that match the interval starting from startHours
            const hours = [];
            for (let h = startHours; h < 24; h += interval) {
              hours.push(h);
            }
            cron = `${startMinutes} ${hours.join(',')} * * *`;
          }
        }
      } else if (frequency === 'days') {
        if (hasTimeRange && endTime) {
          const [endHours] = endTime.split(':').map(Number);
          cron = `${startMinutes} ${startHours}-${endHours} */${interval} * *`;
        } else {
          cron = `${startMinutes} ${startHours} */${interval} * *`;
        }
      } else if (frequency === 'weeks') {
        const dayOfWeek = daysOfWeek && daysOfWeek.length > 0 ? daysOfWeek[0] : 1;
        if (hasTimeRange && endTime) {
          const [endHours] = endTime.split(':').map(Number);
          cron = `${startMinutes} ${startHours}-${endHours} * * ${dayOfWeek}`;
        } else {
          // For weeks, we need to calculate the interval in days (weeks * 7)
          const intervalDays = interval * 7;
          cron = `${startMinutes} ${startHours} */${intervalDays} * *`;
        }
      }
    } else {
      // No specific start time
      if (frequency === 'minutes') {
        cron = `*/${interval} * * * *`;
      } else if (frequency === 'hours') {
        if (interval === 1) {
          cron = `0 * * * *`; // Every hour
        } else {
          // Calculate hours that match the interval starting from 0
          const hours = [];
          for (let h = 0; h < 24; h += interval) {
            hours.push(h);
          }
          cron = `0 ${hours.join(',')} * * *`;
        }
      } else if (frequency === 'days') {
        cron = `0 0 */${interval} * *`;
      } else if (frequency === 'weeks') {
        // For weeks without start time, calculate interval in days
        const intervalDays = interval * 7;
        cron = `0 0 */${intervalDays} * *`;
      }
    }
    
    return cron;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500 mx-auto mb-2"></div>
          <p className="text-dark-300">Loading flow...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-slate-950 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto [-webkit-overflow-scrolling:touch] [scrollbar-gutter:stable]">
        <div className="w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-100">Wispix Flow</h3>
              {isScheduled && (
                <div className="flex items-center space-x-2 px-3 py-1 bg-green-600/20 border border-green-500/30 rounded-lg">
                  <Clock className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-300">Scheduled</span>
                </div>
              )}
            </div>
            <div className="flex space-x-3">
              {/* Automation Toggle Switch */}
              {onToggleAutomation && (
                <div className="flex items-center space-x-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={thread.enabled}
                        onChange={(e) => onToggleAutomation(thread.id, e.target.checked)}
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
                    <span className="text-xs text-gray-400 font-medium">
                      {thread.enabled ? 'ON' : 'OFF'}
                    </span>
                  </label>
                </div>
              )}
              
              <button
                onClick={handleScheduleToggle}
                className={`px-4 py-2 rounded-xl transition-all duration-300 flex items-center text-sm ${
                  isScheduled 
                    ? 'bg-red-600 text-white hover:bg-red-700 hover:shadow-glow' 
                    : 'bg-purple-600 text-white hover:bg-purple-700 hover:shadow-glow'
                }`}
                title={
                  isScheduled 
                    ? 'Stop scheduled automation' 
                    : 'Schedule automation'
                }
              >
                {isScheduled ? (
                  <>
                    <StopCircle className="w-4 h-4 mr-2" />
                    Stop Schedule
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 mr-2" />
                    Schedule
                  </>
                )}
              </button>
              <button
                onClick={addStep}
                className="bg-cyan-600 text-white px-4 py-2 rounded-xl hover:bg-cyan-700 hover:shadow-glow transition-all duration-300 flex items-center text-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Step
              </button>
              <button
                onClick={executeAutomation}
                disabled={steps.length === 0 || isExecuting}
                className="bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 hover:shadow-glow transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm"
              >
                <Play className="w-4 h-4 mr-2" />
                {isExecuting ? 'Executing...' : 'Execute'}
              </button>
            </div>
          </div>

          {/* Execution Status */}
          {currentExecution && (
            <div className="mb-6 bg-blue-900/20 border border-blue-700 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    executionStatus === 'running' ? 'bg-blue-400 animate-pulse' :
                    executionStatus === 'completed' ? 'bg-green-400' :
                    executionStatus === 'failed' ? 'bg-red-400' :
                    'bg-yellow-400'
                  }`}></div>
                  <div>
                    <h4 className="font-medium text-blue-200">
                      {executionStatus === 'running' ? 'Executing in Background' :
                       executionStatus === 'completed' ? 'Execution Completed' :
                       executionStatus === 'failed' ? 'Execution Failed' :
                       'Starting Execution'}
                    </h4>
                    <p className="text-sm text-blue-300">
                      {currentExecution.current_step} of {currentExecution.total_steps} steps completed
                    </p>
                    {currentExecution.id && (
                      <p className="text-xs text-blue-400 font-mono">
                        ID: {currentExecution.id}
                      </p>
                    )}
                  </div>
                </div>
                {executionStatus === 'running' && (
                  <div className="text-sm text-blue-300">
                    You can close this tab - execution will continue
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Scheduled Jobs */}
          {scheduledJobs.length > 0 && (
            <div className="mb-6 bg-purple-900/20 border border-purple-700 rounded-xl p-4">
              <h4 className="text-sm font-medium text-purple-200 mb-3 flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Scheduled Jobs ({scheduledJobs.length})
              </h4>
              <div className="space-y-2">
                {scheduledJobs.map((job) => (
                  <div key={job.id} className="bg-slate-800 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-300">
                          {job.isRecurring ? 'Recurring' : 'One-time'}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          job.status === 'waiting' ? 'bg-yellow-600/20 text-yellow-300' :
                          job.status === 'active' ? 'bg-blue-600/20 text-blue-300' :
                          job.status === 'completed' ? 'bg-green-600/20 text-green-300' :
                          job.status === 'failed' ? 'bg-red-600/20 text-red-300' :
                          'bg-gray-600/20 text-gray-300'
                        }`}>
                          {job.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {job.cronExpression && `Cron: ${job.cronExpression}`}
                        {job.scheduledFor && `Scheduled: ${new Date(job.scheduledFor).toLocaleString()} (${Intl.DateTimeFormat().resolvedOptions().timeZone})`}
                        {job.nextRun && `Next run: ${new Date(job.nextRun).toLocaleString()} (${Intl.DateTimeFormat().resolvedOptions().timeZone})`}
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      {job.status === 'paused' ? (
                        <button
                          onClick={() => manageSchedule('resume', job.executionId, job.jobId)}
                          className="p-1 text-green-400 hover:text-green-300 rounded"
                          title="Resume"
                        >
                          <PlayCircle className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => manageSchedule('pause', job.executionId, job.jobId)}
                          className="p-1 text-yellow-400 hover:text-yellow-300 rounded"
                          title="Pause"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => manageSchedule('delete', job.executionId, job.jobId)}
                        className="p-1 text-red-400 hover:text-red-300 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Project Context */}
          <div className="bg-slate-900 rounded-xl border border-purple-700 p-4 mb-6">
            <h4 className="text-sm font-medium text-purple-200 mb-2 flex items-center">
              <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
              Project Context
            </h4>
            <textarea
              value={projectContext}
              onChange={(e) => {
                setProjectContext(e.target.value);
                setTimeout(() => saveFlow(), 0);
              }}
              placeholder="Project context will appear here when provided by the agent..."
              className="w-full h-20 px-3 py-2 border border-slate-600 bg-slate-800 text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:shadow-glow resize-none placeholder-slate-400 transition-all duration-300 text-sm"
              readOnly={false}
            />
          </div>

          {/* Flow Steps */}
          <div className="space-y-4">
            {steps.length === 0 ? (
              <div className="text-center py-12 bg-slate-900 rounded-2xl border-2 border-dashed border-slate-700">
                <Plus className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                <p className="text-slate-400">No steps in your automation flow</p>
                <p className="text-sm text-slate-500 mt-1">Add your first step to get started</p>
              </div>
            ) : (
              steps.map((step, index) => (
                <div key={step.id} className="relative">
                  <div className={`bg-slate-900 rounded-2xl border transition-all duration-300 p-6 shadow-card hover:shadow-card-hover ${
                    isExecuting && index === 0 ? 'border-cyan-500 shadow-glow' : 'border-slate-700'
                  }`}>
                    <div className="flex items-start space-x-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                          isExecuting && index === 0 
                            ? 'bg-cyan-500 text-white shadow-glow animate-pulse-slow' 
                            : 'bg-cyan-600 text-white'
                        }`}>
                          {index + 1}
                        </div>
                        <button
                          className="mt-2 p-1 text-slate-500 hover:text-slate-300 cursor-move transition-colors duration-300"
                          title="Drag to reorder"
                        >
                          <GripVertical className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="flex-1">
                        <textarea
                          value={step.content}
                          onChange={(e) => updateStep(step.id, e.target.value)}
                          placeholder="Describe this automation step..."
                          className="w-full px-4 py-3 border border-slate-600 bg-slate-800 text-gray-100 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 focus:shadow-glow resize-none placeholder-slate-400 transition-all duration-300"
                          rows={3}
                        />
                      </div>

                      <div className="flex flex-col space-y-1">
                        <button
                          onClick={() => moveStep(step.id, 'up')}
                          disabled={index === 0}
                          className="p-1 text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors duration-300"
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveStep(step.id, 'down')}
                          disabled={index === steps.length - 1}
                          className="p-1 text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors duration-300"
                          title="Move down"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => deleteStep(step.id)}
                          className="p-1 text-red-400 hover:text-red-300 transition-colors duration-300"
                          title="Delete step"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Arrow between steps */}
                  {index < steps.length - 1 && (
                    <div className="flex justify-center py-2">
                      <ArrowDown className="w-5 h-5 text-slate-500" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Flow Summary */}
          {steps.length > 0 && (
            <div className="mt-6 bg-cyan-900/20 border border-cyan-700 rounded-xl p-4">
              <h4 className="font-medium text-cyan-200 mb-2">Flow Summary</h4>
              <p className="text-cyan-300 text-sm">
                This automation contains {steps.length} step{steps.length !== 1 ? 's' : ''} that will be executed sequentially.
              </p>
            </div>
          )}

          {/* Schedule Status */}
          {isScheduled && (
            <div className="mt-6 bg-purple-900/20 border border-purple-700 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-purple-200 mb-1 flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    Scheduled Execution
                  </h4>
                  <p className="text-purple-300 text-sm">
                    {getScheduleDescription()}
                  </p>
                  {getNextRunTime() && (
                    <p className="text-purple-400 text-xs mt-1">
                      Next run: {getNextRunTime()?.toLocaleString()} ({Intl.DateTimeFormat().resolvedOptions().timeZone})
                    </p>
          )}
        </div>
                <button
                  onClick={handleScheduleToggle}
                  className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  Stop
                </button>
      </div>
            </div>
          )}
        </div>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-purple-600/20 rounded-full flex items-center justify-center mr-4">
                <Clock className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-100">Schedule Wispix Automation</h3>
                <p className="text-sm text-gray-400">Set up recurring execution</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Schedule Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Schedule Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'scheduled', label: 'One-time' },
                    { value: 'recurring', label: 'Recurring' }
                  ].map((type) => (
                    <button
                      key={type.value}
                      onClick={() => {
                        if (type.value === 'scheduled') {
                          setShowAdvancedSchedule(true);
                          setScheduleConfig(prev => ({ ...prev, frequency: 'hours' })); // Reset to default frequency
                        } else {
                          // Recurring mode
                          setShowAdvancedSchedule(false);
                          setScheduleConfig(prev => ({ ...prev, frequency: 'hours' }));
                        }
                      }}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        (type.value === 'recurring' && !showAdvancedSchedule) || 
                        (type.value === 'scheduled' && showAdvancedSchedule)
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Frequency Selection for Recurring */}
              {!showAdvancedSchedule && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Frequency</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['minutes', 'hours', 'days', 'weeks'].map((freq) => (
                      <button
                        key={freq}
                        onClick={() => {
                          setScheduleConfig(prev => ({ ...prev, frequency: freq as any }));
                        }}
                        className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                          scheduleConfig.frequency === freq
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {freq.charAt(0).toUpperCase() + freq.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}


              {/* One-time Scheduling - moved after End Time */}

              {/* Interval - Only show for recurring schedules */}
              {!showAdvancedSchedule && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Every {scheduleConfig.frequency === 'weeks' ? 'week(s)' : scheduleConfig.frequency}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={scheduleConfig.frequency === 'minutes' ? 60 : scheduleConfig.frequency === 'hours' ? 24 : 365}
                    value={scheduleConfig.interval}
                    onChange={(e) => setScheduleConfig(prev => ({ ...prev, interval: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              )}

              {/* Time Range Toggle - Only show for recurring schedules */}
              {!showAdvancedSchedule && (
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="hasTimeRange"
                    checked={scheduleConfig.hasTimeRange}
                    onChange={(e) => setScheduleConfig(prev => ({ 
                      ...prev, 
                      hasTimeRange: e.target.checked,
                      // Clear time values when toggling off
                      startTime: e.target.checked ? prev.startTime : '',
                      endTime: e.target.checked ? prev.endTime : ''
                    }))}
                    className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="hasTimeRange" className="text-sm font-medium text-gray-300">
                    Set time range
                  </label>
                </div>
              )}

              {/* Time Range Inputs - Only show for recurring schedules */}
              {!showAdvancedSchedule && scheduleConfig.hasTimeRange && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Start Time</label>
                    <input
                      type="time"
                      value={scheduleConfig.startTime || ''}
                      onChange={(e) => setScheduleConfig(prev => ({ ...prev, startTime: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">End Time</label>
                    <input
                      type="time"
                      value={scheduleConfig.endTime || ''}
                      onChange={(e) => setScheduleConfig(prev => ({ ...prev, endTime: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Automation will only run between start and end times
                    </p>
                  </div>
                </div>
              )}

              {/* One-time Scheduling */}
              {showAdvancedSchedule && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Start on</label>
                  <input
                    type="datetime-local"
                    value={scheduleConfig.scheduledFor || ''}
                    onChange={(e) => setScheduleConfig(prev => ({ ...prev, scheduledFor: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
                  </p>
                </div>
              )}

              {/* Days of Week (for weekly) - Only show for recurring schedules */}
              {!showAdvancedSchedule && scheduleConfig.frequency === 'weeks' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Days of Week</label>
                  <div className="grid grid-cols-7 gap-1">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                      <button
                        key={day}
                        onClick={() => {
                          const newDays = scheduleConfig.daysOfWeek?.includes(index)
                            ? scheduleConfig.daysOfWeek.filter(d => d !== index)
                            : [...(scheduleConfig.daysOfWeek || []), index];
                          setScheduleConfig(prev => ({ ...prev, daysOfWeek: newDays }));
                        }}
                        className={`px-2 py-1 rounded text-xs transition-colors ${
                          scheduleConfig.daysOfWeek?.includes(index)
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview */}
              <div className="bg-gray-700 rounded-lg p-3">
                <p className="text-sm text-gray-300">
                  <span className="text-gray-400">Schedule:</span> {getScheduleDescription()}
                </p>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  setShowAdvancedSchedule(false);
                }}
                className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-xl hover:bg-gray-700 transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (showAdvancedSchedule) {
                    // One-time scheduling
                    if (!scheduleConfig.scheduledFor) {
                      alert('Please select a date and time for scheduling');
                      return;
                    }
                    const scheduledDate = new Date(scheduleConfig.scheduledFor);
                    if (scheduledDate <= new Date()) {
                      alert('Please select a future date and time');
                      return;
                    }
                    // Call saveSchedule for proper validation
                    saveSchedule();
                  } else {
                    // Recurring scheduling
                    // Validate time range if enabled
                    if (scheduleConfig.hasTimeRange && scheduleConfig.startTime && scheduleConfig.endTime) {
                      const [startHours, startMinutes] = scheduleConfig.startTime.split(':').map(Number);
                      const [endHours, endMinutes] = scheduleConfig.endTime.split(':').map(Number);
                      const startTimeMinutes = startHours * 60 + startMinutes;
                      const endTimeMinutes = endHours * 60 + endMinutes;
                      
                      if (endTimeMinutes <= startTimeMinutes) {
                        alert('End time must be after start time');
                        return;
                      }
                    }
                    
                    const cronExpression = generateCronExpression();
                    if (!cronExpression) {
                      alert('Please configure the recurring schedule');
                      return;
                    }
                    // Call saveSchedule for proper validation
                    saveSchedule();
                  }
                }}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all duration-300"
              >
                {showAdvancedSchedule ? 'Schedule' : 'Save Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}