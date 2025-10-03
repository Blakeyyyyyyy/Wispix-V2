-- Add automation_id column to automation_threads table
ALTER TABLE automation_threads 
ADD COLUMN automation_id TEXT UNIQUE DEFAULT gen_random_uuid()::text;

-- Update existing records to have unique automation IDs
UPDATE automation_threads 
SET automation_id = 'auto_' || replace(id::text, '-', '') || '_' || extract(epoch from created_at)::text
WHERE automation_id IS NULL;

-- Create index for better performance
CREATE INDEX idx_automation_threads_automation_id ON automation_threads(automation_id);

-- Add comment
COMMENT ON COLUMN automation_threads.automation_id IS 'Unique identifier for the automation, used for external integrations and scheduling';