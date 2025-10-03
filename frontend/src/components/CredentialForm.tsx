import React, { useState } from 'react';
import { storeCredentials } from '../lib/credentials';

interface CredentialFormProps {
  service?: string;
  fields?: string[];
  message?: string;
  instructions?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const CredentialForm: React.FC<CredentialFormProps> = ({
  service = 'service',
  fields = [],
  message = 'Please provide your credentials.',
  instructions = 'Enter your credentials below.',
  onSuccess,
  onCancel
}) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Store all credentials as a single encrypted object
      const credentials = fields && fields.length > 0 
        ? fields.reduce((acc, field) => {
            if (values[field]) {
              acc[field] = values[field];
            }
            return acc;
          }, {} as Record<string, string>)
        : { username: values.username, password: values.password };

      const result = await storeCredentials('default-user', service, credentials);
      
      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || 'Failed to store credentials');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to store credentials');
    } finally {
      setLoading(false);
    }
  };

  const getFieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      'api_key': 'API Key',
      'integration_token': 'Integration Token',
      'secret_key': 'Secret Key',
      'client_id': 'Client ID',
      'client_secret': 'Client Secret',
      'base_id': 'Base ID'
    };
    return labels[field] || field.replace('_', ' ').toUpperCase();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">
          {(service || 'service').charAt(0).toUpperCase() + (service || 'service').slice(1)} Credentials Required
        </h3>

        <p className="text-gray-600 mb-4">{message}</p>

        <div className="bg-blue-50 p-3 rounded mb-4">
          <p className="text-sm text-blue-800">{instructions}</p>
        </div>

        <form onSubmit={handleSubmit}>
          {fields && fields.length > 0 ? fields.map((field) => (
            <div key={field} className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {getFieldLabel(field)}
              </label>
              <input
                type="password"
                value={values[field] || ''}
                onChange={(e) => setValues(prev => ({ ...prev, [field]: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                placeholder={`Enter your ${getFieldLabel(field).toLowerCase()}`}
              />
            </div>
          )) : (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={values.username || ''}
                  onChange={(e) => setValues(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  placeholder="Enter your username"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={values.password || ''}
                  onChange={(e) => setValues(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  placeholder="Enter your password"
                />
              </div>
            </>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Storing...' : 'Store Securely'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>

        <div className="mt-4 text-xs text-gray-500">
          🔒 Your credentials are encrypted and stored securely. They will never appear in chat logs.
        </div>
      </div>
    </div>
  );
};
