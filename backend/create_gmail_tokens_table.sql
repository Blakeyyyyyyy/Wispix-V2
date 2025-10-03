-- Create GmailTokens table manually
CREATE TABLE IF NOT EXISTS gmail_tokens (
  id VARCHAR(255) PRIMARY KEY DEFAULT 'default',
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expiry_date TIMESTAMP,
  scope TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_gmail_tokens_id ON gmail_tokens(id);
