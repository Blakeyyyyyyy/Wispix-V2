/*
  # Create activity logs table with proper real-time support

  1. New Tables
    - `activity_logs`
      - `id` (uuid, primary key)
      - `thread_id` (uuid, foreign key to automation_threads)
      - `user_id` (uuid, foreign key to auth.users)
      - `content` (text)
      - `sender_type` (text, constraint: 'agent2' or 'system')
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `activity_logs` table
    - Add policy for users to read their own activity logs
    - Add policy for authenticated users to insert activity logs

  3. Real-time
    - Enable real-time updates for the table
*/

-- Create activity_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES automation_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('agent2', 'system')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read their own activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Users can insert activity logs" ON activity_logs;

-- Create policies for real-time access
CREATE POLICY "Users can read their own activity logs"
  ON activity_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert activity logs"
  ON activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS activity_logs_thread_id_idx ON activity_logs(thread_id);
CREATE INDEX IF NOT EXISTS activity_logs_user_id_idx ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON activity_logs(created_at);

-- Enable real-time for this table
ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;