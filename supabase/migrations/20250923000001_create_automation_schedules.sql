-- Create automation_schedules table to store schedule configurations
CREATE TABLE automation_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES automation_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT false,
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('minutes', 'hours', 'days', 'weeks', 'custom')),
  interval_value INTEGER NOT NULL DEFAULT 1,
  start_time TIME,
  end_time TIME,
  days_of_week INTEGER[],
  cron_expression TEXT,
  scheduled_for TIMESTAMPTZ,
  has_time_range BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(thread_id) -- One schedule per automation
);

-- Add RLS policies
ALTER TABLE automation_schedules ENABLE ROW LEVEL SECURITY;

-- Policy for users to manage their own schedules
CREATE POLICY "Users can manage their own automation schedules" ON automation_schedules
  FOR ALL USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_automation_schedules_thread_id ON automation_schedules(thread_id);
CREATE INDEX idx_automation_schedules_user_id ON automation_schedules(user_id);
CREATE INDEX idx_automation_schedules_enabled ON automation_schedules(enabled) WHERE enabled = true;