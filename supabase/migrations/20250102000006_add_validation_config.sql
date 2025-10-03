-- Add validation_config column to tool_definitions table
ALTER TABLE tool_definitions 
ADD COLUMN validation_config JSONB;

-- Seed Airtable validation config
UPDATE tool_definitions 
SET validation_config = '{
  "method": "GET",
  "url": "https://api.airtable.com/v0/meta/bases",
  "headers": {
    "Authorization": "Bearer __CREDENTIAL:personal_access_token__"
  },
  "success_status": 200,
  "error_messages": {
    "401": "Invalid or expired Personal Access Token",
    "403": "Token lacks required scopes"
  }
}'
WHERE platform = 'airtable';

-- Seed Asana validation config
UPDATE tool_definitions 
SET validation_config = '{
  "method": "GET",
  "url": "https://app.asana.com/api/1.0/users/me",
  "headers": {
    "Authorization": "Bearer __CREDENTIAL:personal_access_token__"
  },
  "success_status": 200,
  "error_messages": {
    "401": "Invalid Asana Personal Access Token"
  }
}'
WHERE platform = 'asana';
