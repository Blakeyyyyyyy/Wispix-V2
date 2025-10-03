import React, { useState } from 'react';
import { CheckCircle, XCircle, Key, Loader2, MessageCircle, Send } from 'lucide-react';

interface AgentPlan {
  name: string;
  type: string;
  capabilities: string[];
  requiredCredentials: string[];
  estimatedCost: number;
  configuration: any;
  id?: string;
}

interface QuestionAnswer {
  question: string;
  answer: string;
  timestamp: Date;
}

export function PlanApproval({ 
  plan, 
  onApprove, 
  onReject 
}: { 
  plan: AgentPlan;
  onApprove: (credentials: any) => void;
  onReject: () => void;
}) {
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [isDeploying, setIsDeploying] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [questions, setQuestions] = useState<QuestionAnswer[]>([]);
  const [isAskingQuestion, setIsAskingQuestion] = useState(false);
  
  const askQuestion = async () => {
    if (!currentQuestion.trim() || !plan.id) return;
    
    setIsAskingQuestion(true);
    try {
      const response = await fetch('/api/approval-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId: plan.id,
          question: currentQuestion 
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to get answer');
      }
      
      const { answer } = await response.json();
      
      setQuestions(prev => [...prev, { 
        question: currentQuestion, 
        answer,
        timestamp: new Date()
      }]);
      
      setCurrentQuestion('');
    } catch (error) {
      console.error('Error asking question:', error);
      alert('Failed to get answer. Please try again.');
    } finally {
      setIsAskingQuestion(false);
    }
  };
  
  const handleApprove = async () => {
    setIsDeploying(true);
    await onApprove(credentials);
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-y-auto p-6">
        <h2 className="text-2xl font-bold mb-4">Approve Your AI Agent</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Agent Details */}
          <div>
            {/* Agent Details */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-2">{plan.name}</h3>
              <p className="text-gray-600 mb-4">{plan.type}</p>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Capabilities:</h4>
                {plan.capabilities.map((cap, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>{cap}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span>Estimated Monthly Cost:</span>
                  <span className="font-semibold">${plan.estimatedCost}</span>
                </div>
              </div>
            </div>
            
            {/* Credential Collection */}
            {plan.requiredCredentials.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  Required Credentials
                </h3>
                
                {plan.requiredCredentials.map((cred) => (
                  <div key={cred} className="mb-4">
                    <label className="block text-sm font-medium mb-1">
                      {cred}
                    </label>
                    <input
                      type={cred.includes('password') ? 'password' : 'text'}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder={`Enter ${cred}`}
                      onChange={(e) => setCredentials({
                        ...credentials,
                        [cred]: e.target.value
                      })}
                    />
                  </div>
                ))}
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                  <p className="text-blue-800">
                    🔒 Your credentials are encrypted and never stored in plain text
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Right Column - Q&A Section */}
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Ask Questions Before Approving
            </h3>
            
            {/* Question Input */}
            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  value={currentQuestion}
                  onChange={(e) => setCurrentQuestion(e.target.value)}
                  placeholder="Ask about the plan, capabilities, or implementation..."
                  className="flex-1 px-3 py-2 border rounded-lg"
                  onKeyPress={(e) => e.key === 'Enter' && askQuestion()}
                />
                <button 
                  onClick={askQuestion} 
                  disabled={!currentQuestion.trim() || isAskingQuestion}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isAskingQuestion ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Ask
                </button>
              </div>
            </div>
            
            {/* Q&A History */}
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {questions.map((q, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3">
                  <div className="mb-2">
                    <p className="text-sm font-medium text-gray-700">
                      <span className="text-blue-600">Q:</span> {q.question}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-800">
                      <span className="text-green-600">A:</span> {q.answer}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {q.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              
              {questions.length === 0 && (
                <div className="text-center text-gray-500 text-sm py-8">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>Ask questions about your plan before approving</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-3 mt-6 pt-6 border-t">
          <button
            onClick={handleApprove}
            disabled={isDeploying}
            className="flex-1 bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isDeploying ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Deploying...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Approve & Deploy
              </>
              )}
          </button>
          
          <button
            onClick={onReject}
            disabled={isDeploying}
            className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300"
          >
            <XCircle className="w-5 h-5 inline mr-2" />
            Modify Plan
          </button>
        </div>
      </div>
    </div>
  );
}
