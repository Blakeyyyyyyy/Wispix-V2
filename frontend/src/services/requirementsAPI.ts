import { api } from './api';

export const requirementsAPI = {
  async sendMessage(message: string, sessionId?: string) {
    // For development, use a test token
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItMTc1MzY3MDA0NTMzMiIsImVtYWlsIjoidGVzdEB3aXNwaXguY29tIiwic3Vic2NyaXB0aW9uVGllciI6InBybyIsImlhdCI6MTc1MzY3MDA0NSwiZXhwIjoxNzU0Mjc0ODQ1fQ.HAmNmIsZHaKs-py_qTV4JN8XmYqMxM9fG45Q8j3baTA';
    
    // Use the correct endpoint for planning agents
    const response = await api.post('/api/build-agent-smart', {
      message,
      sessionId
    }, {
      headers: {
        'Authorization': `Bearer ${testToken}`
      }
    });
    return response.data;
  },

  async getStatus(sessionId: string) {
    const response = await api.get(`/api/requirements/status/${sessionId}`);
    return response.data;
  },

  async deployAgent(sessionId: string) {
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItMTc1MzY3MDA0NTMzMiIsImVtYWlsIjoidGVzdEB3aXNwaXguY29tIiwic3Vic2NyaXB0aWllciI6InBybyIsImlhdCI6MTc1MzY3MDA0NSwiZXhwIjoxNzU0Mjc0ODQ1fQ.HAmNmIsZHaKs-py_qTV4JN8XmYqMxM9fG45Q8j3baTA';
    
    const response = await api.post('/api/deploy-agent', {
      sessionId
    }, {
      headers: {
        'Authorization': `Bearer ${testToken}`
      }
    });
    return response.data;
  }
}; 