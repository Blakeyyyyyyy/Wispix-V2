import React from 'react';

interface ToolCallProps {
  toolCall: {
    tool: string;
    status: string;
    result?: any;
    error?: string;
    reasoning?: string;
  };
}

export function ToolCallDisplay({ toolCall }: ToolCallProps) {
  const getToolIcon = (tool: string) => {
    const icons: Record<string, string> = {
      'request_user_input': '❓',
      'search_api_docs': '📚',
      'list_project_files': '📁',
      'test_api_credentials': '🔑',
      'save_requirements': '💾',
      'call_builder_agent': '🤖',
      'save_conversation_state': '📝'
    };
    return icons[tool] || '🔧';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'completed': 'text-green-600 bg-green-50',
      'success': 'text-green-600 bg-green-50',
      'error': 'text-red-600 bg-red-50',
      'pending': 'text-yellow-600 bg-yellow-50'
    };
    return colors[status] || 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="tool-call-display border-l-4 border-blue-500 bg-blue-50 p-3 my-2 rounded-r">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{getToolIcon(toolCall.tool)}</span>
        <span className="font-medium text-blue-900 capitalize">
          {toolCall.tool.replace(/_/g, ' ')}
        </span>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(toolCall.status)}`}>
          {toolCall.status}
        </span>
      </div>

      {toolCall.reasoning && (
        <div className="text-sm text-blue-700 mb-2">
          <strong>Reasoning:</strong> {toolCall.reasoning}
        </div>
      )}

      {toolCall.result && toolCall.status === 'completed' && (
        <div className="text-sm text-green-700">
          <strong>Result:</strong> {JSON.stringify(toolCall.result, null, 2)}
        </div>
      )}

      {toolCall.error && toolCall.status === 'error' && (
        <div className="text-sm text-red-700">
          <strong>Error:</strong> {toolCall.error}
        </div>
      )}
    </div>
  );
} 