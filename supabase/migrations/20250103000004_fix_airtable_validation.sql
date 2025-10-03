-- Fix Airtable validation config to use correct credential field name
UPDATE tool_definitions 
SET validation_config = '{
  "method": "GET",
  "url": "https://api.airtable.com/v0/meta/bases",
  "headers": {
    "Authorization": "Bearer __CREDENTIAL:api_key__"
  },
  "success_status": 200,
  "error_messages": {
    "401": "Invalid or expired Personal Access Token",
    "403": "Token lacks required scopes"
  }
}'
WHERE platform = 'airtable';
