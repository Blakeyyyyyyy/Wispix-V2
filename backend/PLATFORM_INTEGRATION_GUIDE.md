# 🚀 Platform Integration Guide

## **Current State → Live Automations**

### **Phase 4: Platform Integration**

We now have a working automation engine that can:
- ✅ Generate automations via Claude AI
- ✅ Save automations to database
- ✅ Execute automations with HTTP requests and delays
- ✅ Track execution status and logs

### **Next Step: Connect to Real Platforms**

## **🎯 Target Platforms (Start Simple)**

### **1. Airtable Integration**
**Why Airtable?** Easy API, great for testing, visual results

**Setup:**
```bash
# Get Airtable API key from https://airtable.com/account
AIRTABLE_API_KEY=your_api_key
AIRTABLE_BASE_ID=your_base_id
```

**Example Automation:**
```json
{
  "name": "Update Airtable Every 5 Minutes",
  "steps": [
    {
      "id": "airtable-update",
      "name": "Update Airtable Record",
      "type": "http_request",
      "config": {
        "method": "PATCH",
        "url": "https://api.airtable.com/v0/{{variables.base_id}}/{{variables.table_name}}/{{variables.record_id}}",
        "headers": {
          "Authorization": "Bearer {{variables.api_key}}",
          "Content-Type": "application/json"
        },
        "body": {
          "fields": {
            "Last Updated": "{{variables.current_time}}",
            "Status": "Active"
          }
        }
      }
    },
    {
      "id": "wait-5-minutes",
      "name": "Wait 5 Minutes",
      "type": "delay",
      "config": {
        "duration": 5,
        "unit": "minutes"
      }
    }
  ]
}
```

### **2. Slack Integration**
**Why Slack?** Great for notifications, easy to test

**Setup:**
```bash
# Create Slack app at https://api.slack.com/apps
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_CHANNEL_ID=C1234567890
```

**Example Automation:**
```json
{
  "name": "Send Slack Message Every Hour",
  "steps": [
    {
      "id": "slack-message",
      "name": "Send Slack Message",
      "type": "http_request",
      "config": {
        "method": "POST",
        "url": "https://slack.com/api/chat.postMessage",
        "headers": {
          "Authorization": "Bearer {{variables.slack_token}}",
          "Content-Type": "application/json"
        },
        "body": {
          "channel": "{{variables.channel_id}}",
          "text": "🕐 Hourly update: {{variables.message}}",
          "blocks": [
            {
              "type": "section",
              "text": {
                "type": "mrkdwn",
                "text": "🕐 *Hourly Update*\n{{variables.message}}"
              }
            }
          ]
        }
      }
    },
    {
      "id": "wait-1-hour",
      "name": "Wait 1 Hour",
      "type": "delay",
      "config": {
        "duration": 1,
        "unit": "hours"
      }
    }
  ]
}
```

## **🔧 Implementation Steps**

### **Step 1: Add Platform Variables**
Update the automation generation to include platform-specific variables:

```typescript
// In claudeService.ts
const platformPrompts = {
  airtable: `
    Available variables:
    - {{variables.api_key}}: Airtable API key
    - {{variables.base_id}}: Airtable base ID
    - {{variables.table_name}}: Table name
    - {{variables.record_id}}: Record ID to update
    - {{variables.current_time}}: Current timestamp
  `,
  slack: `
    Available variables:
    - {{variables.slack_token}}: Slack bot token
    - {{variables.channel_id}}: Channel ID
    - {{variables.message}}: Message to send
  `
};
```

### **Step 2: Create Platform Configuration UI**
Add a platform selection interface in the frontend:

```typescript
// In ChatInterface.tsx
const platformConfigs = {
  airtable: {
    name: 'Airtable',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password' },
      { key: 'base_id', label: 'Base ID', type: 'text' },
      { key: 'table_name', label: 'Table Name', type: 'text' }
    ]
  },
  slack: {
    name: 'Slack',
    fields: [
      { key: 'slack_token', label: 'Bot Token', type: 'password' },
      { key: 'channel_id', label: 'Channel ID', type: 'text' }
    ]
  }
};
```

### **Step 3: Add Scheduled Execution**
Implement cron-based scheduling:

```typescript
// In automationEngine.ts
import cron from 'node-cron';

export class ScheduledAutomationEngine {
  static scheduleAutomation(automationId: string, cronExpression: string) {
    cron.schedule(cronExpression, async () => {
      await executeAutomationAsync(automationId);
    });
  }
}
```

## **🎯 Quick Start: Airtable Integration**

### **1. Set up Airtable**
1. Go to https://airtable.com
2. Create a new base
3. Get your API key from https://airtable.com/account
4. Note your base ID from the URL

### **2. Test the Integration**
```bash
# Test Airtable connection
curl -X GET "https://api.airtable.com/v0/YOUR_BASE_ID/YOUR_TABLE_NAME" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### **3. Create Automation**
In the chat interface, type:
```
"Create an automation that updates a cell in Airtable every 5 minutes with the current timestamp"
```

### **4. Configure Variables**
The system will prompt for:
- Airtable API Key
- Base ID
- Table Name
- Record ID

### **5. Deploy and Monitor**
- Save the automation
- Click "Test Run" to verify
- Monitor execution logs
- Check Airtable for updates

## **🔍 Monitoring & Debugging**

### **Execution Logs**
```bash
# Check execution status
curl http://localhost:3000/api/executions/EXECUTION_ID

# Response:
{
  "success": true,
  "executionId": "exec_1234567890",
  "status": "completed",
  "logs": [
    "Execution started at 2025-07-17T12:00:00.000Z",
    "Step 1: HTTP request to Airtable successful",
    "Step 2: Delay completed (5 minutes)",
    "Execution completed successfully"
  ]
}
```

### **Platform-Specific Logs**
- **Airtable**: Check response status and body
- **Slack**: Verify message delivery
- **HTTP Errors**: Check API keys and permissions

## **🚀 Next Steps**

### **Phase 4.1: Platform Expansion**
1. **Google Sheets** - Similar to Airtable
2. **Discord** - Alternative to Slack
3. **Email** - SMTP integration
4. **Webhooks** - Generic HTTP endpoints

### **Phase 4.2: Advanced Features**
1. **Error Handling** - Retry logic, fallbacks
2. **Rate Limiting** - Respect API limits
3. **Authentication** - OAuth flows
4. **Templates** - Pre-built automations

### **Phase 4.3: Scheduling**
1. **Cron Expressions** - Complex scheduling
2. **Time Zones** - Global execution
3. **Dependencies** - Chain automations
4. **Conditions** - Conditional execution

## **🎉 Success Criteria**

✅ **Working automations** that actually update platforms  
✅ **Real-time monitoring** of execution status  
✅ **Error handling** and retry logic  
✅ **Platform-specific** variable management  
✅ **Scheduled execution** with cron jobs  

**Your automations will now actually run and update real platforms!** 🚀 