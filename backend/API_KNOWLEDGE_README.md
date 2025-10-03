# 🚀 API Knowledge System for Wispix MVP

## 📋 Overview

The API Knowledge System provides Wispix agents with comprehensive knowledge about supported API platforms, enabling them to make informed decisions about API integrations and generate proper API calls.

## 🏗️ Architecture

### Files Created:
1. **`backend/src/knowledge/api-specs.js`** - Centralized API specifications
2. **`backend/src/tools/api-knowledge.js`** - Main APIKnowledge class
3. **`backend/src/tools/api-knowledge-example.js`** - Integration examples

## 🎯 Supported Platforms

| Platform | Version | Authentication | Rate Limit | Coverage |
|----------|---------|----------------|------------|----------|
| **Airtable** | v0 | Bearer token | 5 req/sec/base | Database operations |
| **Gmail** | v1 | OAuth2 | 250 req/sec/user | Email automation |
| **Slack** | v1 | Bot token | 50 req/sec/workspace | Messaging |
| **Stripe** | v1 | Secret key | 100 read/write/sec | Payment processing |
| **OpenAI** | v1 | API key | Varies by tier | AI services |
| **Notion** | v1 | Integration token | 3 req/sec | Workspace management |

## 🔧 Core Methods

### 1. `getAPISpec(platform)`
Returns complete API specification for a platform.

```javascript
const apiKnowledge = new APIKnowledge();
const stripeSpec = apiKnowledge.getAPISpec('stripe');
console.log(stripeSpec.name); // "Stripe API v1"
console.log(stripeSpec.rateLimit); // "100 read/sec, 100 write/sec per account"
```

### 2. `generateAuthHeaders(platform, credentials)`
Generates ready-to-use authentication headers.

```javascript
const headers = apiKnowledge.generateAuthHeaders('stripe', {
  secretKey: 'sk_test_1234567890'
});
// Returns: { "Authorization": "Bearer sk_test_1234567890", "Content-Type": "..." }
```

### 3. `buildEndpoint(platform, operation, params)`
Constructs complete endpoint URLs with parameter substitution.

```javascript
const url = apiKnowledge.buildEndpoint('airtable', 'list', {
  baseId: 'app12345',
  tableName: 'Tasks'
});
// Returns: "https://api.airtable.com/v0/app12345/Tasks"
```

## 🚀 Integration with Wispix Agents

### Basic Usage

```javascript
const APIKnowledge = require('./src/tools/api-knowledge');

class MyWispixAgent {
  constructor() {
    this.apiKnowledge = new APIKnowledge();
  }
  
  async handleAPIRequest(platform, operation, credentials, params) {
    // Get API specification
    const spec = this.apiKnowledge.getAPISpec(platform);
    if (!spec) {
      throw new Error(`Platform '${platform}' not supported`);
    }
    
    // Generate headers
    const headers = this.apiKnowledge.generateAuthHeaders(platform, credentials);
    
    // Build endpoint
    const url = this.apiKnowledge.buildEndpoint(platform, operation, params);
    
    // Make API call with proper knowledge
    return {
      url,
      method: spec.endpoints[operation].method,
      headers,
      rateLimit: spec.rateLimit,
      features: spec.features
    };
  }
}
```

### Example: Stripe Customer Creation

```javascript
async createStripeCustomer() {
  const result = await this.handleAPIRequest('stripe', 'customers', {
    secretKey: process.env.STRIPE_SECRET_KEY
  }, {});
  
  console.log(`Making ${result.method} request to ${result.url}`);
  console.log(`Rate limit: ${result.rateLimit}`);
  console.log(`Features: ${result.features.join(', ')}`);
  
  // Now make the actual API call...
}
```

## 🔍 Platform-Specific Details

### Airtable API v0
- **Base URL**: `https://api.airtable.com`
- **Endpoints**: CRUD operations with `{baseId}` and `{tableName}` parameters
- **Features**: Pagination, filtering, rate limits (5 req/sec/base)
- **Coverage**: Complete reference for database operations

### Stripe API v1
- **Base URL**: `https://api.stripe.com/v1`
- **Endpoints**: Customers, charges, webhooks, subscriptions
- **Features**: Pagination, idempotency, error handling, webhook events
- **Coverage**: 9,034 characters of real documentation with automation examples

### OpenAI API v1
- **Base URL**: `https://api.openai.com/v1`
- **Endpoints**: Chat completions, embeddings, audio, models
- **Features**: Streaming, rate limits, model reference, token management
- **Coverage**: Complete API reference with best practices

### Notion API v1
- **Base URL**: `https://api.notion.com/v1`
- **Endpoints**: Pages, databases, queries, blocks
- **Features**: Property types, pagination, blocks, database queries
- **Coverage**: Complete automation reference

### Gmail API v1
- **Base URL**: `https://gmail.googleapis.com/gmail/v1/users/me`
- **Endpoints**: Send, list, get, modify, trash messages
- **Features**: OAuth2, real-time notifications, label management
- **Coverage**: Complete email automation reference

### Slack API v1
- **Base URL**: `https://slack.com/api`
- **Endpoints**: Post messages, list channels/users, ephemeral messages
- **Features**: Webhooks, real-time messaging, channel management
- **Coverage**: Complete messaging and collaboration reference

## 🛠️ Adding New Platforms

To add a new platform:

1. **Add to `api-specs.js`**:
```javascript
newPlatform: {
  name: "New Platform API v1",
  authentication: "Bearer token",
  baseUrl: "https://api.newplatform.com/v1",
  endpoints: {
    operation: { method: "POST", path: "/endpoint" }
  },
  features: ["Feature 1", "Feature 2"],
  coverage: "Description of coverage",
  rateLimit: "Rate limit description",
  headers: {
    "Authorization": "Bearer {token}",
    "Content-Type": "application/json"
  }
}
```

2. **Update credential handling** in `generateAuthHeaders()` if needed
3. **Test** with the example integration

## 🔐 Environment Variables

The system expects these environment variables for authentication:

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...

# Airtable
AIRTABLE_API_KEY=key...

# OpenAI
OPENAI_API_KEY=sk-...

# Notion
NOTION_INTEGRATION_TOKEN=secret_...

# Gmail
GMAIL_ACCESS_TOKEN=ya29...

# Slack
SLACK_BOT_TOKEN=xoxb-...
```

## 🧪 Testing

Test the system with:

```bash
cd backend
node src/tools/api-knowledge-example.js
```

## 🎉 Benefits for Wispix Agents

1. **Informed Decisions**: Agents know exactly what APIs are available and their capabilities
2. **Proper Authentication**: Automatic header generation with correct token placement
3. **Rate Limit Awareness**: Agents can respect platform-specific rate limits
4. **Feature Discovery**: Agents understand what operations each platform supports
5. **Error Prevention**: Built-in validation and parameter checking
6. **Consistent Integration**: Standardized approach across all platforms

## 🔮 Future Enhancements

- **Dynamic Rate Limiting**: Real-time rate limit tracking and enforcement
- **API Versioning**: Support for multiple API versions per platform
- **Webhook Management**: Automatic webhook endpoint creation and management
- **Error Handling**: Platform-specific error handling and retry logic
- **Analytics**: Track API usage patterns and performance metrics

---

**Created for Wispix MVP Agent System** 🚀
