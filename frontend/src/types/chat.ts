import { AutomationPlan } from './automation.types';

export interface Message {
  id: string;
  type: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  streamingState?: 'analyzing' | 'planning' | 'executing' | 'reflecting' | 'complete' | 'clarification_needed' | 'generic_response' | 'error' | 'plan_ready' | 'checklist_error' | 'generating_code';
  planJSON?: AutomationPlan;
  done?: boolean;
  toolCalls?: any[];
  automation?: any;
  isStreaming?: boolean;
} 