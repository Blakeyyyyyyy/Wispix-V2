require('dotenv').config();
const { Client } = require('pg');

const sql = `
-- Drop existing tables if they exist
DROP TABLE IF EXISTS api_chunks CASCADE;
DROP TABLE IF EXISTS api_docs CASCADE;

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

-- Create api_chunks table (without vector for now)
CREATE TABLE IF NOT EXISTS api_chunks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_doc_id    uuid NOT NULL REFERENCES api_docs(id) ON DELETE CASCADE,
  hash          text UNIQUE NOT NULL,
  content_md    text NOT NULL,
  embedding     text, -- Store as JSON string for now
  token_count   integer,
  created_at    timestamptz DEFAULT NOW(),
  updated_at    timestamptz DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_api_docs_provider_version ON api_docs(provider, version);
CREATE INDEX IF NOT EXISTS idx_api_chunks_api_doc_id ON api_chunks(api_doc_id);
CREATE INDEX IF NOT EXISTS idx_api_chunks_hash ON api_chunks(hash);
`;

async function createTables() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    await client.query(sql);
    console.log('✅ API docs tables created successfully');
    
    // Test the tables
    const result = await client.query('SELECT table_name FROM information_schema.tables WHERE table_name IN (\'api_docs\', \'api_chunks\')');
    console.log('📋 Created tables:', result.rows.map(row => row.table_name));
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
  } finally {
    await client.end();
  }
}

createTables(); 