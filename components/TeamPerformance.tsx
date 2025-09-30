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

interface TeamPerformanceProps {
  className?: string;
}

export const TeamPerformance: React.FC<TeamPerformanceProps> = ({ className = '' }) => {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  const fetchPerformanceData = async () => {
    try {
      // Get the latest execution to see performance data
      const response = await fetch('/api/executions/recent?limit=1');
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
              "Beau": { name: "Beau", name: "Beau", score: 20, completed: 0, total: 2, emoji: "👤" }
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!performanceData) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">📊</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No performance data available</h3>
        <p className="text-gray-500">Run the TaskManager to generate performance insights</p>
      </div>
    );
  }

  const teamMembers = Object.values(performanceData.teamPerformance);
  const totalTasks = teamMembers.reduce((sum, member) => sum + member.total, 0);
  const completedTasks = teamMembers.reduce((sum, member) => sum + member.completed, 0);
  const averageScore = teamMembers.reduce((sum, member) => sum + member.score, 0) / teamMembers.length;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Team Performance Dashboard</h2>
            <p className="text-gray-600 mt-1">Real-time insights and trends</p>
          </div>
          <div className="flex space-x-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
            <button
              onClick={fetchPerformanceData}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-50 p-6 rounded-lg">
            <div className="flex items-center">
              <div className="text-3xl mr-4">👥</div>
              <div>
                <p className="text-sm text-blue-600">Team Members</p>
                <p className="text-3xl font-bold text-blue-900">{teamMembers.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 p-6 rounded-lg">
            <div className="flex items-center">
              <div className="text-3xl mr-4">📋</div>
              <div>
                <p className="text-sm text-green-600">Total Tasks</p>
                <p className="text-3xl font-bold text-green-900">{totalTasks}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 p-6 rounded-lg">
            <div className="flex items-center">
              <div className="text-3xl mr-4">✅</div>
              <div>
                <p className="text-sm text-yellow-600">Completed</p>
                <p className="text-3xl font-bold text-yellow-900">{completedTasks}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 p-6 rounded-lg">
            <div className="flex items-center">
              <div className="text-3xl mr-4">📈</div>
              <div>
                <p className="text-sm text-purple-600">Avg Score</p>
                <p className="text-3xl font-bold text-purple-900">{averageScore.toFixed(0)}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Team Performance Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {teamMembers.map((member) => (
            <div key={member.name} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{member.name}</h3>
                <span className="text-2xl">{member.emoji}</span>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Performance Score</span>
                  <span className={`text-lg font-bold ${getScoreColor(member.score)}`}>
                    {member.score}%
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getScoreBg(member.score)}`}
                    style={{ width: `${member.score}%` }}
                  ></div>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Tasks: {member.completed}/{member.total}</span>
                  <span className="text-gray-600">
                    {member.total > 0 ? Math.round((member.completed / member.total) * 100) : 0}% complete
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Velocity and Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">📈 Velocity & Trends</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Current Velocity</span>
              <span className="text-2xl font-bold text-blue-600">{performanceData.velocity} tasks/day</span>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-700">{performanceData.insights}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">🎯 Tomorrow's Priorities</h3>
          <div className="space-y-2">
            {performanceData.tomorrowPriorities.map((priority, index) => (
              <div key={index} className="flex items-center space-x-3">
                <span className="text-blue-600 font-medium">{index + 1}.</span>
                <span className="text-gray-700">{priority}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Task Status Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">⏳ Incomplete Tasks</h3>
          {performanceData.incomplete.length > 0 ? (
            <div className="space-y-2">
              {performanceData.incomplete.map((task, index) => (
                <div key={index} className="flex items-center space-x-2 p-2 bg-yellow-50 rounded">
                  <span className="text-yellow-600">•</span>
                  <span className="text-sm text-gray-700">{task}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No incomplete tasks</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">🚫 Blocked Tasks</h3>
          {performanceData.blocked.length > 0 ? (
            <div className="space-y-2">
              {performanceData.blocked.map((task, index) => (
                <div key={index} className="flex items-center space-x-2 p-2 bg-red-50 rounded">
                  <span className="text-red-600">•</span>
                  <span className="text-sm text-gray-700">{task}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No blocked tasks</p>
          )}
        </div>
      </div>

      {/* Performance Chart Placeholder */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">📊 Performance Trends</h3>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-2">📈</div>
            <p className="text-gray-500">Performance charts coming soon</p>
            <p className="text-sm text-gray-400">Historical data visualization</p>
          </div>
        </div>
      </div>
    </div>
  );
};
