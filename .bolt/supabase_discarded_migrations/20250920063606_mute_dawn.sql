/*
  # Fix RLS policies for user_credentials table

  1. Security
    - Enable RLS on `user_credentials` table
    - Add policy for authenticated users to select their own data
    - Add policy for authenticated users to insert their own data
    - Add policy for authenticated users to update their own data
    - Add policy for authenticated users to delete their own data

  This fixes the "permission denied for schema public" errors by properly configuring
  Row Level Security policies for the user_credentials table.
*/

-- Enable RLS on user_credentials table
ALTER TABLE user_credentials ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can select own credentials" ON user_credentials;
DROP POLICY IF EXISTS "Users can insert own credentials" ON user_credentials;
DROP POLICY IF EXISTS "Users can update own credentials" ON user_credentials;
DROP POLICY IF EXISTS "Users can delete own credentials" ON user_credentials;

-- Create SELECT policy for authenticated users
CREATE POLICY "Users can select own credentials"
  ON user_credentials
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

-- Create INSERT policy for authenticated users
CREATE POLICY "Users can insert own credentials"
  ON user_credentials
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

-- Create UPDATE policy for authenticated users
CREATE POLICY "Users can update own credentials"
  ON user_credentials
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Create DELETE policy for authenticated users
CREATE POLICY "Users can delete own credentials"
  ON user_credentials
  FOR DELETE
  TO authenticated
  USING (auth.uid()::text = user_id);