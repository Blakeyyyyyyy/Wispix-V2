'use client';

import React, { useState, useEffect } from 'react';

interface TeamMember {
  name: string;
  score: number;
  completed: number;
  total: number;
  emoji: string;
}

interface PerformanceData {
  teamPerformance: Record<string, TeamMember>;
  velocity: number;
  insights: string;
  completedToday: string[];
  incomplete: string[];
  blocked: string[];
  tomorrowPriorities: string[];
}

interface AgentExecution {
  id: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  steps: Array<{
    name: string;
    status: string;
    output?: any;
  }>;
}

interface TeamPerformanceProps {
  className?: string;
}

export const TeamPerformance: React.FC<TeamPerformanceProps> = ({ className = '' }) => {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [agentExecutions, setAgentExecutions] = useState<AgentExecution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [showAgentPerformance, setShowAgentPerformance] = useState(false);

  useEffect(() => {
    fetchPerformanceData();
    fetchAgentExecutions();
  }, []);

  const fetchPerformanceData = async () => {
    try {
      // Get the latest execution to see performance data
      const response = await fetch('http://localhost:3001/api/executions/recent?limit=1');
      const executions = await response.json();
      
      if (executions.length > 0) {
        const execution = executions[0];
        const aiStep = execution.steps?.find((step: any) => step.name === 'ai.analysis');
        
        if (aiStep?.output) {
          // This would normally come from the AI analysis, but for now we'll create mock data
          // based on the actual task data we have
          const mockData: PerformanceData = {
            teamPerformance: {
              "Blake": { name: "Blake", score: 0, completed: 0, total: 2, emoji: "👤" },
              "Chase": { name: "Chase", score: 0, completed: 0, total: 2, emoji: "👤" },
              "Beau": { name: "Beau", score: 20, completed: 0, total: 2, emoji: "👤" }
            },
            velocity: 0,
            insights: "Team has 6 total tasks, all currently in progress or todo status",
            completedToday: [],
            incomplete: ["Go gym (Blake)", "Talk to team (Blake)", "Talk to client B (Chase)", "Gym (Chase)", "Send reminder to Geoffry (Beau)", "Overmono (Beau)"],
            blocked: [],
            tomorrowPriorities: ["Complete gym tasks", "Follow up on client communication", "Prepare for Friday meeting"]
          };
          
          setPerformanceData(mockData);
        }
      }
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAgentExecutions = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/executions/recent?limit=10');
      const executions = await response.json();
      
      // Filter for TaskManager executions only
      const taskManagerExecutions = executions.filter((exec: any) => 
        exec.automationId === '3aad661a-e3bd-4fa6-970e-d850352e4e45'
      );
      
      setAgentExecutions(taskManagerExecutions);
    } catch (error) {
      console.error('Failed to fetch agent executions:', error);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const formatExecutionTime = (execution: AgentExecution) => {
    const start = new Date(execution.createdAt);
    const end = execution.completedAt ? new Date(execution.completedAt) : new Date();
    const duration = Math.round((end.getTime() - start.getTime()) / 1000);
    return `${duration}s`;
  };

  const getExecutionStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'error': return 'text-red-600 bg-red-100';
      case 'running': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStepStatusIcon = (step: any) => {
    if (step.status === 'ok') return '✅';
    if (step.status === 'error') return '❌';
    return '⏳';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Agent Performance Toggle */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Team Performance</h2>
        <button
          onClick={() => setShowAgentPerformance(!showAgentPerformance)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showAgentPerformance ? '📊 Hide Agent Performance' : '🤖 Show Agent Performance'}
        </button>
      </div>

      {/* Agent Performance Section */}
      {showAgentPerformance && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            🤖 Agent Performance & Run History
          </h3>
          
          {/* Agent Status */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium text-gray-900">Current Status</h4>
              <button
                onClick={fetchAgentExecutions}
                className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
              >
                🔄 Refresh
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Next Run:</span> 
                <span className="ml-2 text-blue-600">Monday 2:00 AM</span>
              </div>
              <div>
                <span className="font-medium">Daily Report:</span> 
                <span className="ml-2 text-blue-600">Monday 7:30 AM</span>
              </div>
              <div>
                <span className="font-medium">Last Execution:</span> 
                <span className="ml-2 text-gray-600">
                  {agentExecutions.length > 0 ? 
                    new Date(agentExecutions[0].createdAt).toLocaleString() : 
                    'Never'
                  }
                </span>
              </div>
              <div>
                <span className="font-medium">Total Runs:</span> 
                <span className="ml-2 text-gray-600">{agentExecutions.length}</span>
              </div>
            </div>
          </div>

          {/* Execution History */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Recent Executions</h4>
            {agentExecutions.slice(0, 5).map((execution) => (
              <div key={execution.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getExecutionStatusColor(execution.status)}`}>
                      {execution.status}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(execution.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    Duration: {formatExecutionTime(execution)}
                  </span>
                </div>
                
                {/* Steps */}
                <div className="space-y-2">
                  {execution.steps.slice(0, 3).map((step, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm">
                      <span>{getStepStatusIcon(step)}</span>
                      <span className="font-medium">{step.name}</span>
                      {step.output && (
                        <span className="text-gray-500">
                          {typeof step.output === 'object' ? 
                            Object.keys(step.output).join(', ') : 
                            String(step.output)
                          }
                        </span>
                      )}
                    </div>
                  ))}
                  {execution.steps.length > 3 && (
                    <div className="text-sm text-gray-500">
                      +{execution.steps.length - 3} more steps
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Performance Data */}
      {performanceData && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Team Metrics</h3>
          
          {/* Performance Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{performanceData.velocity}</div>
              <div className="text-sm text-blue-800">Velocity Score</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{performanceData.completedToday.length}</div>
              <div className="text-sm text-green-800">Completed Today</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{performanceData.incomplete.length}</div>
              <div className="text-sm text-yellow-800">In Progress</div>
            </div>
          </div>

          {/* Team Members */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Individual Performance</h4>
            {Object.values(performanceData.teamPerformance).map((member) => (
              <div key={member.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{member.emoji}</span>
                  <span className="font-medium">{member.name}</span>
                  <span className="text-sm text-gray-500">
                    {member.completed}/{member.total} tasks
                  </span>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreBg(member.score)} ${getScoreColor(member.score)}`}>
                  {member.score}%
                </div>
              </div>
            ))}
          </div>

          {/* Insights */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">AI Insights</h4>
            <p className="text-blue-800 text-sm">{performanceData.insights}</p>
          </div>

          {/* Tomorrow's Priorities */}
          <div className="mt-6">
            <h4 className="font-medium text-gray-900 mb-3">Tomorrow's Priorities</h4>
            <div className="space-y-2">
              {performanceData.tomorrowPriorities.map((priority, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className="text-blue-500">→</span>
                  <span className="text-sm text-gray-700">{priority}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!performanceData && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No performance data available</h3>
          <p className="text-gray-500">Run the TaskManager to generate performance insights</p>
        </div>
      )}
    </div>
  );
};
