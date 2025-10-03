import React, { useEffect, useRef, useState } from 'react';
import { plan, deploy, getExecution } from '../../services/api';
import { PlanResult } from '../../types/automation.types';
import PlanPreview from '../PlanPreview';

interface BuilderPaneProps {
  className?: string;
}

const BuilderPane: React.FC<BuilderPaneProps> = ({ className = '' }) => {
  const [prompt, setPrompt] = useState('');
  const [preferTemplate, setPreferTemplate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PlanResult | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [execStatus, setExecStatus] = useState<string | null>(null);
  const [execSteps, setExecSteps] = useState<Array<{ stepId: string; status: string; startedAt?: string; finishedAt?: string }>>([]);
  const [execEvents, setExecEvents] = useState<Array<{ ts: string; level: string; scope: string; msg: string }>>([]);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const planResult = await plan({
        prompt: prompt.trim(),
        preferTemplate,
        context: {
          availableConnections: ['airtable', 'notion', 'gmail']
        }
      });

      setResult(planResult);

      if (!planResult.success) {
        setError(planResult.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate plan';
      setError(errorMessage);
      setResult({
        success: false,
        error: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const mapAnswers = (a: Record<string, string>): {
    dataSource?: string;
    notificationMethod?: string;
    schedule?: string;
  } => {
    console.log('[BuilderPane] Raw answers before mapping:', a);
    
    // Map various question phrasings to canonical keys
    const mapped = {
      // Check multiple possible phrasings for data source
      dataSource: a['Which data source? (notion or airtable)']?.trim() ||
                  a['Which data source should we use (Airtable or Notion)?']?.trim() ||
                  a['What data source should I use?']?.trim() ||
                  a['dataSource']?.trim(),
      
      // Check multiple possible phrasings for notification
      notificationMethod: a['How should we notify? (gmail email)']?.trim() ||
                         a['How should we notify (Gmail email)?']?.trim() ||
                         a['How should I send notifications?']?.trim() ||
                         a['notificationMethod']?.trim(),
      
      // Check multiple possible phrasings for schedule
      schedule: a['When should this run? (e.g., daily at 9:00 AM)']?.trim() ||
               a['What time should this run daily?']?.trim() ||
               a['When should this run?']?.trim() ||
               a['schedule']?.trim()
    };
    
    console.log('[BuilderPane] Mapped answers:', mapped);
    return mapped;
  };

  // Extract canonical key from question text
  const getCanonicalKey = (question: string): string => {
    const q = question.toLowerCase();
    if (q.includes('data source') || q.includes('notion') || q.includes('airtable')) {
      return 'dataSource';
    }
    if (q.includes('notify') || q.includes('gmail') || q.includes('email')) {
      return 'notificationMethod';
    }
    if (q.includes('when') || q.includes('time') || q.includes('schedule') || q.includes('daily')) {
      return 'schedule';
    }
    // Fallback to the question itself
    return question;
  };

  const handleRegenerateWithAnswers = async (e?: React.MouseEvent) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (!result || !result.success || result.kind !== 'clarify') return;

    setLoading(true);
    setError(null);

    try {
      console.log('[BuilderPane] Raw answers state:', answers);
      const clarificationAnswers = mapAnswers(answers);
      console.log('[BuilderPane] Mapped answers:', clarificationAnswers);
      const hasAllAnswers = Boolean(
        clarificationAnswers.dataSource &&
        clarificationAnswers.notificationMethod &&
        clarificationAnswers.schedule
      );
      console.log('[BuilderPane] Has all answers?', hasAllAnswers, {
        dataSource: clarificationAnswers.dataSource,
        notificationMethod: clarificationAnswers.notificationMethod,
        schedule: clarificationAnswers.schedule
      });
      const payload = {
        prompt,
        preferTemplate: true,
        context: {
          availableConnections: ['airtable', 'notion', 'gmail'],
          clarificationAnswers
        }
      } as const;
      console.log('[BuilderPane] Sending payload:', JSON.stringify(payload, null, 2));

      const planResult = await plan(payload as any);
      console.log('[BuilderPane] Regenerate response:', planResult);

      if ((planResult as any)?.kind === 'spec') setResult(planResult as any);
      else if ((planResult as any)?.kind === 'clarify') setResult(planResult as any);
      else setError('Planner returned unexpected result');
      
      if (!(planResult as any)?.success) {
        // Preserve error surface if the API indicates failure shape
        setError((planResult as any)?.error);
      }
    } catch (err) {
      console.error('[BuilderPane] Regenerate error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to regenerate plan';
      setError(errorMessage);
      setResult({
        success: false,
        error: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (question: string, value: string) => {
    const canonicalKey = getCanonicalKey(question);
    console.log(`[BuilderPane] Answer change:`, { question, canonicalKey, value, currentAnswers: answers });
    setAnswers(prev => {
      const updated = {
        ...prev,
        [canonicalKey]: value,
        [question]: value
      } as Record<string, string>;
      console.log('[BuilderPane] Updated answers state:', updated);
      return updated;
    });
  };

  const reset = () => {
    setPrompt('');
    setPreferTemplate(false);
    setLoading(false);
    setError(null);
    setResult(null);
    setAnswers({});
    setConsent(false);
    setExecutionId(null);
    setExecStatus(null);
    setExecSteps([]);
    setExecEvents([]);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const handleDeploy = async (e?: React.MouseEvent) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (!result || !result.success || result.kind !== 'spec') return;
    if (!consent) {
      setError('Please provide consent to deploy and run.');
      return;
    }
    try {
      setError(null);
      const res = await deploy(result.spec);
      setExecutionId(res.executionId);
      setExecStatus('pending');
    } catch (e: any) {
      setError(e?.message || 'Failed to deploy');
    }
  };

  useEffect(() => {
    const shouldStop = (status?: string | null) => {
      return !status || status === 'completed' || status === 'failed' || status === 'waiting_approval';
    };
    if (executionId) {
      const poll = async () => {
        try {
          const data = await getExecution(executionId);
          setExecStatus(data.execution?.status);
          setExecSteps(data.steps || []);
          setExecEvents(data.events || []);
          if (shouldStop(data.execution?.status) && pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        } catch (e) {
          // stop polling on error
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
      };
      // initial fetch
      poll();
      // start interval
      if (!pollingRef.current) {
        pollingRef.current = setInterval(poll, 2000) as any;
      }
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [executionId]);

  return (
    <div className={`builder-pane ${className}`}>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Automation Builder
            </h2>
            {result && (
              <button
                onClick={reset}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Start Over
              </button>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Describe what you want to automate and we'll help you build it
          </p>
        </div>

        {/* Input Section */}
        {!result && (
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
                What would you like to automate?
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., Send daily team digest via email, Capture leads from website forms and notify sales team..."
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
            </div>

            <div className="flex items-center">
              <input
                id="prefer-template"
                type="checkbox"
                checked={preferTemplate}
                onChange={(e) => setPreferTemplate(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={loading}
              />
              <label htmlFor="prefer-template" className="ml-2 block text-sm text-gray-700">
                Prefer templates (faster, based on common patterns)
              </label>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </div>
              ) : (
                'Generate Automation'
              )}
            </button>
          </div>
        )}

        {/* Results Section */}
        {result && result.success && (
          <div className="p-6">
            {result.success && result.kind === 'clarify' && (
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        Need More Information
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>Please provide more details to generate your automation:</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {result.questions.map((question, index) => {
                    console.log('[BuilderPane] Rendering question:', question);
                    return (
                      <div key={index}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{question}</label>
                        <input
                          type="text"
                          value={answers[getCanonicalKey(question)] || (answers as any)[question] || ''}
                          onChange={(e) => {
                            console.log('[BuilderPane] Input change for:', question, 'value:', e.target.value);
                            handleAnswerChange(question as any, e.target.value);
                          }}
                          placeholder="Your answer..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    );
                  })}
                </div>

                {result.suggestedDefaults && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">Suggested defaults:</h4>
                    <div className="text-sm text-blue-700">
                      {Object.entries(result.suggestedDefaults).map(([key, value]) => (
                        <div key={key} className="mb-1">
                          <strong>{key}:</strong> {String(value)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleRegenerateWithAnswers}
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Regenerating...
                    </div>
                  ) : (
                    'Regenerate with Answers'
                  )}
                </button>
              </div>
            )}

            {result.success && result.kind === 'spec' && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">
                        Automation Generated Successfully
                      </h3>
                      <div className="mt-2 text-sm text-green-700">
                        <p>
                          Generated from {result.source === 'template' ? 'template' : 'AI'}
                          {result.confidence && ` (${Math.round(result.confidence * 100)}% confidence)`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <PlanPreview spec={result.spec} />

                {/* Consent and Deploy */}
                <div className="border rounded-md p-4 space-y-3">
                  <div className="flex items-start space-x-2">
                    <input
                      id="consent"
                      type="checkbox"
                      className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      disabled={!!executionId}
                    />
                    <label htmlFor="consent" className="text-sm text-gray-700">
                      I consent to these actions.
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDeploy(e)}
                    disabled={!consent || !!executionId}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {executionId ? 'Deployed' : 'Deploy & Run'}
                  </button>
                </div>

                {/* Execution status */}
                {executionId && (
                  <div className="border rounded-md p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-700">Execution ID: <span className="font-mono">{executionId}</span></div>
                      <div className="text-sm">Status: <span className="font-semibold">{execStatus || '...'}</span></div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-800 mb-2">Steps</h4>
                        <ul className="text-sm space-y-1">
                          {execSteps.map((s) => (
                            <li key={s.stepId} className="flex justify-between border rounded px-2 py-1">
                              <span className="font-mono">{s.stepId}</span>
                              <span className="capitalize">{s.status}</span>
                            </li>
                          ))}
                          {execSteps.length === 0 && <li className="text-gray-500">No step updates yet…</li>}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-800 mb-2">Events</h4>
                        <div className="h-40 overflow-auto border rounded p-2 bg-gray-50 text-xs font-mono">
                          {execEvents.length === 0 && <div className="text-gray-500">No events yet…</div>}
                          {execEvents.map((e, idx) => (
                            <div key={idx} className="flex justify-between">
                              <span>{e.ts?.slice(11,19) || ''}</span>
                              <span className="flex-1 px-2 truncate">[{e.level}] {e.scope} - {e.msg}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BuilderPane;
