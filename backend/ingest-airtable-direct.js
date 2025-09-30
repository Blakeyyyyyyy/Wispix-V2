require('dotenv').config();
const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const AIRTABLE_DOCS = `## 1. Authentication
- **Type**: API Key (Personal Access Token or legacy API key)  
- **Usage**: Included in the HTTP header  
  \`\`\`http
  Authorization: Bearer keyXXXXXXXXXXXXXX
  Content-Type: application/json
  \`\`\`

## 2. Base URL
https://api.airtable.com/v0/{baseId}/{tableName}

{baseId}: the Base ID (e.g. appXXXXXXXXXXXXXX)

{tableName} or {tableId}: table name or table ID

## 3. Core & Common Endpoints

### List records (GET)
Path: /v0/{baseId}/{table}
Headers: Authorization
Query params: pageSize, offset, filterByFormula, view

Sample:
\`\`\`http
GET https://api.airtable.com/v0/app12345/Tasks?pageSize=50
Authorization: Bearer key...
\`\`\`

### Create record (POST)
\`\`\`http
POST /v0/{baseId}/{table}
{
  "fields": {
    "Name": "New record",
    "Status": "Open"
  }
}
\`\`\`

### Retrieve, Update, Delete
GET /v0/{baseId}/{table}/{recordId}

PATCH /v0/{baseId}/{table}/{recordId}

DELETE /v0/{baseId}/{table}/{recordId}

## 4. Common Errors
400: Malformed JSON, bad formula

401: Invalid API Key

403: Permission denied

404: Base/table/record not found

429: Rate limit (5 req/sec/base)

## 5. Special Rules
ISO 8601 dates

Pagination via offset

Empty fields (false/empty string) are excluded by default

Max URL length: 16,000 characters

Rate limit: 5 requests/sec/base`;

function chunkMarkdown(rawMd) {
  const chunks = [];
  const lines = rawMd.split('\n');
  let currentChunk = '';
  let currentTokens = 0;
  const maxTokens = 800;
  
  for (const line of lines) {
    const lineTokens = Math.ceil(line.length / 4); // Rough token estimation
    
    // If adding this line would exceed token limit, start new chunk
    if (currentTokens + lineTokens > maxTokens && currentChunk.trim()) {
      chunks.push({
        id: uuidv4(),
        contentMd: currentChunk.trim(),
        tokenCount: currentTokens,
        hash: ''
      });
      currentChunk = '';
      currentTokens = 0;
    }
    
    currentChunk += line + '\n';
    currentTokens += lineTokens;
  }
  
  // Add final chunk
  if (currentChunk.trim()) {
    chunks.push({
      id: uuidv4(),
      contentMd: currentChunk.trim(),
      tokenCount: currentTokens,
      hash: ''
    });
  }
  
  return chunks;
}

async function ingestAirtableDocs() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    console.log('🚀 Starting Airtable API docs ingestion...');
    
    // Check if API doc already exists
    const existingResult = await client.query(
      'SELECT id FROM api_docs WHERE provider = $1 AND version = $2',
      ['airtable', 'v0']
    );
    
    let apiDocId;
    if (existingResult.rows.length > 0) {
      // Update existing
      apiDocId = existingResult.rows[0].id;
      await client.query(
        'UPDATE api_docs SET raw_md = $1, source_url = $2, fetched_at = NOW() WHERE id = $3',
        [AIRTABLE_DOCS, 'https://airtable.com/developers/web/api', apiDocId]
      );
      
      // Delete existing chunks
      await client.query('DELETE FROM api_chunks WHERE api_doc_id = $1', [apiDocId]);
      
      console.log('📝 Updated existing Airtable API docs');
    } else {
      // Create new
      const result = await client.query(
        'INSERT INTO api_docs (id, provider, version, source_url, raw_md) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [uuidv4(), 'airtable', 'v0', 'https://airtable.com/developers/web/api', AIRTABLE_DOCS]
      );
      apiDocId = result.rows[0].id;
      console.log('📝 Created new Airtable API docs');
    }
    
    // Chunk and store
    const chunks = chunkMarkdown(AIRTABLE_DOCS);
    console.log(`📄 Created ${chunks.length} chunks`);
    
    for (const chunk of chunks) {
      const hash = crypto.createHash('md5').update(chunk.contentMd).digest('hex');
      
      await client.query(
        'INSERT INTO api_chunks (id, api_doc_id, hash, content_md, token_count) VALUES ($1, $2, $3, $4, $5)',
        [uuidv4(), apiDocId, hash, chunk.contentMd, chunk.tokenCount]
      );
    }
    
    console.log('✅ Successfully ingested Airtable API docs');
    console.log('📄 API Doc ID:', apiDocId);
    
    // Test retrieval
    const providersResult = await client.query('SELECT DISTINCT provider FROM api_docs');
    const providers = providersResult.rows.map(row => row.provider);
    console.log('📋 Available providers:', providers);
    
    const chunksResult = await client.query(
      'SELECT content_md FROM api_chunks WHERE api_doc_id = $1 LIMIT 3',
      [apiDocId]
    );
    console.log('🔍 Retrieved chunks:', chunksResult.rows.length);
    
  } catch (error) {
    console.error('❌ Error ingesting Airtable docs:', error);
  } finally {
    await client.end();
  }
}

ingestAirtableDocs(); 