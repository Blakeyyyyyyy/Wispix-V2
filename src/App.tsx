import React from 'react';
import { useAuth } from './hooks/useAuth';
import { AuthForm } from './components/AuthForm';
import { Dashboard } from './components/Dashboard';
import { WebhookHandler } from './components/WebhookHandler';

function App() {
  const { user, loading } = useAuth();

  // Add error boundary
  React.useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('App Error:', error);
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <WebhookHandler />
      {user ? <Dashboard /> : <AuthForm />}
    </>
  );
}

export default App;