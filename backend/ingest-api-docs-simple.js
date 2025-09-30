require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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

const STRIPE_DOCS = `# Stripe API v1 – Complete Reference for Automation Agent

## 1. Authentication & General Rules
- **Auth type**: API Key (Secret Key) as Bearer token.
- **Header example**: Authorization: Bearer sk_test_xxx
- **Content-Type**: application/x-www-form-urlencoded or application/json
- **Base URL**: https://api.stripe.com/v1/{resource}

## 2. Rate Limits & Retry Behavior
- Standard limits ≈ 100 read/sec and 100 write/sec per account
- On 429 Too Many Requests: response includes header Retry-After

## 3. Error Response Structure & Codes
Errors return:
\`\`\`json
{
  "error": {
    "type": "invalid_request_error" | "api_error" | "card_error" | "rate_limit_error",
    "code": "string" (optional),
    "message": "Human-readable detail",
    "param": "field_name" (optional)
  }
}
\`\`\`

## 4. Core Endpoints

### POST /v1/customers
Purpose: Create a customer.
Body params: email (string, optional), name (string, optional), description (string, optional)

### GET /v1/customers
Purpose: List customers.
Query params: limit (int, default 10, max 100), starting_after / ending_before

### POST /v1/charges
Purpose: Create a charge.
Body params: amount (integer, required) — in cents, currency (string, required), customer or source (string, required)

### GET /v1/charges
Purpose: List charges.
Query params: limit, starting_after, customer filter

### GET /v1/webhook_endpoints
Purpose: List configured webhook endpoints.

## 5. Webhooks Summary
Stripe sends HTTP POST JSON payloads to your webhook endpoint when events occur (e.g. invoice.paid, charge.succeeded).

Payload structure:
\`\`\`json
{
  "id":"evt_123",
  "object":"event",
  "type":"charge.succeeded",
  "data":{"object": { /* charge object */ } }
}
\`\`\`

Respond with HTTP 2xx quickly to acknowledge. Stripe retries delivery on non-2xx or timeouts.`;

const OPENAI_DOCS = `# OpenAI API – Internal Automation Reference

## 1. Authentication
- **Type**: Bearer token (API Key)
- **Header**: Authorization: Bearer YOUR_API_KEY
- **Content-Type**: application/json
- **Base URL**: https://api.openai.com/v1

## 2. Rate Limits
- Limits vary by model and account
- Throttled on: Requests per minute (RPM) and Tokens per minute (TPM)
- On 429 Too Many Requests: response includes Retry-After header
- Error: rate_limit_error

## 3. Error Format
All error responses follow this structure:
\`\`\`json
{
  "error": {
    "message": "Error message",
    "type": "invalid_request_error | rate_limit_error | authentication_error | server_error",
    "param": "optional parameter name"
  }
}
\`\`\`

Common HTTP status codes:
400: Invalid request
401: Invalid or missing API key
403: Permission denied
429: Rate limit exceeded
500/502/503: Server error (retryable)

## 4. Core Endpoints

### POST /v1/chat/completions
Generate a chat-based response (e.g., GPT-3.5, GPT-4).

Request Body:
\`\`\`json
{
  "model": "gpt-4",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "What's the weather in Paris?" }
  ],
  "temperature": 0.7,
  "max_tokens": 200
}
\`\`\`

Key Params:
- model (string, required)
- messages (array of chat messages)
- temperature (float, optional, 0–2, default: 1)
- top_p (float, optional)
- n (int, optional): number of completions
- stream (boolean): stream responses if true
- stop (string or array)
- max_tokens (int): max output tokens

### POST /v1/completions
For non-chat GPT models (e.g., text-davinci-003).

Request:
\`\`\`json
{
  "model": "text-davinci-003",
  "prompt": "Write a poem about AI.",
  "max_tokens": 100
}
\`\`\`

### POST /v1/embeddings
Generate embedding vectors from text.

Request:
\`\`\`json
{
  "model": "text-embedding-ada-002",
  "input": "OpenAI makes powerful AI models."
}
\`\`\`

### POST /v1/audio/transcriptions
Transcribe audio to text using Whisper.

Form Data:
- file: audio file (mp3, wav, etc.)
- model: "whisper-1"
- Optional: language, prompt, temperature

### POST /v1/files
Upload files (e.g., for fine-tuning).

Form Data:
- purpose: e.g., "fine-tune"
- file: File object (JSONL format for fine-tune)

### GET /v1/models
List available models.

## 5. Streaming
For chat/completions and completions, set:
\`\`\`json
"stream": true
\`\`\`

Response will stream as text/event-stream with chunks like:
\`\`\`json
data: { "choices": [ { "delta": { "content": "Hello" } } ] }
\`\`\`

Stream ends with:
\`\`\`
data: [DONE]
\`\`\`

## 6. Supported Models (as of 2025)
| Model ID | Type | Context Size | Notes |
|----------|------|--------------|-------|
| gpt-4-1106-preview | chat | 128k | Fast GPT-4 turbo |
| gpt-4 | chat | 8k–32k | Legacy |
| gpt-3.5-turbo | chat | 16k | Cheap, fast |
| text-davinci-003 | prompt | 4k | Legacy completions |
| text-embedding-ada-002 | embeddings | — | Default for vector search |
| whisper-1 | audio | — | Speech recognition model |

## 7. Best Practices
- Use idempotency keys for retries when supported
- Apply exponential backoff on 429, 502, 503
- Batch embeddings for efficiency (e.g., 10–100 inputs)
- Avoid prompts that exceed context window:
  - GPT-4: ~128k tokens (depending on variant)
  - GPT-3.5: ~16k tokens max`;

const NOTION_DOCS = `# Notion API v1 – Internal Automation Reference

## 1. Authentication
- **Type**: Bearer token (Integration token)
- **Headers**:
Authorization: Bearer YOUR_NOTION_TOKEN
Notion-Version: 2022-06-28
Content-Type: application/json

- Token must be from an integration shared with the workspace and specific pages/databases.

## 2. Base URL
https://api.notion.com/v1

## 3. Pagination
- Use \`start_cursor\` and \`page_size\` (max: 100)
- Response includes:
  \`\`\`json
  {
    "object": "list",
    "has_more": true,
    "next_cursor": "string",
    "results": [ ... ]
  }
  \`\`\`

## 4. Core Endpoints

### POST /v1/databases/{database_id}/query
Purpose: Fetch pages from a Notion database

Body:
\`\`\`json
{
  "filter": {
    "property": "Created",
    "date": { "on_or_after": "2025-08-02" }
  },
  "sorts": [
    { "property": "Created", "direction": "descending" }
  ],
  "page_size": 50
}
\`\`\`

Response:
List of pages matching the query
Includes id, properties, etc.

### POST /v1/pages
Purpose: Create a new Notion page in a database

Body:
\`\`\`json
{
  "parent": { "database_id": "YOUR_DATABASE_ID" },
  "properties": {
    "Title": {
      "title": [
        {
          "text": { "content": "Daily Summary – August 2" }
        }
      ]
    }
  },
  "children": [
    {
      "object": "block",
      "type": "paragraph",
      "paragraph": {
        "rich_text": [
          {
            "type": "text",
            "text": {
              "content": "Summary of today's tasks goes here..."
            }
          }
        ]
      }
    }
  ]
}
\`\`\`

### GET /v1/pages/{page_id}
Purpose: Retrieve a page and its properties

### PATCH /v1/pages/{page_id}
Purpose: Update a page's properties

Body Example:
\`\`\`json
{
  "properties": {
    "Status": {
      "select": { "name": "Completed" }
    }
  }
}
\`\`\`

## 5. Common Property Types
title: wrapped in { title: [ { text: { content: "..." } } ] }

rich_text: for paragraphs, notes, summaries

select / multi_select: must match configured options

date: ISO 8601 string ("2025-08-02")

checkbox: true/false

## 6. Error Handling
Error Format:
\`\`\`json
{
  "object": "error",
  "status": "unauthorized" | "validation_error" | "rate_limited",
  "code": "string",
  "message": "Detailed error message"
}
\`\`\`

401 Unauthorized: bad token

403 Forbidden: integration not shared with page

404 Not Found: wrong database_id or page_id

429: Rate limited → wait and retry

## 7. Limits
Max 100 blocks per children array

Max 2000 characters per text object

Max 500 properties per database

Max 100 items per multi-select or relation field

## 8. Tips for Agents
Always validate Notion database_id is shared with your integration

Title properties must be filled when creating new pages

Use children to insert text blocks, bullet lists, headings, etc.

Page properties must match the database schema exactly (e.g., no unlisted select values)`;

async function ingestApiDocs() {
  try {
    console.log('🚀 Starting API docs ingestion...');
    
    // Ingest Airtable docs
    console.log('📄 Ingesting Airtable docs...');
    await prisma.$executeRaw`
      INSERT INTO api_docs (id, provider, version, raw_md, source_url, created_at, updated_at)
      VALUES (gen_random_uuid(), 'airtable', 'v0', ${AIRTABLE_DOCS}, 'https://airtable.com/developers/web/api', NOW(), NOW())
      ON CONFLICT (provider, version) DO UPDATE SET
        raw_md = EXCLUDED.raw_md,
        updated_at = NOW()
    `;
    
    // Ingest Stripe docs
    console.log('📄 Ingesting Stripe docs...');
    await prisma.$executeRaw`
      INSERT INTO api_docs (id, provider, version, raw_md, source_url, created_at, updated_at)
      VALUES (gen_random_uuid(), 'stripe', 'v1', ${STRIPE_DOCS}, 'https://stripe.com/docs/api', NOW(), NOW())
      ON CONFLICT (provider, version) DO UPDATE SET
        raw_md = EXCLUDED.raw_md,
        updated_at = NOW()
    `;

    // Ingest OpenAI docs
    console.log('📄 Ingesting OpenAI docs...');
    await prisma.$executeRaw`
      INSERT INTO api_docs (id, provider, version, raw_md, source_url, created_at, updated_at)
      VALUES (gen_random_uuid(), 'openai', 'v1', ${OPENAI_DOCS}, 'https://platform.openai.com/docs/api-reference', NOW(), NOW())
      ON CONFLICT (provider, version) DO UPDATE SET
        raw_md = EXCLUDED.raw_md,
        updated_at = NOW()
    `;

    // Ingest Notion docs
    console.log('📄 Ingesting Notion docs...');
    await prisma.$executeRaw`
      INSERT INTO api_docs (id, provider, version, raw_md, source_url, created_at, updated_at)
      VALUES (gen_random_uuid(), 'notion', 'v1', ${NOTION_DOCS}, 'https://developers.notion.com/reference', NOW(), NOW())
      ON CONFLICT (provider, version) DO UPDATE SET
        raw_md = EXCLUDED.raw_md,
        updated_at = NOW()
    `;
    
    console.log('✅ Successfully ingested API docs');
    
    // Check what's in the database
    const docs = await prisma.$queryRaw`SELECT provider, version FROM api_docs`;
    console.log('📊 Available docs:', docs);
    
  } catch (error) {
    console.error('❌ Error ingesting API docs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

ingestApiDocs(); 