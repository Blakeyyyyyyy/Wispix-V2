-- Add enabled field to automation_threads table
ALTER TABLE automation_threads 
ADD COLUMN enabled BOOLEAN DEFAULT true;

-- Add comment
COMMENT ON COLUMN automation_threads.enabled IS 'Whether this automation is enabled for scheduling and execution';