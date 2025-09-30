require('dotenv').config();
const { ApiDocsSearch } = require('./dist/services/ApiDocsSearch');

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

async function ingestAirtableDocs() {
  try {
    console.log('🚀 Starting Airtable API docs ingestion...');
    
    const apiDocId = await ApiDocsSearch.ingestApiDocs(
      'airtable',
      'v0',
      AIRTABLE_DOCS,
      'https://airtable.com/developers/web/api'
    );
    
    console.log('✅ Successfully ingested Airtable API docs');
    console.log('📄 API Doc ID:', apiDocId);
    
    // Test retrieval
    const providers = await ApiDocsSearch.getProviders();
    console.log('📋 Available providers:', providers);
    
    const docs = await ApiDocsSearch.getDocs('airtable', 'create record');
    console.log('🔍 Retrieved chunks:', docs.length);
    
  } catch (error) {
    console.error('❌ Error ingesting Airtable docs:', error);
  }
}

ingestAirtableDocs(); 