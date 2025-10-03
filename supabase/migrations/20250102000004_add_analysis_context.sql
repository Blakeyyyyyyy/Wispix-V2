-- Add analysis_context column to execution_plans table
ALTER TABLE execution_plans
ADD COLUMN IF NOT EXISTS analysis_context JSONB;