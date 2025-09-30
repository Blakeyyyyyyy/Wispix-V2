-- Allow agent responses to be inserted without authentication
-- This is needed for the Agent1 and Agent2 response endpoints

-- Drop all existing policies on chat_messages
DROP POLICY IF EXISTS "Users can read their own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can update their own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can delete their own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Allow agent responses to be inserted without restrictions" ON chat_messages;
DROP POLICY IF EXISTS "Allow authenticated users to insert chat messages" ON chat_messages;

-- Create a very permissive policy for agent responses
CREATE POLICY "Allow agent responses to be inserted by anyone"
  ON chat_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (sender_type IN ('agent1', 'agent2', 'system'));

-- Allow users to read their own messages
CREATE POLICY "Users can read their own chat messages"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow users to read agent messages (for real-time updates)
CREATE POLICY "Users can read agent messages"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (sender_type IN ('agent1', 'agent2', 'system'));

-- Allow users to update their own messages
CREATE POLICY "Users can update their own chat messages"
  ON chat_messages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own messages
CREATE POLICY "Users can delete their own chat messages"
  ON chat_messages
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);