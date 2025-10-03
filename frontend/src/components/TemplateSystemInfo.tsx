import React from 'react';
import { SUPPORTED_PROVIDERS } from '../types/automation.types';

interface TemplateSystemInfoProps {
  isVisible: boolean;
  onClose: () => void;
}

export const TemplateSystemInfo: React.FC<TemplateSystemInfoProps> = ({ isVisible, onClose }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Comprehensive Template System</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Overview */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">🎯 System Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">API Docs Integration</h4>
                <p className="text-sm text-blue-700">
                  Real-time validation using actual API documentation for accurate endpoint mapping and parameter validation.
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Template System</h4>
                <p className="text-sm text-green-700">
                  Provider-specific templates ensure correct HTTP methods, authentication, and request/response formats.
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-medium text-purple-900 mb-2">Intent Mapping</h4>
                <p className="text-sm text-purple-700">
                  Smart mapping from natural language intents to correct API endpoints and HTTP methods.
                </p>
              </div>
            </div>
          </div>

          {/* Supported Providers */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">🔧 Supported Providers & Operations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(SUPPORTED_PROVIDERS).map(([provider, operations]) => (
                <div key={provider} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2 capitalize">{provider}</h4>
                  <div className="flex flex-wrap gap-1">
                    {operations.map((operation) => (
                      <span
                        key={operation}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                      >
                        {operation}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Intent Mapping */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">🎯 Intent Mapping Rules</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Verb → Intent</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• pull/fetch/get/read → <code className="bg-white px-1 rounded">fetch</code></li>
                    <li>• create/add/insert → <code className="bg-white px-1 rounded">create</code></li>
                    <li>• update/modify/edit → <code className="bg-white px-1 rounded">update</code></li>
                    <li>• delete/remove → <code className="bg-white px-1 rounded">delete</code></li>
                    <li>• summarize/analyze → <code className="bg-white px-1 rounded">summarize</code></li>
                    <li>• notify/alert → <code className="bg-white px-1 rounded">notify</code></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Intent → HTTP Method</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• fetch → <code className="bg-white px-1 rounded">GET</code></li>
                    <li>• create → <code className="bg-white px-1 rounded">POST</code></li>
                    <li>• update → <code className="bg-white px-1 rounded">PUT/PATCH</code></li>
                    <li>• delete → <code className="bg-white px-1 rounded">DELETE</code></li>
                    <li>• summarize → <code className="bg-white px-1 rounded">POST</code></li>
                    <li>• notify → <code className="bg-white px-1 rounded">POST</code></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* API Validation */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">✅ API Validation Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Endpoint Validation</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Validates endpoints exist in API documentation</li>
                  <li>• Checks for correct HTTP methods</li>
                  <li>• Ensures proper URL structure</li>
                </ul>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Parameter Validation</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Validates required parameters</li>
                  <li>• Checks authentication headers</li>
                  <li>• Ensures proper request body format</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Code Generation */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">⚡ Smart Code Generation</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Dynamic Function Names</h4>
                  <p className="text-gray-600">
                    Uses <code className="bg-white px-1 rounded">step_1</code>, <code className="bg-white px-1 rounded">step_2</code> instead of hardcoded names
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Template-Based URLs</h4>
                  <p className="text-gray-600">
                    Generates correct base URLs and endpoint paths for each provider
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Authentication</h4>
                  <p className="text-gray-600">
                    Automatically includes proper auth headers based on provider requirements
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}; 