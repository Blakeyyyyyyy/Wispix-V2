/*
  # Fix missing project_context column in automation_flows table

  1. Changes
    - Add project_context column to automation_flows table if it doesn't exist
    - Ensure the column has proper default value and constraints

  2. Safety
    - Uses IF NOT EXISTS to prevent errors if column already exists
    - Safe to run multiple times
    - Preserves existing data
*/

-- Add the project_context column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'automation_flows' 
    AND column_name = 'project_context'
  ) THEN
    ALTER TABLE automation_flows ADD COLUMN project_context text DEFAULT '';
    
    -- Add a comment to document the column
    COMMENT ON COLUMN automation_flows.project_context IS 'Stores the project context for the automation flow';
  END IF;
END $$;

-- Ensure the column exists and has the correct type
ALTER TABLE automation_flows ALTER COLUMN project_context SET DEFAULT '';