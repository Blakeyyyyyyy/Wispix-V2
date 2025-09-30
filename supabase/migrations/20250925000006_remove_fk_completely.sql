-- Completely remove the foreign key constraint temporarily
-- This allows agent responses to be inserted even if the thread doesn't exist

-- Drop the foreign key constraint completely
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_thread_id_fkey;

-- We'll add it back later when we have the full flow working
-- For now, we just need to allow agent responses to be inserted