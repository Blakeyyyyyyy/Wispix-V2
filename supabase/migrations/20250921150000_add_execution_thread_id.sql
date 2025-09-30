-- Add execution_thread_id column to flow_executions table
-- This will store unique thread IDs for each execution to send to agents

ALTER TABLE flow_executions 
ADD COLUMN execution_thread_id TEXT;

-- Add index for better performance
CREATE INDEX idx_flow_executions_execution_thread_id ON flow_executions(execution_thread_id);

-- Add comment explaining the purpose
COMMENT ON COLUMN flow_executions.execution_thread_id IS 'Unique thread ID for this execution, sent to agents instead of the automation thread_id';