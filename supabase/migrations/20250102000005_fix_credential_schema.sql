-- Fix existing credentials to have platform column
UPDATE user_credentials 
SET platform = CASE 
  WHEN service_name LIKE '%airtable%' THEN 'airtable'
  WHEN service_name LIKE '%slack%' THEN 'slack'
  WHEN service_name LIKE '%gmail%' THEN 'gmail'
  WHEN service_name LIKE '%stripe%' THEN 'stripe'
  WHEN service_name LIKE '%asana%' THEN 'asana'
  ELSE LOWER(SPLIT_PART(service_name, '_', 1))
END
WHERE platform IS NULL;

-- Add constraint to prevent future null platforms
ALTER TABLE user_credentials 
ALTER COLUMN platform SET NOT NULL;

-- Create compound index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_creds_platform 
ON user_credentials(user_id, platform);

-- Add unique constraint on user_id + platform combination
ALTER TABLE user_credentials 
ADD CONSTRAINT unique_user_platform UNIQUE (user_id, platform);
