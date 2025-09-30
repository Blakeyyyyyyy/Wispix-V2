-- Temporarily disable foreign key constraint for agent responses
-- This allows agent responses to be inserted even if the thread doesn't exist yet

-- Drop the foreign key constraint temporarily
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_thread_id_fkey;

-- Add a more permissive constraint that allows any UUID
-- We'll add proper validation later when we have the full flow working
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_thread_id_fkey 
  FOREIGN KEY (thread_id) REFERENCES automation_threads(id) ON DELETE CASCADE
  DEFERRABLE INITIALLY DEFERRED;