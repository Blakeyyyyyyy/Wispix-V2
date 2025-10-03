-- Enable extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add new column if missing (avoids breaking existing Float[] col)
ALTER TABLE api_chunks
  ADD COLUMN IF NOT EXISTS embedding_vec vector(1536);