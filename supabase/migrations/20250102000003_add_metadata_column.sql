-- Add metadata column to store structured response data
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add index for credential request queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_metadata_credential 
ON chat_messages ((metadata->>'isCredentialRequest')) 
WHERE metadata->>'isCredentialRequest' = 'true';
