-- Add end time support to flow_executions table
ALTER TABLE flow_executions 
ADD COLUMN end_time TEXT,
ADD COLUMN has_end_time BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN flow_executions.end_time IS 'End time for scheduled executions (HH:MM format)';
COMMENT ON COLUMN flow_executions.has_end_time IS 'Whether this execution has an end time constraint';