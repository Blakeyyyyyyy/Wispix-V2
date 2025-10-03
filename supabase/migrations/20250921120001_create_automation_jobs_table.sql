-- Create automation_jobs table to track BullMQ jobs
CREATE TABLE automation_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID REFERENCES flow_executions(id) ON DELETE CASCADE NOT NULL,
  job_id TEXT NOT NULL, -- BullMQ job ID
  queue_name TEXT DEFAULT 'automation-scheduler',
  status TEXT DEFAULT 'waiting', -- waiting, active, completed, failed, paused, cancelled
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  processed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3
);

-- Add RLS policies for automation_jobs
ALTER TABLE automation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own automation jobs." ON automation_jobs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM flow_executions 
      WHERE flow_executions.id = automation_jobs.execution_id 
      AND flow_executions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own automation jobs." ON automation_jobs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM flow_executions 
      WHERE flow_executions.id = automation_jobs.execution_id 
      AND flow_executions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own automation jobs." ON automation_jobs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM flow_executions 
      WHERE flow_executions.id = automation_jobs.execution_id 
      AND flow_executions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own automation jobs." ON automation_jobs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM flow_executions 
      WHERE flow_executions.id = automation_jobs.execution_id 
      AND flow_executions.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_automation_jobs_execution_id ON automation_jobs(execution_id);
CREATE INDEX idx_automation_jobs_job_id ON automation_jobs(job_id);
CREATE INDEX idx_automation_jobs_status ON automation_jobs(status);
CREATE INDEX idx_automation_jobs_queue_name ON automation_jobs(queue_name);

-- Add comments
COMMENT ON TABLE automation_jobs IS 'Tracks BullMQ jobs for scheduled automations';
COMMENT ON COLUMN automation_jobs.job_id IS 'BullMQ job identifier';
COMMENT ON COLUMN automation_jobs.queue_name IS 'Name of the BullMQ queue';
COMMENT ON COLUMN automation_jobs.status IS 'Current status of the job';
COMMENT ON COLUMN automation_jobs.retry_count IS 'Number of times this job has been retried';
COMMENT ON COLUMN automation_jobs.max_retries IS 'Maximum number of retries allowed';