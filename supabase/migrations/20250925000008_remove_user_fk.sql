-- Remove the user_id foreign key constraint as well
-- This allows agent responses to be inserted with any user_id

-- Drop the user_id foreign key constraint
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_user_id_fkey;

-- We'll add proper constraints back later when we have the full flow working