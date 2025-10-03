-- Fix chat_messages constraint to allow 'system' sender_type
-- This ensures the CREDENTIALS_SAVED event can be inserted

-- Drop the existing constraint
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_sender_type_check;

-- Add the constraint back with 'system' included
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_sender_type_check 
  CHECK (sender_type IN ('user', 'agent1', 'agent2', 'system'));
