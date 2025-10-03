import axios from 'axios';

const BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';

class ApiService {
  private baseUrl = BASE_URL;

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
    };
  }

  // Create axios instance
  private createAxiosInstance() {
    const instance = axios.create({
      baseURL: this.baseUrl,
      headers: this.getHeaders(),
      timeout: 60000, // 60 second timeout for Claude API calls
      withCredentials: true, // ADD THIS to all axios calls
    });

    // Add request interceptor for logging
    instance.interceptors.request.use((config) => {
      console.log('API Request:', config.method?.toUpperCase(), config.url);
      return config;
    });

    // Add response interceptor for debugging
    instance.interceptors.response.use(
      (response) => {
        console.log('API Response:', response.status, response.config.url);
        return response;
      },
      (error) => {
        console.error('API Error:', error.response?.status, error.config?.url, error.message);
        return Promise.reject(error);
      }
    );

    return instance;
  }

  get api() {
    return this.createAxiosInstance();
  }
}

export const apiService = new ApiService();
export const api = apiService.api;

// Agent creation method
export const createAgent = async (message: string) => {
  const response = await fetch(`${apiService['baseUrl']}/api/build-agent-smart`, {
    method: 'POST',
    headers: apiService['getHeaders'](),
    credentials: 'include',  // ADD THIS to all fetch calls
    body: JSON.stringify({ messages: [{ role: 'user', content: message }] }),
  });

  // Check if this is a credential requirement (JSON response)
  if (response.headers.get('content-type')?.includes('application/json')) {
    const data = await response.json();
    if (data.type === 'credential_required') {
      return {
        ...data,
        isCredentialRequired: true
      };
    }
  }

  // Return the response for streaming (SSE)
  return response;
};

export const claudeAPI = {
  generateText: (prompt: string) => 
    api.post('/api/claude/generate', { prompt }),
    
  generateAutomation: (prompt: string) =>
    api.post('/api/claude/generate-automation', { 
      prompt,
      type: 'general',
      description: prompt 
    }),
};

export const automationAPI = {
  // Save automation to database
  saveAutomation: (automation: any) => {
    // Validate automation has required fields
    if (!automation.planJSON) {
      throw new Error('Automation missing planJSON');
    }
    
    return api.post('/api/automations', {
      name: automation.name,
      description: automation.description,
      workflowJson: {
        ...automation,
        planJSON: automation.planJSON // Ensure planJSON is properly included
      },
      config: automation.planJSON, // Store planJSON in config field as well
      status: 'active'
    });
  },

  // Execute automation immediately
  executeAutomation: (automationId: string, automation?: any) =>
    api.post(`/api/automation/${automationId}/execute`, { automation }),

  // Get execution status
  getExecutionStatus: (executionId: string) =>
    api.get(`/api/executions/${executionId}/status`),

  // List user's automations
  listAutomations: () =>
    api.get('/api/automation/automations'),

  // Update automation status
  updateStatus: (automationId: string, status: 'active' | 'paused' | 'archived') =>
    api.post(`/api/automation/${automationId}/toggle`, { status }),

  // Delete automation
  deleteAutomation: (automationId: string) =>
    api.delete(`/api/automation/${automationId}`),
};

export const scheduleAPI = {
  // Schedule an automation (using working endpoint that creates real cron jobs)
  scheduleAutomation: (automationId: string, cronExpression: string, automation?: any) =>
    api.post(`/api/working-schedule/${automationId}`, { cronExpression, automation }),

  // Unschedule an automation
  unscheduleAutomation: (automationId: string) =>
    api.delete(`/api/automations/${automationId}/schedule`),

  // Toggle automation on/off (enable/disable)
  toggleAutomation: (automationId: string, enabled: boolean) =>
    api.patch(`/api/automations/${automationId}/toggle`, { enabled }),

  // Get schedule status
  getScheduleStatus: (automationId: string) =>
    api.get(`/api/automations/${automationId}/schedule`),

  // Get all scheduled automations (using working endpoint for real schedules)
  getScheduledAutomations: () =>
    api.get('/api/working-schedules'),
};



export const requirementsAPI = {
  // Send message to Requirements Agent
  sendMessage: (message: string, sessionId?: string) =>
    api.post('/api/requirements/chat', { message, sessionId }),
  
  // Get session status
  getStatus: (sessionId: string) =>
    api.get(`/api/requirements/status/${sessionId}`),

  // Get requirements file
  getRequirementsFile: (sessionId: string) =>
    api.get(`/api/requirements/files/${sessionId}`),
};

export const threeAgentAPI = {
  // Send message to 3-Agent Automation System
  createAutomation: (message: string, sessionId?: string) =>
    api.post('/api/automation/create', { message, sessionId }),
  
  // Get automation status
  getAutomationStatus: (sessionId: string) =>
    api.get(`/api/automation/status/${sessionId}`),
};

// Builder/Planner API
export const plan = async (payload: { 
  prompt: string; 
  context?: any; 
  preferTemplate?: boolean 
}): Promise<import('../types/automation.types').PlanResult> => {
  try {
    const response = await api.post('/api/plan', payload);
    return response.data;
  } catch (error: any) {
    console.error('Plan API error:', error);
    
    // Handle API error responses
    if (error.response?.data?.error) {
      return {
        success: false,
        error: error.response.data.error
      };
    }
    
    // Handle network/other errors
    return {
      success: false,
      error: error.message || 'Failed to generate plan'
    };
  }
};

// Health and documentation endpoints
export const getHealth = () => fetch(`${BASE_URL}/health`).then(r => r.json());
export const getDocs = (provider: string, query: string) => 
  fetch(`${BASE_URL}/api/docs?provider=${provider}&q=${encodeURIComponent(query)}`).then(r => r.json()); 

// Builder Deploy & Execution APIs
export const deploy = async (spec: import('../types/automation.types').AgentSpec): Promise<{ executionId: string }> => {
  const res = await api.post('/api/automation', { spec, consent: true });
  return res.data;
};

export const getExecution = async (id: string): Promise<{ execution: any; steps: any[]; events: any[] }> => {
  const res = await api.get(`/api/automation/${id}`);
  return res.data;
};

export const runInboxManager = async (): Promise<{ executionId: string }> => {
  const res = await api.post('/api/dev/run/InboxManager', {});
  return res.data;
};