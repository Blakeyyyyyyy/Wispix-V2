require('dotenv').config();
const { ApiDocsSearchDirect } = require('./dist/services/ApiDocsSearchDirect');

async function ingestSlackDocs() {
  console.log('🚀 Starting Slack API docs ingestion...');
  
  const slackMarkdown = `# Slack Web API – Comprehensive Internal Reference

Fully self‑contained specification for agent use. No external links.

---

## 1. Authentication & General Rules

- **Auth type**: OAuth 2.0 Bearer token (bot or user), never send token in query params.
- **Header example**:
Authorization: Bearer xoxb‑BOT‑TOKEN
Content-Type: application/json

- Use HTTPS, TLS 1.2+.  
- Write methods support \`application/json\`; GET/query or POST \`application/x-www-form-urlencoded\` for legacy.

---

## 2. Rate Limits & Retry Behavior

- Workspace‑wide rate tiers:
- chat.postMessage, chat.update, files.upload, reactions.add: ~1 request/sec per channel, workspace burst tolerated.
- Listing/pagination methods: up to ~50 RPS depending on tier.
- **If you get \`429 Too Many Requests\`**:  
- Response header \`Retry‑After\`: seconds to wait.
- Include response \`{ "ok": false, "error": "rate_limited" }\`.  
- Back‑off strategy: linear retry after \`Retry‑After\`, double back-off on repeated 429 within same minute.

---

## 3. Pagination Mechanics

- All list endpoints return:
\`\`\`json
{
  …,
  "response_metadata": { "next_cursor": "…" }
}
\`\`\`
Request with query param cursor=next_cursor plus limit=N to page.

limit: integer, max 1000; recommended ≤200. Responses may return fewer than limit – still valid. Use until next_cursor is empty.

## 4. OAuth Scopes (per method)

| Method | Required scope(s) |
|--------|------------------|
| chat.postMessage | chat:write [+ chat:write.customize to customize username/icon] |
| chat.update | chat:write (if editing own message); as_user=true requires legacy compatibility |
| conversations.list | conversations:read, plus channels:read, groups:read, im:read, mpim:read as needed |
| users.info | users:read |
| files.upload | files:write, files:read (for retrieval) |
| reactions.add | reactions:write |

Avoid legacy as_user usage unless token pre‑May 2025; Slack workspace apps ignore it (as_user_not_supported).

## 5. Block Kit Brief

Block Kit = JSON array of block objects. Example:

\`\`\`json
"blocks": [
  {
    "type": "section",
    "text": { "type": "mrkdwn", "text": "Hello *world*!" }
  },
  {
    "type": "image",
    "image_url": "https://…",
    "alt_text": "Example image"
  }
]
\`\`\`

Supported block types: section, divider, image, actions, context, etc.

Each block may include block_id (string), optional.

section.text must be { type:"mrkdwn" | "plain_text", text:string }.

## 6. Core Endpoints

### 6.1 chat.postMessage

**POST** /api/chat.postMessage

**Headers**: Authorization (Bearer), Content-Type: application/json

**Body parameters (JSON)**:

- channel (string, required) — e.g. "C12345".
- text (string, optional).
- blocks (array of block objects, optional).
- attachments (array, optional).
- thread_ts (string, optional) — thread timestamp.
- as_user (boolean, default false, legacy only).
- username, icon_url, icon_emoji (strings, optional, require chat:write.customize).

**Response success**:

\`\`\`json
{
  "ok": true,
  "channel": "C12345",
  "ts": "1651234567.000200",
  "message": { "text": "...", "blocks":[…], "user":"U123", "ts":"…" }
}
\`\`\`

**Errors**:

- 400 / channel_not_found: invalid channel.
- 401 / invalid_auth: token invalid.
- 403 / missing_scope: missing chat:write.
- 403 / missing_scope (if customizing) without chat:write.customize.
- 429 / rate_limited.

**Fix**: correct channel, ensure scopes, obey retry.

### 6.2 chat.update

**POST** /api/chat.update

**Headers**: same

**Body (JSON)**:

- channel (string, required)
- ts (string, required) — timestamp of message.
- text (string, optional) or blocks (array).
- attachments (array) to clear/replace.
- as_user (boolean, default false, legacy).

**Response**:

\`\`\`json
{
  "ok": true,
  "channel": "...",
  "ts": "...",
  "text": "...",
  "message": { "text": "...", "user": "...", "ts": "..." }
}
\`\`\`

**Errors**:

- cant_update_message: not your message or expired.
- as_user_not_supported.
- block_mismatch: blocks invalid.
- edit_window_closed.
- channel_not_found.

**Fix**: use correct ts/channel, check token type, validate block format.

### 6.3 conversations.list

**GET** /api/conversations.list

**Query parameters**:

- limit (integer, optional, default 100, max 1000).
- cursor (string, optional).
- types (string, optional): comma-separated public_channel,private_channel,mpim,im.
- exclude_archived (boolean as true/false, optional).
- team_id (string, optional for org‑install).

**Headers**: Authorization.

**Response**:

\`\`\`json
{
  "ok": true,
  "channels": [ { /* channel objects */ } ],
  "response_metadata": { "next_cursor": "…" }
}
\`\`\`

**Errors**:

- missing_scope: missing conversations or channel scope.
- rate_limited.

**Fix**: add correct scopes, page through until next_cursor empty.

### 6.4 users.info

**GET** /api/users.info

**Query parameters**:

- user (string, required) — user ID.

**Headers**: Authorization.

**Response**:

\`\`\`json
{
  "ok": true,
  "user": { "id": "U123", "name": "alice", /* profile fields */ }
}
\`\`\`

**Errors**:

- user_not_found
- missing_scope: needs users:read.
- rate_limited.

**Fix**: valid user ID, add scope.

### 6.5 files.upload

**POST** /api/files.upload

**Headers**: Authorization.

**Body**: multipart/form-data or JSON:

- channels (string, required when posting) — comma‑separated channel IDs.
- file (file binary, required)
- filename (string, optional)
- initial_comment (string, optional)
- thread_ts, title optional.

**Response**:

\`\`\`json
{
  "ok": true,
  "file": { "id":"F123", "name":"…", "url_private":"…", /* metadata */ }
}
\`\`\`

**Errors**:

- missing_scope: need files:write.
- file_too_large (max 1GB).
- rate_limited.

**Fix**: check permissions, file size, obey back‑off.

### 6.6 reactions.add

**POST** /api/reactions.add

**Headers**: Authorization, application/json or form.

**Body / Query params**:

- channel (string, required)
- name (string, required) — emoji name, without :
- timestamp (string, required) — message ts.

**Response**:

\`\`\`json
{ "ok": true }
\`\`\`

**Errors**:

- already_reacted
- channel_not_found / invalid_ts
- missing_scope: need reactions:write

**Fix**: validate fields, scopes.

## 7. Webhooks & Events API (Summary)

Use Events API, not legacy outgoing webhooks.

Subscribe via app config to events, choose Socket Mode or HTTP endpoint.

Slack sends JSON payloads: examples:

\`\`\`json
{
  "type":"event_callback",
  "event": { "type":"message","user":"U123","text":"Hi","ts":"...","channel":"C123" },
  "event_id":"E...",
  "authed_users":["U123"]
}
\`\`\`

Scopes required depend on event type: e.g. message.channels needs channels:history; for private use groups:history, DMs im:history, MPIM mpim:history.

Slack retries failed deliveries; your endpoint should respond HTTP 200 quickly to acknowledge.

## 8. Deprecated / Legacy Behaviors

as_user=true is legacy; new workspace apps must not use it—Slack returns as_user_not_supported.

Use *conversation. methods instead of old channels.list, im.list.

## 9. Retry & Best Practices

- Never include token in URL.
- Use exponential or linear retry on 429, obey Retry‑After.
- Validate cursor pagination until exhausted.
- For message editing, use chat.update only on own bot/user messages.
- For Block Kit, always validate JSON schema.
- Respect scopes and required OAuth permissions per method.`;

  try {
    // Ingest the Slack documentation
    const apiDocId = await ApiDocsSearchDirect.ingestApiDocs(
      'slack',
      'v1',
      slackMarkdown,
      'https://api.slack.com/web'
    );
    
    console.log('✅ Successfully ingested Slack API docs');
    console.log('📄 API Doc ID:', apiDocId);
    
    // Test retrieval
    const providers = await ApiDocsSearchDirect.getProviders();
    console.log('📋 Available providers:', providers);
    
    // Test search functionality
    const searchResults = await ApiDocsSearchDirect.getDocs('slack', 'post message');
    console.log('🔍 Retrieved chunks:', searchResults.length);
    
    if (searchResults.length > 0) {
      console.log('📋 First chunk preview:');
      console.log(searchResults[0].substring(0, 200) + '...');
    }
    
  } catch (error) {
    console.error('❌ Failed to ingest Slack docs:', error);
  }
}

ingestSlackDocs(); 