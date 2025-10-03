import React, { useState } from 'react';

interface ClarificationProps {
  clarification: {
    needsClarification: boolean;
    questions: string[];
    understoodSoFar: string;
    missingInfo: string[];
    suggestedDefaults: Record<string, string>;
  };
  onAnswersSubmit: (answers: any[]) => void;
  onSkip: () => void;
}

export function ClarificationModal({ clarification, onAnswersSubmit, onSkip }: ClarificationProps) {
  const [answers, setAnswers] = useState<string[]>(
    new Array(clarification.questions.length).fill('')
  );

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleSubmit = () => {
    const answersWithQuestions = clarification.questions.map((question, index) => ({
      question,
      answer: answers[index] || ''
    }));
    onAnswersSubmit(answersWithQuestions);
  };

  const allAnswered = answers.every(answer => answer.trim() !== '');

  if (!clarification.needsClarification) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">🤔 I need a few more details</h3>
        
        <div className="mb-4">
          <h4 className="font-medium text-gray-700 mb-2">What I understand so far:</h4>
          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{clarification.understoodSoFar}</p>
        </div>

        <div className="mb-6">
          <h4 className="font-medium text-gray-700 mb-3">Please help me clarify:</h4>
          {clarification.questions.map((question, index) => (
            <div key={index} className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {question}
              </label>
              <input
                type="text"
                value={answers[index]}
                onChange={(e) => handleAnswerChange(index, e.target.value)}
                placeholder="Your answer..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {clarification.suggestedDefaults && Object.keys(clarification.suggestedDefaults).length > 0 && (
                <div className="text-xs text-blue-600 mt-1">
                  💡 Suggestion: {Object.values(clarification.suggestedDefaults)[index] || 'No suggestion'}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button 
            onClick={onSkip}
            className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Skip & Use Defaults
          </button>
          <button 
            onClick={handleSubmit}
            disabled={!allAnswered}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Continue with These Details
          </button>
        </div>
      </div>
    </div>
  );
} 