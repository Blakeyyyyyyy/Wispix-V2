-- Fix the agent response policy to be more permissive
-- Drop the existing restrictive policies and create more permissive ones

-- Drop existing policies
DROP POLICY IF EXISTS "Allow agent responses to be inserted" ON chat_messages;
DROP POLICY IF EXISTS "Allow authenticated users to insert agent responses" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert their own chat messages" ON chat_messages;

-- Create a more permissive policy for agent responses
CREATE POLICY "Allow agent responses to be inserted without restrictions"
  ON chat_messages
  FOR INSERT
  TO anon
  WITH CHECK (sender_type IN ('agent1', 'agent2', 'system'));

-- Allow authenticated users to insert any chat messages
CREATE POLICY "Allow authenticated users to insert chat messages"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);