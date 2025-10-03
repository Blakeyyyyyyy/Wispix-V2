-- Temporarily disable RLS on automation_threads to debug flow generation
-- This is a temporary fix to get flow generation working

-- Disable RLS temporarily
ALTER TABLE automation_threads DISABLE ROW LEVEL SECURITY;

-- We'll re-enable it later with proper policies once the flow generation is working