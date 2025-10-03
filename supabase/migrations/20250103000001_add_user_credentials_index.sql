-- Add index for user_credentials lookup performance
CREATE INDEX IF NOT EXISTS idx_user_credentials_user_service ON user_credentials(user_id, service_name);

-- Ensure RLS allows service role to insert system messages
-- This should already be covered by existing RLS policies, but let's be explicit
-- The service role should be able to insert messages with sender_type='system'
