# Automation Platform - Bolt.new Build Prompt

Build a SaaS automation platform with the following specifications:

## Core Architecture

- React/Next.js frontend with Supabase backend
- Real-time chat interface similar to ChatGPT
- Visual flow mapping system for automation sequences
- Dual-agent system integration via webhooks

## User Interface Requirements

### 1. Main Dashboard

- List of automation threads (like ChatGPT conversations)
- "New Automation" button to start fresh thread
- Each thread shows automation name and last activity timestamp
- Clean, modern SaaS design with sidebar navigation

### 2. Chat Interface (Agent 1 Communication)

- ChatGPT-style interface for user interaction
- Send user messages via POST to: https://novusautomations.net/webhook/f49d3bf6-9601-4c30-8921-abe3fba7d661
- Include thread_id and user_id in every request
- Display Agent 1 responses in real-time
- Handle webhook responses to update chat

### 3. Flow Mapping Interface

- Vertical layout with text boxes connected by arrows
- Simple drag-to-reorder functionality
- "Add Step" and "Delete" buttons for each text box
- Clear visual flow direction (top to bottom)
- Save flow to Supabase automatically
- "Execute Automation" button to send sequence to Agent 2

### 4. Activity Log (Agent 2 Communication)

- Real-time display of Agent 2's responses
- Send automation steps via POST to: https://novusautomations.net/webhook/a13a060a-62be-4ae8-a1f3-6503d23032bb
- Include thread_id and user_id in every request
- Show activity log as conversation-style messages
- Timestamp each activity entry

## Technical Implementation

### API Endpoints

- POST /api/execute-automation - Endpoint for Agent 1 to send automation sequence to Agent 2
- POST /api/request-credentials - Endpoint for Agent 1 to trigger credential input form
- All agent responses handled via webhook response to original POST request

## Key Features

### Authentication & User Management

- Simple user registration/login
- Session management with Supabase Auth
- User-specific thread isolation

### Webhook Integration

- Handle incoming webhooks from both n8n agents
- Real-time updates using WebSockets or Server-Sent Events
- Error handling for failed webhook calls

### Credential Management

- Secure form for credential input
- Store encrypted in Supabase
- Link credentials to specific users
- Display credential form when Agent 1 requests it via webhook

### Real-time Updates

- Use Supabase real-time subscriptions
- Update chat interface instantly
- Update activity log in real-time
- Show typing indicators during agent processing

## Special Requirements

### Dynamic Credential Forms

- When Agent 1 sends POST request with credential requirements
- Dynamically generate form fields based on request payload
- Save to credentials table with user_id
- Continue conversation flow after credential submission

### Flow Execution

- Convert visual flow to sequential API calls
- Send each step to Agent 2 webhook with proper timing
- Handle responses and display in activity log
- Maintain thread_id and user_id consistency

### Error Handling

- Graceful webhook failure handling
- Retry mechanisms for failed API calls
- User-friendly error messages
- Activity log error reporting

## Design Requirements

- Clean, professional SaaS interface
- Responsive design for desktop/tablet
- Loading states for all async operations
- Success/error notifications
- Modern color scheme (suggest dark mode option)

## Implementation Notes

- Use TypeScript for type safety
- Implement proper error boundaries
- Add proper loading states
- Include basic analytics tracking
- Ensure all HTTP requests include thread_id and user_id
- Handle webhook timeouts gracefully

Build this as a production-ready SaaS platform with proper error handling, security considerations, and scalable architecture.