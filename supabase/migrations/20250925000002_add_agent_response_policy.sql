-- Add policy to allow agent responses to be inserted without authentication
-- This is needed for the Agent1 and Agent2 response endpoints

-- Allow agent responses to be inserted without authentication
CREATE POLICY "Allow agent responses to be inserted"
  ON chat_messages
  FOR INSERT
  TO anon
  WITH CHECK (sender_type IN ('agent1', 'agent2', 'system'));

-- Allow agent responses to be inserted by authenticated users
CREATE POLICY "Allow authenticated users to insert agent responses"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (sender_type IN ('agent1', 'agent2', 'system') OR auth.uid() = user_id);