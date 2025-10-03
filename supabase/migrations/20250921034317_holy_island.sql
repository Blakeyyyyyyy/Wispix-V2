/*
  # Create automation flows table

  1. New Tables
    - `automation_flows`
      - `id` (uuid, primary key)
      - `thread_id` (uuid, foreign key to automation_threads)
      - `user_id` (uuid, foreign key to auth.users)
      - `steps` (jsonb array of flow steps)
      - `project_context` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `automation_flows` table
    - Add policy for users to manage their own flows

  3. Migration
    - Migrate existing flow data from user_credentials to automation_flows
    - Clean up flow data from user_credentials table
*/

-- Create automation_flows table
CREATE TABLE IF NOT EXISTS automation_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES automation_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  steps jsonb DEFAULT '[]'::jsonb,
  project_context text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE automation_flows ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own flows"
  ON automation_flows
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS automation_flows_thread_id_idx ON automation_flows(thread_id);
CREATE INDEX IF NOT EXISTS automation_flows_user_id_idx ON automation_flows(user_id);

-- Add unique constraint to ensure one flow per thread
ALTER TABLE automation_flows ADD CONSTRAINT automation_flows_thread_id_unique UNIQUE (thread_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_automation_flows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER automation_flows_updated_at
  BEFORE UPDATE ON automation_flows
  FOR EACH ROW
  EXECUTE FUNCTION update_automation_flows_updated_at();

-- Migrate existing flow data from user_credentials
DO $$
DECLARE
  flow_record RECORD;
  thread_uuid uuid;
BEGIN
  FOR flow_record IN 
    SELECT * FROM user_credentials 
    WHERE service_name LIKE 'flow_%'
  LOOP
    -- Extract thread_id from service_name (format: flow_{thread_id})
    thread_uuid := CAST(SUBSTRING(flow_record.service_name FROM 6) AS uuid);
    
    -- Insert into automation_flows
    INSERT INTO automation_flows (thread_id, user_id, steps, project_context)
    VALUES (
      thread_uuid,
      flow_record.user_id,
      COALESCE(flow_record.credentials->'steps', '[]'::jsonb),
      COALESCE(flow_record.credentials->>'projectContext', '')
    )
    ON CONFLICT (thread_id) DO UPDATE SET
      steps = EXCLUDED.steps,
      project_context = EXCLUDED.project_context,
      updated_at = now();
  END LOOP;
END $$;

-- Clean up flow data from user_credentials
DELETE FROM user_credentials WHERE service_name LIKE 'flow_%';