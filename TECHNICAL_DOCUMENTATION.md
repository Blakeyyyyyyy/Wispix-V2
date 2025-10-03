# Automation Platform - Complete Technical Documentation

## Overview
This is a comprehensive SaaS automation platform built with React, TypeScript, Tailwind CSS, and Supabase. The platform enables users to create, manage, and execute multi-step automations through a conversational interface with AI agents.

## Architecture

### Frontend Stack
- React 18 with TypeScript for type safety
- Vite as the build tool and development server
- Tailwind CSS for styling with custom utilities
- Lucide React for icons
- Supabase Client for database operations and real-time subscriptions

### Backend Stack
- Supabase as the primary database and authentication provider
- PostgreSQL database with Row Level Security (RLS)
- Real-time subscriptions for live updates
- External webhook integrations for AI agent communication
- Supabase Edge Functions for API endpoints

## Database Schema

### Core Tables

#### `automation_threads`
- **Purpose**: Primary entity representing an automation project
- **Fields**: `id`, `user_id`, `name`, `created_at`, `updated_at`
- **Security**: RLS enabled - Users can only access their own threads
- **Triggers**: Auto-update `updated_at` timestamp

#### `chat_messages`
- **Purpose**: Stores conversation between user and Agent 1
- **Fields**: `id`, `thread_id`, `user_id`, `content`, `sender_type`, `created_at`
- **Constraints**: `sender_type` ∈ {'user', 'agent1'}
- **Security**: RLS enabled - Users can only access messages from their threads
- **Features**: Real-time subscriptions enabled

#### `activity_logs`
- **Purpose**: Stores automation execution logs from Agent 2
- **Fields**: `id`, `thread_id`, `user_id`, `content`, `sender_type`, `created_at`
- **Constraints**: `sender_type` ∈ {'agent2', 'system'}
- **Security**: RLS enabled - Users can only access logs from their threads
- **Features**: Real-time subscriptions enabled

#### `user_credentials`
- **Purpose**: Stores user credentials for various services AND flow data
- **Fields**: `id`, `user_id`, `service_name`, `credentials`, `created_at`, `updated_at`
- **Storage Format**: JSONB field storing credential data (currently unencrypted)
- **Security**: RLS enabled - Users can only access their own credentials
- **Constraints**: Unique constraint on `user_id`, `service_name`
- **Special Usage**: Flow data stored with `service_name` pattern: `flow_{thread_id}`

#### `automation_flows` (Currently Unused)
- **Status**: Table exists in schema but not utilized in current implementation
- **Recommendation**: Consider removing or implementing proper usage

## Application Flow

### 1. Authentication
- Email/password authentication via Supabase Auth
- No email confirmation required
- Session management with automatic token refresh
- User isolation through RLS policies

### 2. Dashboard Interface
- **Card View**: Shows all user's automation threads as cards with delete functionality
- **Thread View**: Detailed interface for selected automation
- **Tab Navigation**: Chat, Flow, Activity tabs for each thread
- **Real-time Updates**: Live updates across all interfaces
- **Profile Management**: Dropdown menu with user settings and logout

### 3. Chat Interface (Agent 1 Communication)
- ChatGPT-style conversation interface with typing indicators
- User Messages: Stored in `chat_messages` table
- **Agent 1 Integration**:
  - Webhook URL: `https://novusautomations.net/webhook/f49d3bf6-9601-4c30-8921-abe3fba7d661`
  - POST requests with `thread_id`, `user_id`, `message`, `timestamp`
  - Handles JSON and text responses
  - Parses special response formats for flow updates and credential requests

### 4. Flow Mapping Interface
- Visual representation of automation steps with drag-to-reorder
- **Step Management**: Add, delete, reorder steps with visual feedback
- **Storage**: Uses `user_credentials` table with `service_name`: `flow_{thread_id}`
- **Auto-save**: Saves changes automatically with debouncing
- **Execution**: Sends steps sequentially to Agent 2 with progress tracking

### 5. Activity Log Interface
- Real-time display of automation execution
- Shows messages from Agent 2 and system notifications
- Conversation-style layout with timestamps
- Live update indicators

### 6. Credential Management
- **Dynamic Forms**: Generated based on agent requests
- **Storage**: Stored in `user_credentials` table (currently unencrypted JSONB)
- **Field Types**: Support for various credential types (API keys, OAuth tokens, etc.)
- **Platform Support**: Multi-platform credential management with field mapping

## Key Features

### Real-time Communication
- **Supabase Channels**: Real-time subscriptions for live updates
- **WebSocket Connections**: Automatic reconnection and error handling
- **Live Indicators**: Typing indicators and execution status
- **Targeted Subscriptions**: Thread-specific subscriptions for efficiency

### Webhook Integration
- **Dual Agent System**:
  - Agent 1: Conversation and planning
  - Agent 2: Automation execution
- **Error Handling**: Graceful degradation when agents are unavailable
- **Response Parsing**: Handles various response formats (JSON, text, HTML)

### Special Response Handling

#### Flow Updates
When Agent 1 responds with `FlowChange: true`:
```json
{
  "FlowChange": true,
  "Step1": "First automation step",
  "Step2": "Second automation step",
  "Output": "Flow has been updated"
}
```
- Automatically extracts steps and updates flow mapping
- Switches user to Flow tab
- Saves flow to database

#### Credential Requests
When Agent 1 responds with `RequestCredentials: true`:
```json
{
  "RequestCredentials": true,
  "Platform1": "Gmail",
  "CredentialName1": "Client ID",
  "Platform2": "Gmail", 
  "CredentialName2": "Client Secret",
  "Output": "Please provide your credentials"
}
```
- Dynamically generates credential input forms
- Maps credential names to appropriate field types
- Stores credentials after submission

### Automation Execution
- **Sequential Processing**: Steps executed one by one with delays
- **Agent 2 Integration**: Each step sent to Agent 2 webhook
- **Progress Tracking**: Real-time execution status with visual indicators
- **Error Recovery**: Continues execution even if individual steps fail
- **Logging**: Comprehensive execution logs in activity interface

## Component Architecture

### Main Components

#### `App.tsx`
- Root component with authentication routing
- Includes `WebhookHandler` for global webhook management
- Loading states and error boundaries

#### `Dashboard.tsx`
- Main interface with card/thread views
- Tab navigation and state management
- Profile menu with user management
- Thread deletion functionality

#### `ChatInterface.tsx`
- Conversation interface with Agent 1
- Message parsing and webhook communication
- Credential form integration
- Real-time message updates

#### `FlowMapping.tsx`
- Visual flow builder interface
- Step management with drag-and-drop
- Auto-save functionality
- Execution with progress tracking

#### `ActivityLog.tsx`
- Real-time activity display
- Agent 2 communication logs
- System notifications
- Live update indicators

#### `CredentialForm.tsx`
- Dynamic credential input forms
- Field type mapping and validation
- Secure credential storage
- Multi-platform support

### Utility Components

#### `AuthForm.tsx`
- Login/signup interface
- Error handling and validation
- Password strength requirements

#### `WebhookHandler.tsx`
- Global webhook message handling
- PostMessage API for cross-frame communication
- Credential request processing

## API Endpoints

### Supabase Edge Functions

#### `/functions/v1/request-credentials`
- **Method**: POST
- **Purpose**: Handle credential requests from Agent 1
- **Payload**: 
  ```json
  {
    "thread_id": "string",
    "platform": "string", 
    "requested_credentials": ["string"],
    "credential_name": "string",
    "user_id": "string" (optional)
  }
  ```
- **Response**: Success/error with credential request ID

### Static API Endpoints

#### `/api/request-credentials/`
- **Method**: GET/POST (simulated)
- **Purpose**: Alternative credential request handler
- **Implementation**: Static HTML with JavaScript

## Environment Configuration

### Required Environment Variables
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Vite Configuration
- React plugin enabled
- Lucide React optimization
- Development server on port 5173

## Security Features

### Row Level Security (RLS)
- All tables have RLS enabled
- Users can only access their own data
- Automatic user ID filtering
- Policy-based access control

### Credential Storage
- **Current**: Credentials stored as JSONB (unencrypted)
- **Recommendation**: Implement encryption for production use
- Service-specific isolation
- Secure transmission over HTTPS

### Authentication
- Supabase Auth with email/password
- Session-based authentication
- Automatic token refresh
- No email confirmation required

## Error Handling

### Webhook Failures
- Graceful degradation when agents are unavailable
- User-friendly error messages
- **Note**: No automatic retry mechanisms currently implemented

### Database Errors
- Comprehensive error logging
- User notification system
- Automatic reconnection for real-time subscriptions

### Network Issues
- Timeout handling for long-running requests
- Connection status indicators
- **Note**: Offline state management not fully implemented

## Styling and UX

### Design System
- Dark theme with cyan accent colors
- Consistent spacing using 8px grid system
- Hover states and micro-interactions
- Responsive design for desktop/tablet

### Custom CSS Classes
- `.shadow-glow`: Cyan glow effect for active elements
- `.shadow-card`: Standard card shadow
- `.shadow-card-hover`: Enhanced hover shadow
- `.animate-pulse-slow`: Slow pulse animation for loading states

## Development Workflow

### Local Development
```bash
npm run dev      # Start development server
npm run build    # Build for production  
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Database Management
- Supabase dashboard for schema management
- Real-time subscription monitoring
- RLS policy testing
- Migration management

## Integration Points

### External Webhooks
- **Agent 1**: `https://novusautomations.net/webhook/f49d3bf6-9601-4c30-8921-abe3fba7d661`
- **Agent 2**: `https://novusautomations.net/webhook/a13a060a-62be-4ae8-a1f3-6503d23032bb`

### API Endpoints
- Supabase REST API for database operations
- Supabase Auth API for user management
- Real-time WebSocket connections
- Custom Edge Functions for specialized operations

## Performance Considerations

### Optimization Strategies
- Component-level state management
- Efficient re-rendering with proper dependencies
- Lazy loading for large datasets
- Debounced auto-save functionality

### Real-time Efficiency
- Targeted subscriptions to specific threads
- Automatic cleanup of subscriptions
- Minimal payload sizes for real-time updates
- Connection pooling and management

## Known Limitations & Future Improvements

### Current Limitations
1. **Credential Encryption**: Credentials stored unencrypted (JSONB)
2. **Retry Mechanisms**: No automatic retry for failed webhook calls
3. **Offline Support**: Limited offline functionality
4. **Mobile Responsiveness**: Optimized for desktop/tablet only

### Recommended Improvements
1. Implement proper credential encryption
2. Add automatic retry mechanisms with exponential backoff
3. Utilize the existing `automation_flows` table or remove it
4. Add comprehensive error monitoring and alerting
5. Implement mobile-responsive design
6. Add automation templates and sharing features

## Conclusion

This platform provides a complete automation workflow from conversation to execution, with robust error handling, security, and real-time capabilities. The architecture supports scalability and maintainability while providing an intuitive user experience. The documentation should be updated regularly to reflect implementation changes and improvements.