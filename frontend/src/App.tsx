import React, { useState } from 'react';
import { AgentBuilder } from './components/AgentBuilder';
import CredentialTestPage from './components/CredentialTestPage';
import './App.css';

const Navigation: React.FC<{ currentPage: string; onPageChange: (page: string) => void }> = ({ currentPage, onPageChange }) => {
  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex justify-between items-center">
        <div className="text-xl font-bold text-gray-800">
          Wispix AI Agent Builder
        </div>
        <div className="flex space-x-4">
          <button
            onClick={() => onPageChange('builder')}
            className={`px-3 py-1 rounded text-sm ${
              currentPage === 'builder' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Agent Builder
          </button>
          <button
            onClick={() => onPageChange('credentials')}
            className={`px-3 py-1 rounded text-sm ${
              currentPage === 'credentials' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Credential Test
          </button>
        </div>
      </div>
    </nav>
  );
};

function App() {
  const [currentPage, setCurrentPage] = useState('builder');

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />
      <main className="container mx-auto px-4 py-8">
        {currentPage === 'builder' ? <AgentBuilder /> : <CredentialTestPage />}
      </main>
    </div>
  );
}

export default App;
