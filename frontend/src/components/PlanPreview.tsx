import React, { useState, useEffect, useCallback } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import { AutomationPlan, AgentSpec } from '../types/automation.types';

interface PlanPreviewProps {
  // Legacy props for existing usage
  draftId?: string;
  planJSON?: AutomationPlan;
  isOpen?: boolean;
  onClose?: () => void;
  onApprove?: (draftId: string) => void;
  
  // New props for Builder/Planner
  spec?: AgentSpec;
  loading?: boolean;
  error?: string;
}

const PlanPreview: React.FC<PlanPreviewProps> = ({ 
  // Legacy props
  draftId, 
  planJSON, 
  isOpen, 
  onClose, 
  onApprove,
  // New props
  spec,
  loading: propLoading,
  error: propError
}) => {
  const [plan, setPlan] = useState<AutomationPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use prop values if in Builder mode, otherwise use state
  const isBuilderMode = spec !== undefined;
  const displayLoading = isBuilderMode ? propLoading : loading;
  const displayError = isBuilderMode ? propError : error;

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`http://localhost:3001/api/plan/draft/${draftId}`);
      const data = await response.json();
      
      if (data.success) {
        setPlan(data.draftPlan.json);
      } else {
        setError(data.error || 'Failed to load plan');
      }
    } catch (err) {
      setError('Failed to load plan');
    } finally {
      setLoading(false);
    }
  }, [draftId]);

  useEffect(() => {
    console.log('🔍 PlanPreview useEffect - isOpen:', isOpen, 'draftId:', draftId, 'planJSON:', planJSON);
    if (isOpen) {
      if (planJSON) {
        // Use direct plan data if provided
        console.log('📋 Using direct planJSON data');
        setPlan(planJSON);
        setLoading(false);
        setError(null);
      } else if (draftId && draftId !== 'direct-plan') {
        // Fetch from database
        console.log('🗄️ Fetching plan from database');
        fetchPlan();
      }
    }
  }, [isOpen, draftId, planJSON, fetchPlan]);

  const handleApprove = async () => {
    setLoading(true);
    try {
      if (draftId === 'direct-plan') {
        // Direct approval without database
        console.log('Approving plan directly');
        if (draftId) onApprove?.(draftId);
        onClose?.();
      } else {
        // Try database approval
        const response = await fetch('http://localhost:3001/api/plan/approve', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ draftId }),
        });
        
        const data = await response.json();
        
        if (data.success) {
          if (draftId) onApprove?.(draftId);
          onClose?.();
        } else {
          setError(data.error || 'Failed to approve plan');
        }
      }
    } catch (err) {
      setError('Failed to approve plan');
    } finally {
      setLoading(false);
    }
  };

  // Legacy modal mode - only show when isOpen is true
  if (!isBuilderMode && !isOpen) return null;

  // Helper function to get provider badge color
  const getProviderBadgeColor = (provider?: string) => {
    switch (provider) {
      case 'airtable': return 'bg-orange-100 text-orange-800';
      case 'notion': return 'bg-blue-100 text-blue-800';
      case 'gmail': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper function to get action badge color
  const getActionBadgeColor = (action?: string) => {
    switch (action) {
      case 'sendEmail': return 'bg-green-100 text-green-800';
      case 'createRecord': return 'bg-blue-100 text-blue-800';
      case 'listRecords': return 'bg-purple-100 text-purple-800';
      case 'createPage': return 'bg-indigo-100 text-indigo-800';
      case 'listDatabaseRows': return 'bg-pink-100 text-pink-800';
      case 'listThreads': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Builder mode - inline display
  if (isBuilderMode) {
    return (
      <div className="plan-preview bg-gray-50 rounded-lg border border-gray-200">
        {displayLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading preview...</span>
          </div>
        )}

        {displayError && (
          <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="text-red-500 mr-3" size={20} />
            <span className="text-red-700">{displayError}</span>
          </div>
        )}

        {spec && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* Left: Step List */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{spec.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{spec.description}</p>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">Steps ({spec.steps.length})</h4>
                {spec.steps.map((step, index) => (
                  <div key={step.id} className="border border-gray-300 rounded-lg p-3 bg-white">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {index + 1}. {step.name || step.id}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {step.type}
                        </span>
                        {step.provider && (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getProviderBadgeColor(step.provider)}`}>
                            {step.provider}
                          </span>
                        )}
                        {step.action && (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getActionBadgeColor(step.action)}`}>
                            {step.action}
                          </span>
                        )}
                      </div>
                    </div>
                    {step.config && Object.keys(step.config).length > 0 && (
                      <div className="text-xs text-gray-500 truncate">
                        Config: {Object.keys(step.config).join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {spec.limits && (
                <div className="border border-gray-300 rounded-lg p-3 bg-white">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Limits</h4>
                  <div className="text-xs text-gray-600 space-y-1">
                    {spec.limits.maxSteps && <div>Max Steps: {spec.limits.maxSteps}</div>}
                    {spec.limits.timeoutSec && <div>Timeout: {spec.limits.timeoutSec}s</div>}
                    {spec.limits.budgetUSD && <div>Budget: ${spec.limits.budgetUSD}</div>}
                  </div>
                </div>
              )}
            </div>

            {/* Right: JSON View */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700">JSON Specification</h4>
              <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-96">
                <pre className="text-sm text-green-400 font-mono">
                  {JSON.stringify(spec, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Review Automation Plan</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {displayLoading && !plan && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading plan...</span>
            </div>
          )}

          {displayError && (
            <div className="flex items-center p-4 mb-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="text-red-500 mr-3" size={20} />
              <span className="text-red-700">{displayError}</span>
            </div>
          )}

          {plan && (
            <div className="space-y-6">
              {/* Trigger Information */}
              {plan.trigger && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Trigger</h3>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <div className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {plan.trigger.type.toUpperCase()}
                      </div>
                      {plan.trigger.schedule && (
                        <span className="ml-2 text-sm font-medium text-gray-600 bg-yellow-100 px-2 py-1 rounded">
                          🕐 {plan.trigger.schedule}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Automation Steps</h3>
                <div className="space-y-4">
                  {plan.steps.map((step, index) => (
                    <div key={step.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <div className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                          {step.intent.toUpperCase()}
                        </div>
                        <div className="ml-2 px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          {step.method}
                        </div>
                        <span className="ml-2 text-sm font-medium text-gray-600">
                          {step.provider}
                        </span>
                        <div className="ml-2 px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          API Docs Validated
                        </div>
                      </div>
                      
                      <h4 className="font-medium text-gray-900 mb-1">
                        Step {index + 1} - {step.id}
                      </h4>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        Endpoint: {step.endpoint}
                      </p>

                      {/* Data Flow Information */}
                      <div className="text-sm text-gray-500 mb-2">
                        {step.inputFrom ? (
                          <span>📥 Input from: <code className="bg-gray-100 px-1 rounded">{step.inputFrom}</code></span>
                        ) : (
                          <span>📥 No input (first step)</span>
                        )}
                        <br />
                        <span>📤 Output as: <code className="bg-gray-100 px-1 rounded">{step.outputAs}</code></span>
                      </div>
                      
                      {step.config && Object.keys(step.config).length > 0 && (
                        <div className="bg-gray-50 rounded p-3">
                          <p className="text-xs font-medium text-gray-700 mb-1">Configuration:</p>
                          <pre className="text-xs text-gray-600 overflow-x-auto">
                            {JSON.stringify(step.config, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {plan.auth.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Authentication</h3>
                  <div className="space-y-2">
                    {plan.auth.map((auth, index) => (
                      <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                        <span className="text-sm text-gray-700">
                          {auth.provider}: {auth.method}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            disabled={displayLoading}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleApprove}
            disabled={displayLoading || !plan}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {displayLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <Check size={16} className="mr-2" />
                Approve & Create
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlanPreview; 