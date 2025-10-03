import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase, UserCredential } from '../lib/supabase';
import { Key, Eye, EyeOff, Loader2, Trash2, AlertTriangle } from 'lucide-react';

interface DeleteCredentialModalProps {
  isOpen: boolean;
  credentialName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteCredentialModal({ isOpen, credentialName, onConfirm, onCancel }: DeleteCredentialModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-modal>
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 max-w-md w-full">
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 bg-red-600/20 rounded-full flex items-center justify-center mr-4">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-100">Delete Credential</h3>
            <p className="text-sm text-gray-400">This action cannot be undone</p>
          </div>
        </div>
        
        <p className="text-gray-300 mb-6">
          Are you sure you want to delete the credential for <span className="font-medium text-gray-100">"{credentialName}"</span>? 
          This will permanently remove the credential and it cannot be recovered.
        </p>
        
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-xl hover:bg-gray-700 transition-all duration-300"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-300"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export function CredentialsView() {
  const { user } = useAuth();
  const [credentials, setCredentials] = useState<UserCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCredentials, setVisibleCredentials] = useState<Set<string>>(new Set());
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    credentialId: string;
    credentialName: string;
  }>({
    isOpen: false,
    credentialId: '',
    credentialName: ''
  });

  useEffect(() => {
    if (user?.id) {
      loadCredentials();
    }
  }, [user?.id]);

  const loadCredentials = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_credentials')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter out flow data (service_name starts with 'flow_')
      const actualCredentials = (data || []).filter(
        cred => !cred.service_name.startsWith('flow_')
      );
      
      setCredentials(actualCredentials);
    } catch (error) {
      console.error('Error loading credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleVisibility = (credentialId: string) => {
    const newVisible = new Set(visibleCredentials);
    if (newVisible.has(credentialId)) {
      newVisible.delete(credentialId);
    } else {
      newVisible.add(credentialId);
    }
    setVisibleCredentials(newVisible);
  };

  const handleDeleteClick = (credentialId: string, credentialName: string) => {
    setDeleteModal({
      isOpen: true,
      credentialId,
      credentialName
    });
  };

  const confirmDelete = async () => {
    const { credentialId } = deleteModal;

    try {
      const { error } = await supabase
        .from('user_credentials')
        .delete()
        .eq('id', credentialId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setCredentials(credentials.filter(cred => cred.id !== credentialId));
      setDeleteModal({ isOpen: false, credentialId: '', credentialName: '' });
    } catch (error) {
      console.error('Error deleting credential:', error);
      alert('Failed to delete credential. Please try again.');
    }
  };

  const cancelDelete = () => {
    setDeleteModal({ isOpen: false, credentialId: '', credentialName: '' });
  };

  const formatServiceName = (serviceName: string) => {
    return serviceName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderCredentialValue = (credential: UserCredential) => {
    const isVisible = visibleCredentials.has(credential.id);
    const credentialValue = credential.credentials?.credential_value || 
                           JSON.stringify(credential.credentials, null, 2);

    if (isVisible) {
      return (
        <pre className="text-sm text-gray-300 bg-gray-800 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
          {credentialValue}
        </pre>
      );
    } else {
      return (
        <div className="text-sm text-gray-400 bg-gray-800 p-3 rounded-lg">
          {'•'.repeat(20)}
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mx-auto mb-2" />
          <p className="text-gray-300">Loading credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-100">Saved Credentials</h2>
          <p className="text-gray-400 mt-1">Manage your stored service credentials</p>
        </div>
      </div>

      {credentials.length === 0 ? (
        <div className="text-center py-12">
          <Key className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">No credentials saved yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Credentials will appear here when you provide them during Wispix automation setup
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {credentials.map((credential) => (
            <div
              key={credential.id}
              className="bg-gray-800 border border-gray-700 rounded-2xl p-6 hover:border-gray-600 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-medium text-gray-100 mb-1">
                    {formatServiceName(credential.service_name)}
                  </h3>
                  <p className="text-sm text-gray-400">
                    Added {formatDate(credential.created_at)}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleVisibility(credential.id)}
                    className="p-2 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-gray-700 transition-all duration-200"
                    title={visibleCredentials.has(credential.id) ? 'Hide credential' : 'Show credential'}
                  >
                    {visibleCredentials.has(credential.id) ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteClick(credential.id, formatServiceName(credential.service_name))}
                    className="p-2 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-900/20 transition-all duration-200"
                    title="Delete credential"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Credential Value
                </label>
                {renderCredentialValue(credential)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteCredentialModal
        isOpen={deleteModal.isOpen}
        credentialName={deleteModal.credentialName}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}