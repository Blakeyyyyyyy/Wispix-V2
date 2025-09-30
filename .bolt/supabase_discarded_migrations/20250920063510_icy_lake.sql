/*
  # Fix RLS policies for user_credentials table

  1. Security
    - Enable RLS on `user_credentials` table
    - Add policies for authenticated users to manage their own credentials
    - Fix permission denied errors

  This migration fixes the "permission denied for schema public" error by properly
  configuring Row Level Security policies for the user_credentials table.
*/

-- Enable RLS on user_credentials table
ALTER TABLE user_credentials ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can manage own credentials" ON user_credentials;
DROP POLICY IF EXISTS "Users can insert their own credentials" ON user_credentials;
DROP POLICY IF EXISTS "Users can update their own credentials" ON user_credentials;
DROP POLICY IF EXISTS "Users can view their own credentials" ON user_credentials;

-- Create comprehensive policies for user_credentials
CREATE POLICY "Users can select own credentials"
  ON user_credentials
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credentials"
  ON user_credentials
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credentials"
  ON user_credentials
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own credentials"
  ON user_credentials
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);