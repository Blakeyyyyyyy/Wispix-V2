-- Create API docs tables manually
-- Run this if Prisma db push fails due to connection issues

-- Create api_docs table
CREATE TABLE IF NOT EXISTS api_docs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider      text NOT NULL,
  version       text NOT NULL,
  source_url    text,
  raw_md        text NOT NULL,
  fetched_at    timestamptz DEFAULT NOW(),
  created_at    timestamptz DEFAULT NOW(),
  updated_at    timestamptz DEFAULT NOW(),
  UNIQUE(provider, version)
);

-- Create api_chunks table
CREATE TABLE IF NOT EXISTS api_chunks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_doc_id    uuid NOT NULL REFERENCES api_docs(id) ON DELETE CASCADE,
  hash          text UNIQUE NOT NULL,
  content_md    text NOT NULL,
  embedding     vector(1536), -- pgvector type
  token_count   integer,
  created_at    timestamptz DEFAULT NOW(),
  updated_at    timestamptz DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_api_docs_provider_version ON api_docs(provider, version);
CREATE INDEX IF NOT EXISTS idx_api_chunks_api_doc_id ON api_chunks(api_doc_id);
CREATE INDEX IF NOT EXISTS idx_api_chunks_hash ON api_chunks(hash); 