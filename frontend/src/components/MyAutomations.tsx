import React, { useState, useEffect } from 'react';
import { Play, Pause, Clock, Calendar, Activity, Trash2, Zap } from 'lucide-react';
import { automationAPI } from '../services/api';
import { AutomationPlan } from '../types/automation.types';

interface Automation {
  id: string;
  name: string;
  description?: string;
  status?: string;
  isActive?: boolean;
  lastRunAt?: string;
  createdAt: string;
  workflowJson?: {
    planJSON?: AutomationPlan;
    code?: string;
    plan?: string;
  };
  config?: AutomationPlan; // planJSON might be stored here
}

interface MyAutomationsProps {
  onBack: () => void;
}

export default function MyAutomations({ onBack }: MyAutomationsProps) {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAutomations = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await automationAPI.listAutomations();
      const automationsData = response.data.data || response.data || [];
      setAutomations(automationsData);
    } catch (err) {
      console.error('Error loading automations:', err);
      setError('Failed to load automations');
      setAutomations([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleAutomation = async (automationId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      await automationAPI.updateStatus(automationId, newStatus);
      await loadAutomations(); // Refresh the list
    } catch (error) {
      console.error('Error toggling automation:', error);
      setError('Failed to toggle automation');
    }
  };

  const deleteAutomation = async (automationId: string) => {
    if (!window.confirm('Are you sure you want to delete this automation? This action cannot be undone.')) {
      return;
    }
    
    try {
      await automationAPI.deleteAutomation(automationId);
      await loadAutomations(); // Refresh the list
    } catch (error) {
      console.error('Error deleting automation:', error);
      setError('Failed to delete automation');
    }
  };

  const executeAutomation = async (automationId: string) => {
    try {
      await automationAPI.executeAutomation(automationId);
      setError(null);
      // Show success message
      alert('Automation executed successfully!');
    } catch (error) {
      console.error('Error executing automation:', error);
      setError('Failed to execute automation');
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'paused':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Activity className="w-4 h-4" />;
      case 'paused':
        return <Pause className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  useEffect(() => {
    loadAutomations();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading automations...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={onBack}
                className="text-blue-600 hover:text-blue-800 mb-2 flex items-center"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-2xl font-bold text-gray-900">My Automations</h1>
              <p className="text-gray-600 mt-1">Manage and monitor your automated workflows</p>
            </div>
            <button
              onClick={loadAutomations}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Automations Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Automation Workflows ({automations.length})
            </h2>
          </div>
          
          {automations.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No automations yet</h3>
              <p className="text-gray-600 mb-4">
                Create your first automation using the chat interface
              </p>
              <button
                onClick={onBack}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Automation
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Schedule
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Run
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {automations.map((automation) => (
                    <tr key={automation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {automation.name}
                          </div>
                          {automation.description && (
                            <div className="text-sm text-gray-500">
                              {automation.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(automation.status || 'unknown')}`}>
                            {getStatusIcon(automation.status || 'unknown')}
                            <span className="ml-1 capitalize">
                              {automation.status || 'unknown'}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          <span className="font-mono text-xs">
                            {automation.workflowJson?.planJSON?.trigger?.schedule || 
                             automation.config?.trigger?.schedule || 
                             '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDate(automation.lastRunAt || '')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDate(automation.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => toggleAutomation(automation.id, automation.status || 'unknown')}
                            className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                              automation.status === 'active'
                                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                : 'bg-green-100 text-green-800 hover:bg-green-200'
                            }`}
                          >
                            {automation.status === 'active' ? (
                              <>
                                <Pause className="w-4 h-4 mr-1" />
                                Pause
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4 mr-1" />
                                Resume
                              </>
                            )}
                          </button>
                          
                          <button
                            onClick={() => executeAutomation(automation.id)}
                            className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                            title="Execute now"
                          >
                            <Zap className="w-4 h-4 mr-1" />
                            Run
                          </button>
                          
                          <button
                            onClick={() => deleteAutomation(automation.id)}
                            className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
                            title="Delete automation"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 