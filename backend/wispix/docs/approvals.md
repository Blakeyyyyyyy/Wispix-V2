# Approval System Documentation

The approval system provides a safe, configurable workflow step that pauses execution until external human approval is granted via Airtable.

## Table of Contents
- [Required Airtable Schema](#required-airtable-schema)
- [Configuration Options](#configuration-options)
- [How the Poller Works](#how-the-poller-works)
- [Development Routes](#development-routes)
- [Usage Examples](#usage-examples)

## Required Airtable Schema

### Recommended Table: "Approvals"

| Field Name | Field Type | Required | Description |
|------------|------------|----------|-------------|
| `Status` | Single Select | ✅ | Options: `Pending`, `Approved`, `Rejected` |
| `ExecutionId` | Single Line Text | ✅ | Unique identifier for the workflow execution |
| `StepId` | Single Line Text | ✅ | Unique identifier for the approval step |
| `RequestedBy` | Single Line Text | ✅ | User ID who initiated the workflow |
| `Payload` | Long Text | ✅ | JSON string containing step context |
| `ExpiresAt` | Date/Time | ✅ | ISO string when approval expires |
| `RequestType` | Single Line Text | ❌ | Custom field for categorization |
| `Department` | Single Line Text | ❌ | Custom field for organization |
| `Priority` | Single Select | ❌ | Custom field: `Low`, `Medium`, `High` |

### Single Select Options for Status:
```
Pending (default)
Approved  
Rejected
```

### Example Base Setup:
1. Create new Airtable base or use existing
2. Create "Approvals" table with above schema
3. Set `Status` default value to "Pending"
4. Configure view filters to show pending approvals first
5. Generate Personal Access Token (PAT) with table write permissions

## Configuration Options

### ApprovalConfig Interface
```typescript
type ApprovalConfig = {
  provider: 'airtable';              // Only Airtable supported currently
  table: string;                     // Table name (e.g., "Approvals")
  authRef?: string;                  // Reference to stored credentials
  auth?: { pat: string; baseId?: string }; // Direct credentials
  baseId?: string;                   // Airtable base ID (optional if in creds)
  fields?: Record<string, any>;      // Extra columns to populate
  timeoutSec?: number;               // Expiration timeout (default: 3600)
  pollEverySec?: number;             // Polling frequency (default: 20)
};
```

### Default Values
- **Timeout**: 3600 seconds (1 hour)
- **Polling**: Every 20 seconds
- **Status**: "Pending" on creation
- **Execution ID**: Generated automatically
- **User ID**: From authentication context

### Authentication Priority
1. `authRef` → Stored credentials via CredentialsService
2. `auth` → Direct credentials in step config
3. Environment variables: `AIRTABLE_PAT`, `AIRTABLE_BASE_ID`

## How the Poller Works

### BullMQ Background Job
- **Frequency**: Repeatable job every 20 seconds (configurable)
- **Scope**: Scans for workflows in `waiting_approval` status
- **Environment**: Automatically skips in `NODE_ENV=test`

### Polling Process
1. **Discovery**: Find executions with pending approval steps
2. **Auth Resolution**: Resolve Airtable credentials for each approval
3. **Status Check**: Query Airtable record by ID via `getRecord` API
4. **Decision Logic**:
   - `Approved` → Mark step success, resume workflow
   - `Rejected` → Mark step failed, terminate workflow  
   - `Expired` → Mark step failed with timeout reason
   - `Missing` → Mark step failed (record deleted)
   - `Pending` → Continue waiting (check expiration)

### State Management
- **Approval Pointers**: Stored in Redis with execution/step keys
- **Result Storage**: Completion results cached for 1 hour
- **Cleanup**: Automatic removal of processed pointers
- **Durability**: Survives service restarts via Redis persistence

### Error Handling
- **Network Issues**: Retry with exponential backoff
- **Auth Failures**: Log error, skip until resolved
- **Missing Records**: Treat as rejected approval
- **Service Errors**: Continue processing other approvals

## Development Routes

### POST /api/dev/approvals/:recordId
Update approval status for testing (DEV only).

**Request Body:**
```json
{
  "status": "Approved" | "Rejected",
  "table": "Approvals",           // Optional, default: "Approvals"  
  "baseId": "appXXX",            // Optional if in auth
  "auth": {                      // Optional, uses env if missing
    "pat": "your-pat-token",
    "baseId": "appXXX"
  }
}
```

**Response:** `204 No Content` on success

### GET /api/dev/approvals/:recordId
Retrieve approval record status.

**Query Parameters:**
- `table`: Table name (default: "Approvals")
- `baseId`: Base ID (optional if in auth)
- `auth`: JSON string with credentials

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "recXXX",
    "fields": {
      "Status": "Pending",
      "ExecutionId": "exec_123",
      "RequestedBy": "user456"
    },
    "createdTime": "2025-01-01T12:00:00.000Z"
  }
}
```

### POST /api/dev/dry-run (Approval Action)
Create approval records for testing.

**Request Body:**
```json
{
  "provider": "airtable",
  "action": "approval",
  "params": {
    "table": "Approvals",
    "baseId": "appXXX",           // Optional if in auth
    "fields": {                   // Custom fields
      "RequestType": "Budget Approval",
      "Department": "Engineering"
    }
  },
  "auth": {                       // Or use authRef
    "pat": "your-pat-token",
    "baseId": "appXXX"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "ok": true,
    "recordId": "recXXX",
    "baseId": "appXXX",
    "table": "Approvals"
  }
}
```

## Usage Examples

### Basic Approval Step
```typescript
const approvalStep: AutomationStep = {
  id: 'manager-approval',
  name: 'Manager Approval Required',
  type: 'approval',
  config: {
    provider: 'airtable',
    table: 'Approvals',
    authRef: 'default',
    fields: {
      RequestType: 'Budget Approval',
      Department: 'Engineering',
      Priority: 'High'
    },
    timeoutSec: 7200  // 2 hours
  }
};
```

### Environment-Based Approval
```typescript
const approvalStep: AutomationStep = {
  id: 'env-approval',
  type: 'approval', 
  config: {
    provider: 'airtable',
    table: 'MyApprovals',
    baseId: 'appPROD123',  // Override env baseId
    timeoutSec: 1800,      // 30 minutes
    pollEverySec: 10       // Check every 10 seconds
  }
};
```

### Multi-Step Workflow
```typescript
const workflow: AutomationStep[] = [
  {
    id: 'approval-step',
    type: 'approval',
    config: {
      provider: 'airtable',
      table: 'Approvals',
      authRef: 'production',
      fields: { RequestType: 'Deploy Release' }
    }
  },
  {
    id: 'deploy-step', 
    type: 'adapter',
    config: {
      provider: 'github',
      action: 'createDeployment',
      // ... deploy config
    }
  }
];
```

## Best Practices

### Security
- ✅ Use `authRef` with stored credentials instead of inline `auth`
- ✅ Rotate Airtable PATs regularly
- ✅ Restrict PAT permissions to specific bases/tables
- ✅ Never log PAT tokens in application logs

### Performance  
- ✅ Set reasonable timeouts (avoid very long approvals)
- ✅ Use appropriate polling frequency (balance responsiveness vs API usage)
- ✅ Monitor approval completion rates and timeout frequency
- ✅ Clean up old approval records periodically

### User Experience
- ✅ Provide clear approval context in custom fields
- ✅ Set up Airtable views filtered by status and expiration
- ✅ Configure Airtable notifications for new approvals
- ✅ Include links to related resources in payload

### Monitoring
- ✅ Track approval response times and patterns
- ✅ Monitor poller job health and error rates  
- ✅ Alert on high timeout/rejection rates
- ✅ Log approval decisions for audit trails

## Troubleshooting

### Common Issues

**Approval Never Completes**
- Check poller is running (BullMQ dashboard)
- Verify Airtable record exists and is accessible
- Confirm PAT has read/write permissions
- Check approval hasn't expired

**Permission Errors**
- Verify PAT is valid and not expired
- Confirm PAT has access to specific base/table
- Check baseId is correct in configuration
- Ensure table name matches exactly (case-sensitive)

**Workflow Doesn't Resume**
- Verify approval record status is exactly "Approved"
- Check approval pointer exists in Redis
- Confirm poller detected the status change
- Review application logs for processing errors

**Records Not Created**
- Validate table schema matches requirements
- Check Airtable API rate limits
- Verify network connectivity to Airtable
- Confirm table name and baseId are correct
