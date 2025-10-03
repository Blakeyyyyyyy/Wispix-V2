-- First, let's see what duplicates exist
-- This will show us the duplicate entries
SELECT user_id, platform, service_name, COUNT(*) as count
FROM user_credentials 
WHERE user_id = 'a912fc99-6c95-434e-a2d5-0a2d35334692'
GROUP BY user_id, platform, service_name
HAVING COUNT(*) > 1;

-- Remove duplicates, keeping only the most recent one for each user_id + platform combination
WITH ranked_credentials AS (
  SELECT *,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, platform 
      ORDER BY created_at DESC, updated_at DESC
    ) as rn
  FROM user_credentials
)
DELETE FROM user_credentials 
WHERE id IN (
  SELECT id FROM ranked_credentials WHERE rn > 1
);

-- Now apply the platform update for null platforms
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

-- Create compound index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_creds_platform 
ON user_credentials(user_id, platform);

-- Add unique constraint on user_id + platform combination
ALTER TABLE user_credentials 
ADD CONSTRAINT unique_user_platform UNIQUE (user_id, platform);
