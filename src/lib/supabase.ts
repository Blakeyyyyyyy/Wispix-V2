import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🔧 Supabase config:', {
  url: supabaseUrl ? 'Present' : 'Missing',
  key: supabaseAnonKey ? 'Present' : 'Missing',
  allEnvVars: Object.keys(import.meta.env)
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!');
  console.log('Available environment variables:', Object.keys(import.meta.env));
  throw new Error('Supabase configuration is missing. Please check your environment variables.');
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export { supabase };

// Database types
export interface AutomationThread {
  id: string;
  user_id: string;
  name: string;
  automation_id: string;
  enabled: boolean; // Whether this automation is enabled
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  thread_id: string;
  user_id: string;
  content: string;
  sender_type: 'user' | 'agent1';
  created_at: string;
}

export interface AutomationFlow {
  id: string;
  thread_id: string;
  user_id: string;
  steps: FlowStep[];
  project_context: string;
  created_at: string;
  updated_at: string;
}

export interface FlowStep {
  id: string;
  content: string;
  order: number;
}

export interface ActivityLog {
  id: string;
  thread_id: string;
  user_id: string;
  content: string;
  sender_type: 'agent2' | 'system';
  created_at: string;
}

export interface UserCredential {
  id: string;
  user_id: string;
  service_name: string;
  credentials: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface FlowExecution {
  id: string;
  thread_id: string;
  execution_thread_id?: string; // Unique thread ID for agent communication
  automation_id: string;
  user_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'scheduled' | 'paused' | 'stopped';
  steps: FlowStep[];
  project_context?: string;
  current_step: number;
  total_steps: number;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  results: any[];
  // Scheduling fields
  schedule_id?: string;
  scheduled_for?: string;
  cron_expression?: string;
  is_scheduled: boolean;
  last_scheduled_run?: string;
  next_scheduled_run?: string;
  end_time?: string;
  has_end_time: boolean;
  created_at: string;
  updated_at: string;
}

export interface AutomationJob {
  id: string;
  execution_id: string;
  job_id: string;
  queue_name: string;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'paused' | 'cancelled';
  created_at: string;
  processed_at?: string;
  failed_at?: string;
  error_message?: string;
  retry_count: number;
  max_retries: number;
}