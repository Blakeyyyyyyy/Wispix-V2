-- Add scheduling support to flow_executions table
ALTER TABLE flow_executions 
ADD COLUMN schedule_id UUID,
ADD COLUMN scheduled_for TIMESTAMPTZ,
ADD COLUMN cron_expression TEXT,
ADD COLUMN is_scheduled BOOLEAN DEFAULT false,
ADD COLUMN last_scheduled_run TIMESTAMPTZ,
ADD COLUMN next_scheduled_run TIMESTAMPTZ;

-- Create index for scheduled executions
CREATE INDEX idx_flow_executions_scheduled 
ON flow_executions(next_scheduled_run) 
WHERE is_scheduled = true AND status != 'completed';

-- Add comment
COMMENT ON COLUMN flow_executions.schedule_id IS 'Unique identifier for the scheduled job';
COMMENT ON COLUMN flow_executions.scheduled_for IS 'When the automation is scheduled to run (for one-time executions)';
COMMENT ON COLUMN flow_executions.cron_expression IS 'Cron expression for recurring executions';
COMMENT ON COLUMN flow_executions.is_scheduled IS 'Whether this execution is scheduled (vs immediate)';
COMMENT ON COLUMN flow_executions.last_scheduled_run IS 'Last time this scheduled automation ran';
COMMENT ON COLUMN flow_executions.next_scheduled_run IS 'Next time this scheduled automation will run';