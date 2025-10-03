/*
  # Fix project_context column in automation_flows table

  1. Changes
    - Ensure project_context column exists in automation_flows table
    - Add column if it doesn't exist to prevent schema cache issues

  2. Safety
    - Uses IF NOT EXISTS to prevent errors if column already exists
    - Safe to run multiple times
*/

-- Ensure the project_context column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'automation_flows' AND column_name = 'project_context'
  ) THEN
    ALTER TABLE automation_flows ADD COLUMN project_context text DEFAULT '';
  END IF;
END $$;