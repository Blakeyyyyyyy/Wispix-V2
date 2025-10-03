-- Add 'scheduled' status to flow_executions status check constraint
ALTER TABLE flow_executions DROP CONSTRAINT flow_executions_status_check;
ALTER TABLE flow_executions ADD CONSTRAINT flow_executions_status_check 
  CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled', 'scheduled'));