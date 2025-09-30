/*
  # Add project_context column to automation_flows table

  1. Changes
    - Add project_context column to automation_flows table if it doesn't exist
    - Set default value to empty string
    - Add comment for documentation

  2. Safety
    - Uses conditional check to prevent errors if column already exists
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

-- Ensure the column has the correct default value
ALTER TABLE automation_flows ALTER COLUMN project_context SET DEFAULT '';