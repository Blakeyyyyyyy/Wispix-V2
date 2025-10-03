# 🚀 WISPIX COMPLETE INFRASTRUCTURE OVERVIEW

## 📋 **EXECUTIVE SUMMARY**

This document provides a comprehensive overview of the entire Wispix infrastructure, including:
- **Core Backend Systems** (3-Agent Automation, User Agent Workers)
- **Email Management Infrastructure** (Render deployment, Gmail integration)
- **New AI Employee Builder Frontend** (Bolt/Lovable style interface)
- **Database & Infrastructure** (PostgreSQL, Redis, Railway deployment)
- **Development Workflow & Deployment**

---

## 🏗️ **SYSTEM ARCHITECTURE OVERVIEW**

### **High-Level Architecture**
```
┌─────────────────────────────────────────────────────────────────┐
│                        WISPIX ECOSYSTEM                        │
├─────────────────────────────────────────────────────────────────┤
│  Frontend Layer                                                │
│  ├── AI Employee Builder (React + Framer Motion)              │
│  ├── Task Manager Dashboard                                   │
│  └── Team Performance Interface                               │
├─────────────────────────────────────────────────────────────────┤
│  Backend Layer                                                 │
│  ├── 3-Agent Automation System                                │
│  ├── User Agent Workers (InboxManager, TaskManager, etc.)     │
│  ├── Email Processing Infrastructure                           │
│  └── API Gateway & Authentication                             │
├─────────────────────────────────────────────────────────────────┤
│  Infrastructure Layer                                          │
│  ├── Railway (Primary Backend)                                │
│  ├── Render (Email Manager)                                   │
│  ├── PostgreSQL + Prisma ORM                                  │
│  └── Redis + Bull Queue System                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 **CORE AGENTIC SYSTEMS**

### **1. 3-Agent Automation System**

#### **Purpose**
Natural language to automation conversion system that allows users to describe processes in plain English and automatically generates working automations.

#### **Architecture**
```
User Input → Requirements Agent → Builder Agent → Validator Agent → Working Automation
```

#### **Key Components**

**Requirements Agent** (`backend/src/agents/RequirementsAgent.ts`)
- Analyzes user input and extracts requirements
- Identifies business context and process steps
- Generates structured requirement specifications

**Builder Agent** (`backend/src/agents/BuilderAgent.ts`)
- Converts requirements into executable code
- Handles API integrations and service connections
- Generates automation workflows

**Validator Agent** (`backend/src/agents/ValidatorAgent.ts`)
- Tests generated automations
- Validates API connections and data flow
- Ensures error handling and reliability

#### **Orchestration**
- **AutomationOrchestrator** (`backend/src/services/AutomationOrchestrator.ts`)
- **Tool System** (`backend/src/services/llm.ts`)
- **Claude Sonnet 4** integration for AI reasoning

---

### **2. User Agent Workers**

#### **Purpose**
Specialized AI agents that handle specific business functions and operate autonomously.

#### **Available Workers**

**InboxManager** (`backend/src/userAgents/workers/InboxManager.ts`)
- **Function**: Email classification, lead detection, automated responses
- **Features**: 
  - AI-powered email classification using OpenAI GPT-4
  - Lead scoring (business_intent, urgency, relationship, spam_score)
  - Automatic label application (Auto/Lead, Auto/Internal, Auto/Subscription, Auto/Outreach, Auto/Noise)
  - Professional draft creation for leads
  - 5-minute processing intervals
- **Integration**: Gmail OAuth, OpenAI API
- **Deployment**: Render (growth-ai-email-1.onrender.com)

**TaskManager** (`backend/src/userAgents/workers/TaskManager.ts`)
- **Function**: Task automation and workflow management
- **Features**: Process automation, task delegation, progress tracking

**DailyBriefer** (`backend/src/userAgents/workers/DailyBriefer.ts`)
- **Function**: Automated daily reports and insights
- **Features**: Data aggregation, trend analysis, executive summaries

**CRMManager** (`backend/src/userAgents/workers/CRMManager.ts`)
- **Function**: Customer relationship management automation
- **Features**: Lead tracking, follow-up automation, customer insights

**DigestMailer** (`backend/src/userAgents/workers/DigestMailer.ts`)
- **Function**: Automated email digest creation
- **Features**: Content curation, personalized summaries, scheduled delivery

---

## 🌐 **FRONTEND INFRASTRUCTURE**

### **1. AI Employee Builder (NEW - Bolt/Lovable Style)**

#### **Purpose**
Create a magical AI Employee creation interface that feels like Bolt/Lovable, where users can describe what they need and watch their AI Employee being built in real-time.

#### **Technology Stack**
- **React 19** with TypeScript
- **Framer Motion** for animations
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Axios** for API calls

#### **Key Features**
- **Single Chat Interface**: One prominent input box (like Bolt's "What do you want to discuss?")
- **No Back-and-Forth**: AI analyzes initial message and creates plan directly
- **Animations Within Chat**: All building steps appear as chat messages with animations
- **Maximum 2 Clarifying Questions**: Efficient requirement gathering
- **Real-Time Building**: Watch AI Employee being created step-by-step

#### **User Flow**
```
1. User types requirement → "I need help managing my inbox"
2. AI analyzes and responds → "I'll analyze your requirements..."
3. Planning phase → ✓ Understanding your needs, ✓ Analyzing email patterns...
4. Building phase → [⚡] Initializing Email Manager core...
5. Completion → 🎉 Meet Emma, your dedicated Email Manager
```

#### **Component Architecture**
- **App.tsx**: Main orchestrator managing phases and message flow
- **ChatInterface.tsx**: Core chat interface with message rendering
- **Message Types**: User, AI, Planning Steps, Building Steps, Completion
- **Animations**: Typing indicators, staggered lists, smooth transitions

#### **Styling & Theme**
- **Dark theme** with blue/purple gradients
- **Professional design** matching Bolt/Lovable aesthetic
- **Responsive layout** for mobile/desktop
- **Smooth animations** and hover effects

---

### **2. Legacy Frontend Components**

**TaskManager Dashboard** (`components/TaskManagerDashboard.tsx`)
- Task visualization and management interface

**Team Performance** (`components/TeamPerformance.tsx`)
- Performance metrics and analytics display

**Chat Interface** (`components/ChatInterface.tsx`)
- General chat functionality for user interaction

---

## 🗄️ **DATABASE & INFRASTRUCTURE**

### **1. Database Architecture**

**Primary Database**: PostgreSQL
- **ORM**: Prisma
- **Schema**: `backend/prisma/schema.prisma`
- **Migrations**: `backend/prisma/migrations/`

**Key Tables**:
- `agent_spec_and_execution_step`: Tracks automation execution
- `execution_step`: Individual step details
- `user_agents`: Worker agent configurations
- `automations`: Stored automation definitions

### **2. Queue System**

**Redis + Bull Queue**
- **Purpose**: Background job processing
- **Use Cases**: Email processing, automation execution, scheduled tasks
- **Configuration**: `backend/railway-server.js`

### **3. Connection Management**

**Service Adapters** (`backend/src/adapters/`)
- **Gmail**: OAuth2 integration for email access
- **Airtable**: Data synchronization and management
- **Notion**: Document and knowledge base integration
- **Stripe**: Payment processing and subscription management

---

## 🚀 **DEPLOYMENT INFRASTRUCTURE**

### **1. Primary Backend (Railway)**

**Location**: `railway-server.js`
**Purpose**: Main Wispix backend with 3-Agent system
**Features**:
- Full automation orchestration
- User agent worker management
- Database operations
- API endpoints

**Environment Variables**:
```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
CLAUDE_API_KEY=...
OPENAI_API_KEY=...
```

### **2. Email Manager (Render)**

**Location**: `~/growth-ai-render/`
**Purpose**: Dedicated email processing service
**Features**:
- Gmail OAuth integration
- AI-powered email classification
- Lead detection and draft creation
- Automatic labeling system

**Environment Variables**:
```bash
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...
OPENAI_API_KEY=...
PORT=10000
```

**Deployment URL**: https://growth-ai-email-1.onrender.com

### **3. Frontend Deployment**

**Development**: Local React development server
**Production**: Build and serve static files
**Ports**: 3000-3008 (varies based on availability)

---

## 🔧 **DEVELOPMENT WORKFLOW**

### **1. Backend Development**

**Setup**:
```bash
cd backend
npm install
cp env.example .env
# Configure environment variables
npm run dev
```

**Key Commands**:
- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npx prisma migrate dev`: Database migrations
- `npx prisma studio`: Database browser

### **2. Frontend Development**

**Setup**:
```bash
cd frontend
npm install
npm start
```

**Key Commands**:
- `npm start`: Start development server
- `npm run build`: Build for production
- `npm test`: Run tests

### **3. Email Manager Development**

**Setup**:
```bash
cd ~/growth-ai-render
npm install
cp env.example .env
# Configure Gmail and OpenAI credentials
npm start
```

---

## 📊 **API ENDPOINTS & INTEGRATIONS**

### **1. Main Backend (Railway)**

**Automation Endpoints**:
- `POST /automation/create`: Create new automation
- `GET /automation/list`: List all automations
- `POST /automation/execute`: Execute automation

**User Agent Endpoints**:
- `POST /user-agents/start`: Start worker agent
- `GET /user-agents/status`: Check agent status
- `POST /user-agents/stop`: Stop worker agent

### **2. Email Manager (Render)**

**Core Endpoints**:
- `GET /`: Health check
- `POST /trigger`: Manual email processing
- `POST /test-draft`: Test draft creation

**Health Response**:
```json
{
  "status": "healthy",
  "message": "Growth AI Email Manager Running",
  "timestamp": "2025-08-20T01:38:06.212Z",
  "port": "10000",
  "env": "production"
}
```

---

## 🔐 **SECURITY & AUTHENTICATION**

### **1. Authentication System**

**JWT Tokens**: User authentication and session management
**OAuth2**: Gmail integration for email access
**API Keys**: OpenAI, Claude, and service integrations

### **2. Environment Management**

**Secret Storage**: Environment variables for sensitive data
**No Hardcoded Credentials**: All secrets stored in .env files
**Production Security**: Secure deployment practices

---

## 📈 **MONITORING & ANALYTICS**

### **1. Health Checks**

**Backend Health**: Railway deployment monitoring
**Email Manager Health**: Render health endpoint
**Database Health**: Connection status monitoring

### **2. Performance Metrics**

**Email Processing**: Emails processed, leads identified, processing time
**Automation Execution**: Success rates, execution time, error tracking
**System Performance**: Response times, resource usage

---

## 🚨 **TROUBLESHOOTING & DEBUGGING**

### **1. Common Issues**

**Port Conflicts**: Multiple services trying to use same port
**Solution**: Use different ports or kill conflicting processes

**Dependency Conflicts**: Package version mismatches
**Solution**: Use `--legacy-peer-deps` or update package versions

**Process Management**: Background processes restarting automatically
**Solution**: Check for process managers or auto-restart scripts

### **2. Debug Commands**

**Check Running Processes**:
```bash
ps aux | grep -E "(email-manager|react-scripts|npm)"
lsof -i :[PORT_NUMBER]
```

**Kill Processes**:
```bash
kill [PID]
pkill -f "process_name"
```

**Check Port Usage**:
```bash
lsof -i :3000
netstat -an | grep 3000
```

---

## 🔮 **FUTURE ROADMAP**

### **1. Short Term (1-2 months)**

**Frontend Enhancements**:
- Real-time status updates from deployed agents
- Customization settings for AI Employees
- Analytics dashboard for user engagement

**Backend Improvements**:
- Enhanced error handling and recovery
- Performance optimization for email processing
- Additional user agent worker types

### **2. Long Term (3-6 months)**

**Advanced Features**:
- Multi-tenant architecture
- Advanced automation templates
- Machine learning model improvements
- Integration marketplace

**Infrastructure Scaling**:
- Kubernetes deployment
- Load balancing and auto-scaling
- Multi-region deployment

---

## 📚 **GETTING STARTED FOR NEW TEAM MEMBERS**

### **1. Prerequisites**

**Required Software**:
- Node.js 18+ and npm
- PostgreSQL database
- Redis server
- Git

**Required Accounts**:
- OpenAI API key
- Claude API key
- Gmail OAuth credentials
- Railway account
- Render account

### **2. First Day Setup**

**1. Clone Repository**:
```bash
git clone [repository-url]
cd Wispix-INFRA
```

**2. Backend Setup**:
```bash
cd backend
npm install
cp env.example .env
# Configure environment variables
npx prisma migrate dev
npm run dev
```

**3. Frontend Setup**:
```bash
cd frontend
npm install
npm start
```

**4. Email Manager Setup**:
```bash
cd ~/growth-ai-render
npm install
cp env.example .env
# Configure Gmail and OpenAI credentials
npm start
```

### **3. Understanding the System**

**Start Here**:
1. Read this document completely
2. Explore the 3-Agent system in `backend/src/agents/`
3. Test the AI Employee Builder frontend
4. Review the email processing flow
5. Understand the database schema

**Key Files to Study**:
- `backend/src/agents/BaseAgent.ts`: Core agent architecture
- `backend/src/userAgents/workers/InboxManager.ts`: Email processing logic
- `frontend/src/App.tsx`: Frontend orchestration
- `backend/prisma/schema.prisma`: Database structure

---

## 📞 **SUPPORT & RESOURCES**

### **1. Documentation**

**API Documentation**: Available in `api_docs/` directory
**Component Documentation**: Inline code comments and TypeScript types
**Deployment Guides**: Platform-specific deployment instructions

### **2. Testing**

**Backend Tests**: `backend/__tests__/` directory
**Frontend Tests**: `frontend/src/App.test.tsx`
**Integration Tests**: End-to-end testing scripts

### **3. Monitoring**

**Logs**: Check terminal output and platform logs
**Health Endpoints**: Monitor system status
**Performance**: Track response times and resource usage

---

## 🎯 **KEY TAKEAWAYS**

### **What Makes This System Special**

1. **3-Agent Architecture**: Natural language to automation conversion
2. **User Agent Workers**: Autonomous business function automation
3. **AI Employee Builder**: Magical user experience for AI creation
4. **Multi-Platform Deployment**: Railway + Render + Local development
5. **Real-Time Processing**: Live email analysis and automation

### **Core Strengths**

- **Scalable Architecture**: Modular design for easy expansion
- **User Experience**: Intuitive interfaces for complex automation
- **AI Integration**: Multiple AI models for different use cases
- **Production Ready**: Robust error handling and monitoring
- **Developer Friendly**: Clear structure and comprehensive documentation

---

## 🔗 **QUICK REFERENCE LINKS**

- **Main Backend**: Railway deployment
- **Email Manager**: https://growth-ai-email-1.onrender.com
- **Frontend Dev**: http://localhost:3008 (AI Employee Builder)
- **Database**: Prisma Studio (local development)
- **Documentation**: This document + inline code comments

---

*This document is maintained by the Wispix development team. For questions or updates, please contact the team lead.*

