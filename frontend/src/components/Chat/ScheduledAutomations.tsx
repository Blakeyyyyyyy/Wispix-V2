import React, { useState, useEffect } from 'react';
import { Clock, Trash2, Play, Pause, Calendar } from 'lucide-react';
import { scheduleAPI, automationAPI } from '../../services/api';

interface Automation {
  id: string;
  name: string;
  description: string;
  status: string;
  workflowJson?: any;
  cronExpression?: string;
  scheduled?: boolean;
  enabled?: boolean;
}

export const ScheduledAutomations: React.FC = () => {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAutomations();
  }, []);

  const loadAutomations = async () => {
    try {
      setLoading(true);
      // Load all automations
      const automationsResponse = await automationAPI.listAutomations();
      const allAutomations = Array.isArray(automationsResponse.data)
                 ? automationsResponse.data
                 : automationsResponse.data?.rows ?? [];
      
      // Load scheduled automations to merge status
      const scheduledResponse = await scheduleAPI.getScheduledAutomations();
      const scheduledAutomations = scheduledResponse.data.schedules || [];
      
      // Merge the data
      const mergedAutomations = allAutomations.map((automation: any) => {
        const scheduled = scheduledAutomations.find((s: any) => s.id === automation.id);
        return {
          ...automation,
          scheduled: !!scheduled,
          cronExpression: scheduled?.cronExpression,
          enabled: scheduled?.enabled
        };
      });
      
      setAutomations(mergedAutomations);
    } catch (error: any) {
      console.error('Error loading automations:', error);
      setError('Failed to load automations');
    } finally {
      setLoading(false);
    }
  };

  const handleUnschedule = async (automationId: string) => {
    try {
      await scheduleAPI.unscheduleAutomation(automationId);
      alert('Automation unscheduled successfully!');
      loadAutomations(); // Reload the list
    } catch (error: any) {
      console.error('Error unscheduling automation:', error);
      alert('Failed to unschedule automation');
    }
  };

  const handleToggle = async (automationId: string, enabled: boolean) => {
    try {
      await scheduleAPI.toggleAutomation(automationId, enabled);
      // Update the local state to reflect the change
      setAutomations(prev => 
        prev.map(automation => 
          automation.id === automationId 
            ? { ...automation, enabled: enabled }
            : automation
        )
      );
      console.log(`Automation ${automationId} ${enabled ? 'enabled' : 'disabled'} successfully`);
    } catch (error: any) {
      console.error('Error toggling automation:', error);
      alert(`Failed to ${enabled ? 'enable' : 'disable'} automation`);
    }
  };

  const formatCronExpression = (cron: string) => {
    const parts = cron.split(' ');
    if (parts.length !== 5) return cron;

    const [minute, hour, day, month, weekday] = parts;
    
    // Common patterns
    if (cron === '* * * * *') return 'Every minute';
    if (cron === '*/5 * * * *') return 'Every 5 minutes';
    if (cron === '*/15 * * * *') return 'Every 15 minutes';
    if (cron === '0 * * * *') return 'Every hour';
    if (cron === '0 9 * * *') return 'Daily at 9:00 AM';
    if (cron === '0 9 * * 1') return 'Every Monday at 9:00 AM';
    if (cron === '0 9 1 * *') return 'Monthly on 1st at 9:00 AM';
    
    return cron;
  };

  if (loading) {
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          <span className="text-gray-600">Loading scheduled automations...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadAutomations}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (automations.length === 0) {
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2 text-gray-500">
          <Clock className="w-4 h-4" />
          <span>No automations</span>
        </div>
        <p className="text-sm text-gray-400 mt-1">
          Create automations to see them here
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center space-x-2">
        <Clock className="w-5 h-5" />
        <span>Your Automations</span>
      </h3>
      
      <div className="space-y-3">
        {automations.map((automation: any) => (
          <div
            key={automation.id}
            className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{automation.name}</h4>
                {automation.description && (
                  <p className="text-sm text-gray-600 mt-1">{automation.description}</p>
                )}
                <div className="mt-2 flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    automation.scheduled 
                      ? (automation.enabled !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800')
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    <span className={`w-2 h-2 rounded-full mr-1 ${
                      automation.scheduled 
                        ? (automation.enabled !== false ? 'bg-green-400' : 'bg-gray-400')
                        : 'bg-blue-400'
                    }`}></span>
                    {automation.scheduled 
                      ? (automation.enabled !== false ? 'Active' : 'Paused')
                      : 'Manual'
                    }
                  </span>
                  {automation.scheduled && automation.cronExpression && (
                  <span className="text-sm text-gray-500">
                    {formatCronExpression(automation.cronExpression)}
                  </span>
                  )}
                  {!automation.scheduled && (
                    <span className="text-sm text-gray-500">
                      Manual trigger only
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2 ml-4">
                {automation.scheduled ? (
                  <>
                    <button
                      onClick={() => handleToggle(automation.id, automation.enabled !== false ? false : true)}
                      className={`p-2 rounded transition-colors ${
                        automation.enabled !== false
                          ? 'text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50'
                          : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                      }`}
                      title={automation.enabled !== false ? 'Pause automation' : 'Resume automation'}
                    >
                      {automation.enabled !== false ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </button>
                <button
                  onClick={() => handleUnschedule(automation.id)}
                  className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                  title="Unschedule automation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                  </>
                ) : (
                  <span className="text-sm text-gray-500">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Schedule to run automatically
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 