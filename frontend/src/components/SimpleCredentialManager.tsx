import React, { useState } from 'react';
import { storeCredentials, getCredentials, deleteCredentials } from '../lib/credentials';

interface SimpleCredentialManagerProps {
  service: string;
  onCredentialsStored?: () => void;
  onCredentialsRetrieved?: (credentials: any) => void;
}

export const SimpleCredentialManager: React.FC<SimpleCredentialManagerProps> = ({
  service,
  onCredentialsStored,
  onCredentialsRetrieved
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleStoreCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Username and password are required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await storeCredentials('default-user', service, {
        username,
        password
      });

      if (result.success) {
        setSuccess('Credentials stored securely!');
        setUsername('');
        setPassword('');
        onCredentialsStored?.();
      } else {
        setError(result.error || 'Failed to store credentials');
      }
    } catch (err) {
      setError('Failed to store credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleGetCredentials = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await getCredentials('default-user', service);

      if (result.success) {
        setSuccess('Credentials retrieved successfully!');
        onCredentialsRetrieved?.(result.credentials);
      } else {
        setError(result.error || 'Failed to retrieve credentials');
      }
    } catch (err) {
      setError('Failed to retrieve credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCredentials = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await deleteCredentials('default-user', service);

      if (result.success) {
        setSuccess('Credentials deleted successfully!');
      } else {
        setError(result.error || 'Failed to delete credentials');
      }
    } catch (err) {
      setError('Failed to delete credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg border">
      <h3 className="text-lg font-semibold mb-4">
        Manage {service} Credentials
      </h3>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <p className="text-green-700 text-sm">{success}</p>
        </div>
      )}

      <form onSubmit={handleStoreCredentials} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="Enter username"
            disabled={loading}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="Enter password"
            disabled={loading}
          />
        </div>
        
        <div className="flex space-x-2">
          <button
            type="submit"
            disabled={loading || !username || !password}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Storing...' : 'Store Credentials'}
          </button>
          
          <button
            type="button"
            onClick={handleGetCredentials}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Get Credentials'}
          </button>
          
          <button
            type="button"
            onClick={handleDeleteCredentials}
            disabled={loading}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Deleting...' : 'Delete Credentials'}
          </button>
        </div>
      </form>
      
      <div className="mt-4 text-xs text-gray-500">
        <p>🔒 Credentials are encrypted before storage</p>
        <p>🛡️ Only you can access your stored credentials</p>
      </div>
    </div>
  );
};
