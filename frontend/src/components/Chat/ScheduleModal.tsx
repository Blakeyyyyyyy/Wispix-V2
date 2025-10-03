import React, { useState, useEffect } from 'react';
import { scheduleAPI } from '../../services/api';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  automation: any;
  onScheduleSuccess?: () => void;
}

interface CronPreset {
  label: string;
  value: string;
  description: string;
}

const cronPresets: CronPreset[] = [
  { label: 'Every Minute', value: '* * * * *', description: 'Runs every minute' },
  { label: 'Every 5 Minutes', value: '*/5 * * * *', description: 'Runs every 5 minutes' },
  { label: 'Every 15 Minutes', value: '*/15 * * * *', description: 'Runs every 15 minutes' },
  { label: 'Every Hour', value: '0 * * * *', description: 'Runs every hour' },
  { label: 'Every Day at 9 AM', value: '0 9 * * *', description: 'Runs daily at 9:00 AM' },
  { label: 'Every Week on Monday', value: '0 9 * * 1', description: 'Runs every Monday at 9:00 AM' },
  { label: 'Every Month on 1st', value: '0 9 1 * *', description: 'Runs on the 1st of every month at 9:00 AM' },
];

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  onClose,
  automation,
  onScheduleSuccess
}) => {
  const [cronExpression, setCronExpression] = useState('* * * * *');
  const [customCron, setCustomCron] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scheduleStatus, setScheduleStatus] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && automation?.id) {
      loadScheduleStatus();
    }
  }, [isOpen, automation]);

  const loadScheduleStatus = async () => {
    try {
      const response = await scheduleAPI.getScheduleStatus(automation.id);
      setScheduleStatus(response.data);
    } catch (error) {
      console.log('No existing schedule found');
      setScheduleStatus(null);
    }
  };

  const handleSchedule = async () => {
    console.log('🔧 Schedule button clicked!');
    console.log('Automation object:', automation);
    
    if (!automation?.id) {
      console.error('❌ No automation ID found:', automation);
      setError('Please save the automation first before scheduling. Click "Save Automation" and try again.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const cronToUse = isCustom ? customCron : cronExpression;
      
      if (!cronToUse) {
        setError('Please enter a cron expression');
        setIsLoading(false);
        return;
      }

      console.log('📅 Scheduling automation:', automation.id, 'with cron:', cronToUse);
      
      await scheduleAPI.scheduleAutomation(automation.id, cronToUse, automation);
      
      console.log('✅ Schedule API call successful');
      
      // Reload status
      await loadScheduleStatus();
      
      onScheduleSuccess?.();
      
      // Show success message
      alert('Automation scheduled successfully!');
      
    } catch (error: any) {
      console.error('❌ Schedule error:', error);
      setError(error.response?.data?.error || 'Failed to schedule automation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnschedule = async () => {
    if (!automation?.id) return;

    setIsLoading(true);
    setError('');

    try {
      await scheduleAPI.unscheduleAutomation(automation.id);
      setScheduleStatus(null);
      onScheduleSuccess?.();
      alert('Automation unscheduled successfully!');
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to unschedule automation');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePresetSelect = (preset: CronPreset) => {
    setCronExpression(preset.value);
    setIsCustom(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Schedule Automation</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {automation && (
          <div className="mb-4">
            <h3 className="font-semibold text-gray-800">{automation.name}</h3>
            <p className="text-sm text-gray-600">{automation.description}</p>
          </div>
        )}

        {scheduleStatus && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="font-semibold text-green-700">Currently Scheduled</span>
            </div>
            <p className="text-sm text-gray-600">
              Cron: <code className="bg-gray-100 px-1 rounded">{scheduleStatus.cronExpression}</code>
            </p>
            <p className="text-sm text-gray-600">
              Type: {scheduleStatus.triggerType}
            </p>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Schedule Presets
          </label>
          <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
            {cronPresets.map((preset) => (
              <button
                key={preset.value}
                onClick={() => handlePresetSelect(preset)}
                className={`text-left p-2 rounded border ${
                  cronExpression === preset.value && !isCustom
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-sm">{preset.label}</div>
                <div className="text-xs text-gray-500">{preset.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom Cron Expression
          </label>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              id="custom-cron"
              checked={isCustom}
              onChange={(e) => setIsCustom(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="custom-cron" className="text-sm text-gray-600">
              Use custom cron expression
            </label>
          </div>
          
          {isCustom ? (
            <input
              type="text"
              value={customCron}
              onChange={(e) => setCustomCron(e.target.value)}
              placeholder="* * * * *"
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          ) : (
            <input
              type="text"
              value={cronExpression}
              onChange={(e) => setCronExpression(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          )}
          
          <p className="text-xs text-gray-500 mt-1">
            Format: minute hour day month weekday
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex gap-2">
          {scheduleStatus ? (
            <button
              onClick={handleUnschedule}
              disabled={isLoading}
              className="flex-1 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
            >
              {isLoading ? 'Unschedule...' : 'Unschedule'}
            </button>
          ) : (
            <button
              onClick={handleSchedule}
              disabled={isLoading}
              className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoading ? 'Schedule...' : 'Schedule'}
            </button>
          )}
          
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}; 