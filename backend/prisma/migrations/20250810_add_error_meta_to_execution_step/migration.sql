-- Add error and meta JSONB columns to ExecutionStep
ALTER TABLE "ExecutionStep" ADD COLUMN "error" JSONB;
ALTER TABLE "ExecutionStep" ADD COLUMN "meta"  JSONB;


