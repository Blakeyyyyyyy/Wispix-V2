'use client';

import React, { useState, useEffect } from 'react';

interface Task {
  id: string;
  name: string;
  status: string;
  assignee: string;
  created: string;
  lastModified: string;
  source: 'airtable' | 'notion';
  fields?: any;
  properties?: any;
}

interface TaskListProps {
  className?: string;
}

export const TaskList: React.FC<TaskListProps> = ({ className = '' }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'airtable' | 'notion'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      // Get the latest execution to see current task data
      const response = await fetch('/api/executions/recent?limit=1');
      const executions = await response.json();
      
      if (executions.length > 0) {
        const execution = executions[0];
        const taskData: Task[] = [];
        
        // Process Airtable tasks
        if (execution.steps) {
          const airtableStep = execution.steps.find((step: any) => step.name === 'airtable.listRecords');
          if (airtableStep?.output?.records) {
            airtableStep.output.records.forEach((record: any) => {
              taskData.push({
                id: record.id,
                name: record.fields?.Name || 'Unknown',
                status: record.fields?.Status || 'Unknown',
                assignee: record.fields?.Name || 'Unassigned',
                created: record.fields?.Created || record.createdTime,
                lastModified: record.fields?.LastModified || record.createdTime,
                source: 'airtable' as const,
                fields: record.fields
              });
            });
          }
          
          // Process Notion tasks
          const notionStep = execution.steps.find((step: any) => step.name === 'notion.listDatabaseRows');
          if (notionStep?.output?.results) {
            notionStep.output.results.forEach((item: any) => {
              taskData.push({
                id: item.id,
                name: item.properties?.Name?.title?.[0]?.plain_text || 'Unknown',
                status: item.properties?.Status?.select?.name || 'Unknown',
                assignee: item.properties?.Assignee?.people?.[0]?.name || 'Unassigned',
                created: item.created_time,
                lastModified: item.last_edited_time,
                source: 'notion' as const,
                properties: item.properties
              });
            });
          }
        }
        
        setTasks(taskData);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTasks = tasks.filter(task => {
    const sourceMatch = filter === 'all' || task.source === filter;
    const statusMatch = statusFilter === 'all' || task.status.toLowerCase().includes(statusFilter.toLowerCase());
    return sourceMatch && statusMatch;
  });

  const getStatusColor = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('done') || lowerStatus.includes('complete')) return 'bg-green-100 text-green-800';
    if (lowerStatus.includes('progress')) return 'bg-blue-100 text-blue-800';
    if (lowerStatus.includes('todo')) return 'bg-yellow-100 text-yellow-800';
    if (lowerStatus.includes('blocked')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getSourceIcon = (source: string) => {
    return source === 'airtable' ? '📊' : '📝';
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
      {/* Header and Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Task List</h2>
            <p className="text-gray-600 mt-1">
              {tasks.length} total tasks from Airtable and Notion
            </p>
          </div>
          <button
            onClick={fetchTasks}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data Source</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Sources</option>
              <option value="airtable">Airtable</option>
              <option value="notion">Notion</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="todo">Todo</option>
              <option value="progress">In Progress</option>
              <option value="done">Done</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
        </div>

        {/* Task Counts */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <div className="text-2xl mr-3">📊</div>
              <div>
                <p className="text-sm text-blue-600">Airtable Tasks</p>
                <p className="text-2xl font-bold text-blue-900">
                  {tasks.filter(t => t.source === 'airtable').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center">
              <div className="text-2xl mr-3">📝</div>
              <div>
                <p className="text-sm text-purple-600">Notion Tasks</p>
                <p className="text-2xl font-bold text-purple-900">
                  {tasks.filter(t => t.source === 'notion').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <div className="text-2xl mr-3">✅</div>
              <div>
                <p className="text-sm text-green-600">Completed</p>
                <p className="text-2xl font-bold text-green-900">
                  {tasks.filter(t => t.status.toLowerCase().includes('done') || t.status.toLowerCase().includes('complete')).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center">
              <div className="text-2xl mr-3">⏳</div>
              <div>
                <p className="text-sm text-yellow-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {tasks.filter(t => !t.status.toLowerCase().includes('done') && !t.status.toLowerCase().includes('complete')).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="bg-white rounded-lg shadow">
        {filteredTasks.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-4xl mb-4">📭</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
            <p className="text-gray-500">Try adjusting your filters or refresh the data</p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Task
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assignee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Modified
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{task.name}</div>
                      <div className="text-sm text-gray-500">ID: {task.id.substring(0, 8)}...</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{task.assignee}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">{getSourceIcon(task.source)}</span>
                        <span className="text-sm text-gray-900 capitalize">{task.source}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(task.lastModified).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
