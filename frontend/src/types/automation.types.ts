// Updated TypeScript interfaces to match comprehensive template system

export interface AutomationPlan {
  trigger: {
    type: 'cron' | 'webhook' | 'manual';
    schedule?: string; // Required if type is 'cron'
  };
  steps: Array<{
    id: string;
    provider: string;
    intent: 'fetch' | 'create' | 'update' | 'delete' | 'summarize' | 'analyze' | 'generate' | 'notify' | 'send' | 'parse' | 'trigger';
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    endpoint: string;
    inputFrom: string | null;
    outputAs: string;
    config?: any;
  }>;
  auth: Array<{
    provider: string;
    method: string;
  }>;
}

export interface PlanStep {
  id: string;
  provider: string;
  intent: 'fetch' | 'create' | 'update' | 'delete' | 'summarize' | 'analyze' | 'generate' | 'notify' | 'send' | 'parse' | 'trigger';
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint: string;
  inputFrom: string | null;
  outputAs: string;
  config?: any;
}

export interface StreamingData {
  delta: string;
  streamingState: 'analyzing' | 'planning' | 'plan_ready' | 'executing' | 'reflecting' | 'complete' | 'error' | 'checklist_error' | 'clarification_needed' | 'generic_response' | 'deploying' | 'deployment-success' | 'deployment-error' | 'deployment-option';
  planJSON?: AutomationPlan;
  done?: boolean;
}

export interface AutomationResponse {
  success: boolean;
  automationId?: string;
  fileName?: string;
  message?: string;
  error?: string;
  details?: string;
  warning?: boolean;
}

// New interfaces for API docs integration
export interface ApiValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ProviderTemplate {
  method: string;
  buildUrl: (endpoint: string, config?: any) => string;
  buildBody: (data: any, config?: any) => any;
  processResponse: (resp: any) => any;
}

export interface IntentMapping {
  [provider: string]: {
    [intent: string]: {
      endpoint: string;
      method: string;
    };
  };
}

// Supported providers and their operations
export const SUPPORTED_PROVIDERS = {
  airtable: ['fetch', 'create', 'update', 'delete'],
  openai: ['summarize', 'analyze', 'generate'],
  notion: ['create', 'update', 'fetch'],
  slack: ['notify', 'fetch', 'create'],
  stripe: ['fetch', 'create', 'webhook'],
  email: ['send', 'parse'],
  github: ['fetch', 'create', 'update'],
  google: ['fetch', 'create'],
  webhook: ['trigger', 'notify']
} as const;

export type SupportedProvider = keyof typeof SUPPORTED_PROVIDERS;
export type SupportedIntent = typeof SUPPORTED_PROVIDERS[SupportedProvider][number];

// Frontend equivalents of backend AgentSpec types
export const PROVIDERS = ["airtable", "notion", "gmail"] as const;

export const ACTIONS = {
  airtable: ["createRecord", "listRecords"],
  notion: ["createPage", "listDatabaseRows"],
  gmail: ["sendEmail", "listThreads"]
} as const;

export type Provider = typeof PROVIDERS[number];
export type Action<T extends Provider> = typeof ACTIONS[T][number];

export interface Limits {
  maxSteps?: number;
  budgetUSD?: number;
  timeoutSec?: number;
}

export interface StepSpec {
  id: string;
  name?: string;
  type: "adapter" | "approval" | "branch" | "loop";
  provider?: Provider;
  action?: string;
  config?: Record<string, any>;
}

export interface AgentSpec {
  name: string;
  description: string;
  steps: StepSpec[];
  limits?: Limits;
}

export type PlanResult =
  | { success: true; kind: 'spec'; source: 'template'|'llm'; spec: AgentSpec; confidence?: number; }
  | { success: true; kind: 'clarify'; questions: string[]; suggestedDefaults?: Record<string, any>; }
  | { success: false; error: string; };