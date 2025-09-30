import React, { useState } from 'react';
import { Play, Save, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { automationAPI } from '../../services/api';
import { ScheduleModal } from './ScheduleModal';

interface AutomationCardProps {
  automation: any;
  onConfirm: () => void;
}

export default function AutomationCard({ automation, onConfirm }: AutomationCardProps) {
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [executionStatus, setExecutionStatus] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const handleSaveAutomation = async () => {
    setSaving(true);
    try {
      const response = await automationAPI.saveAutomation(automation);
      console.log('Automation saved:', response.data);
      setSaved(true);
      alert(`Automation "${automation.name}" saved successfully!`);
      onConfirm();
    } catch (error) {
      console.error('Error saving automation:', error);
      alert('Failed to save automation. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestRun = async () => {
    setTesting(true);
    try {
      // First save the automation if not already saved
      if (!saved) {
        const saveResponse = await automationAPI.saveAutomation(automation);
        setSaved(true);
        automation.id = saveResponse.data.id;
      }

      // Execute the automation
      const executeResponse = await automationAPI.executeAutomation(automation.id, automation);
      const execId = executeResponse.data.executionId;
      setExecutionId(execId);
      setExecutionStatus('running');
      
      alert(`Test run started for "${automation.name}"! Execution ID: ${execId}`);
      
      // Poll for execution status
      pollExecutionStatus(execId);
    } catch (error) {
      console.error('Error testing automation:', error);
      alert('Failed to start test run. Please try again.');
    } finally {
      setTesting(false);
    }
  };

  const pollExecutionStatus = async (execId: string) => {
    const interval = setInterval(async () => {
      try {
        const statusResponse = await automationAPI.getExecutionStatus(execId);
        const status = statusResponse.data.status;
        setExecutionStatus(status);
        
        if (status === 'completed' || status === 'failed' || status === 'cancelled') {
          clearInterval(interval);
          if (status === 'completed') {
            alert(`Test run completed successfully!`);
          } else {
            alert(`Test run ${status}. Check logs for details.`);
          }
        }
      } catch (error) {
        console.error('Error polling execution status:', error);
        clearInterval(interval);
      }
    }, 2000); // Poll every 2 seconds
  };

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
      <h3 className="font-semibold text-gray-900">{automation.name}</h3>
      <p className="text-sm text-gray-600 mt-1">{automation.description}</p>
      
      <div className="mt-3 space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Workflow Steps:</h4>
        {automation.steps?.map((step: any, index: number) => (
          <div key={index} className="flex items-center space-x-2 text-sm">
            <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">
              {index + 1}
            </span>
            <span className="text-gray-600">{step.name || step.type}</span>
          </div>
        ))}
      </div>
      
      {executionStatus && (
        <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
          <div className="flex items-center space-x-2 text-sm">
            {executionStatus === 'running' ? (
              <AlertCircle className="w-4 h-4 text-blue-600 animate-pulse" />
            ) : executionStatus === 'completed' ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
            <span className="text-gray-700">
              Execution Status: {executionStatus}
              {executionId && ` (ID: ${executionId})`}
            </span>
          </div>
        </div>
      )}
      
      <div className="mt-4 flex space-x-2">
        <button
          onClick={handleSaveAutomation}
          disabled={saving || saved}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saved ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>
            {saving ? 'Saving...' : saved ? 'Saved' : 'Save Automation'}
          </span>
        </button>
        <button 
          onClick={handleTestRun}
          disabled={testing}
          className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play className="w-4 h-4" />
          <span>{testing ? 'Running...' : 'Test Run'}</span>
        </button>
        <button 
          onClick={() => setShowScheduleModal(true)}
          disabled={!saved}
          className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          title={!saved ? "Save the automation first to enable scheduling" : "Schedule this automation"}
        >
          <Clock className="w-4 h-4" />
          <span>Schedule</span>
        </button>
      </div>

      <ScheduleModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        automation={{
          ...automation,
          id: saved ? `saved_${Date.now()}` : null // Use a temporary ID if saved
        }}
        onScheduleSuccess={() => {
          setShowScheduleModal(false);
          // Optionally refresh or update UI
        }}
      />
    </div>
  );
} 