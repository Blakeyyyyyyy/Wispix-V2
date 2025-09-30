'use client';

import React, { useState, useEffect } from 'react';
import { TaskList } from './TaskList';
import { ChatInterface } from './ChatInterface';
import { TeamPerformance } from './TeamPerformance';
import { TaskManagerControls } from './TaskManagerControls';

interface TaskManagerDashboardProps {
  className?: string;
}

export const TaskManagerDashboard: React.FC<TaskManagerDashboardProps> = ({ className = '' }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'chat' | 'tasks' | 'performance'>('overview');
  const [lastExecution, setLastExecution] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'chat', label: 'Chat with AI', icon: '💬' },
    { id: 'tasks', label: 'Task List', icon: '📋' },
    { id: 'performance', label: 'Performance', icon: '📈' },
  ];

  const fetchLastExecution = async () => {
    try {
      const response = await fetch('/api/executions/recent?limit=1');
      const executions = await response.json();
      if (executions.length > 0) {
        setLastExecution(executions[0]);
      }
    } catch (error) {
      console.error('Failed to fetch last execution:', error);
    }
  };

  useEffect(() => {
    fetchLastExecution();
  }, []);

  const handleRunAgent = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/dev/run/TaskManager', { method: 'POST' });
      const result = await response.json();
      if (result.ok) {
        // Wait a bit then refresh execution data
        setTimeout(() => {
          fetchLastExecution();
          setIsLoading(false);
        }, 5000);
      }
    } catch (error) {
      console.error('Failed to run agent:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">TaskManager Dashboard</h1>
              <p className="text-gray-600 mt-1">AI-powered task management and team performance</p>
            </div>
            <TaskManagerControls 
              onRunAgent={handleRunAgent}
              isLoading={isLoading}
              lastExecution={lastExecution}
            />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Last Execution</h3>
                {lastExecution ? (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Status: <span className="font-medium">{lastExecution.status}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Created: {new Date(lastExecution.createdAt).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      Steps: {lastExecution.steps?.length || 0}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No executions yet</p>
                )}
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Quick Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={handleRunAgent}
                    disabled={isLoading}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? 'Running...' : 'Run TaskManager'}
                  </button>
                  <button
                    onClick={() => setActiveTab('chat')}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                  >
                    Chat with AI
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">System Status</h3>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-600">TaskManager Active</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-600">Chat Endpoint Ready</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-600">Email System Ready</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
              {lastExecution?.steps ? (
                <div className="space-y-3">
                  {lastExecution.steps.slice(-5).map((step: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div>
                        <span className="font-medium text-gray-900">{step.name}</span>
                        <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                          step.status === 'ok' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {step.status}
                        </span>
                      </div>
                      {step.output && (
                        <span className="text-sm text-gray-500">
                          {typeof step.output === 'object' ? JSON.stringify(step.output).substring(0, 50) + '...' : step.output}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No recent activity</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <ChatInterface />
        )}

        {activeTab === 'tasks' && (
          <TaskList />
        )}

        {activeTab === 'performance' && (
          <TeamPerformance />
        )}
      </div>
    </div>
  );
};
