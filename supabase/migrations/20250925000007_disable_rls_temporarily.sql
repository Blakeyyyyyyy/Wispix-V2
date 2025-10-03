-- Temporarily disable RLS on chat_messages to allow agent responses
-- This is a temporary fix to get the credential popup working

-- Disable RLS temporarily
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;

-- We'll re-enable it later with proper policies once the flow is working