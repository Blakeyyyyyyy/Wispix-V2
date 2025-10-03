-- Create flow_executions table for tracking background executions
CREATE TABLE flow_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES automation_threads(id) ON DELETE CASCADE,
  automation_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  steps JSONB NOT NULL,
  project_context TEXT,
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  results JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_flow_executions_user_id ON flow_executions(user_id);
CREATE INDEX idx_flow_executions_thread_id ON flow_executions(thread_id);
CREATE INDEX idx_flow_executions_status ON flow_executions(status);
CREATE INDEX idx_flow_executions_automation_id ON flow_executions(automation_id);

-- Enable RLS
ALTER TABLE flow_executions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own flow executions" ON flow_executions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own flow executions" ON flow_executions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flow executions" ON flow_executions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flow executions" ON flow_executions
  FOR DELETE USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE flow_executions IS 'Tracks background execution of automation flows';