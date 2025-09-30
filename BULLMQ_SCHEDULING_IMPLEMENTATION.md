# 🚀 BullMQ Scheduling Implementation - Wispix Platform

## 📋 **OVERVIEW**
Implement a robust scheduling system using BullMQ + Redis that integrates with the existing Wispix platform. The system will schedule automations and execute them by calling Agent 2 webhook step-by-step, working with the current FlowMapping.tsx component and existing database structure.

## 🎯 **OBJECTIVES**

### **1. BullMQ + Redis Setup**
- Set up BullMQ with Vercel KV (Redis)
- Create job queue for automation scheduling  
- Implement Vercel Edge Functions as workers
- Add job persistence and monitoring

### **2. Integration with Existing Platform**
- Work with current `automation_threads` and `flow_executions` tables
- Integrate with existing FlowMapping.tsx scheduling functionality
- Enhance existing scheduling popup with BullMQ backend
- Maintain compatibility with current Agent 1 & Agent 2 workflow

### **3. Agent 2 Execution Enhancement**
- Replace current scheduling with BullMQ reliability
- Call existing `/api/agent2` endpoint for each step
- Maintain current execution tracking in `flow_executions` table
- Work with existing project context and step structure

---

## 🏗️ **CURRENT PLATFORM CONTEXT**

### **Existing Architecture**
- **Frontend**: React 18 + TypeScript + Vite + Tailwind
- **Backend**: Vercel Serverless Functions
- **Database**: Supabase with existing schema
- **Current APIs**: `/api/agent1`, `/api/agent2`, `/api/execute-flow`
- **Agent 2 Webhook**: `https://novusautomations.net/webhook/a13a060a-62be-4ae8-a1f3-6503d23032bb`

### **Existing Database Schema**
```sql
-- Current tables to work with
automation_threads (id, user_id, automation_id, name, description, created_at, updated_at)
chat_messages (id, thread_id, user_id, content, sender, created_at)
flow_executions (id, thread_id, user_id, status, results, created_at, updated_at)
user_credentials (id, user_id, platform, credentials, created_at, updated_at)
```

### **Current Components**
- **Dashboard.tsx**: Main container with thread management
- **ChatInterface.tsx**: Agent 1 integration 
- **FlowMapping.tsx**: Current scheduling functionality (needs BullMQ integration)
- **ActivityLog.tsx**: Execution monitoring
- **CredentialsView.tsx**: Credential management

---

## 📦 **IMPLEMENTATION PLAN**

### **Phase 1: BullMQ Infrastructure**

#### **1.1 Dependencies**
```bash
# Add to existing package.json
npm install bullmq ioredis @vercel/kv cron-parser
```

#### **1.2 Vercel KV Setup**
```bash
# Add Vercel KV storage
vercel kv create wispix-redis
```

#### **1.3 Environment Variables**
```env
# Add to Vercel project settings
KV_REST_API_URL=your_vercel_kv_url
KV_REST_API_TOKEN=your_vercel_kv_token
KV_URL=your_redis_connection_string
```

### **Phase 2: Database Schema Extension**

#### **2.1 Add Scheduling Support**
```sql
-- Extend existing flow_executions table
ALTER TABLE flow_executions 
ADD COLUMN schedule_id UUID,
ADD COLUMN scheduled_for TIMESTAMPTZ,
ADD COLUMN cron_expression TEXT,
ADD COLUMN is_scheduled BOOLEAN DEFAULT false,
ADD COLUMN last_scheduled_run TIMESTAMPTZ,
ADD COLUMN next_scheduled_run TIMESTAMPTZ;

-- Create index for scheduled executions
CREATE INDEX idx_flow_executions_scheduled 
ON flow_executions(next_scheduled_run) 
WHERE is_scheduled = true AND status != 'completed';
```

#### **2.2 Add BullMQ Job Tracking**
```sql
-- Track BullMQ jobs
CREATE TABLE automation_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID REFERENCES flow_executions(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL, -- BullMQ job ID
  queue_name TEXT DEFAULT 'automation-scheduler',
  status TEXT DEFAULT 'waiting', -- waiting, active, completed, failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT
);
```

### **Phase 3: BullMQ Queue Setup**

#### **3.1 Queue Configuration**
```typescript
// lib/queue.ts
import { Queue, Worker } from 'bullmq';
import { createClient } from '@vercel/kv';

const redis = createClient({
  url: process.env.KV_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export const automationQueue = new Queue('automation-scheduler', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 20,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

// Job types
export interface AutomationJob {
  executionId: string;
  threadId: string;
  automationId: string;
  userId: string;
  steps: any[];
  projectContext: string;
  currentStep?: number;
}
```

#### **3.2 Worker Implementation**
```typescript
// api/workers/automation-worker.ts
import { Worker } from 'bullmq';
import { supabase } from '../../lib/supabase';

const worker = new Worker('automation-scheduler', async (job) => {
  const { executionId, threadId, automationId, userId, steps, projectContext } = job.data;
  
  try {
    // Update execution status
    await supabase
      .from('flow_executions')
      .update({ status: 'running' })
      .eq('id', executionId);

    // Execute each step via existing Agent 2 endpoint
    for (let i = 0; i < steps.length; i++) {
      const response = await fetch(`${process.env.VERCEL_URL}/api/agent2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: threadId,
          automation_id: automationId,
          user_id: userId,
          message: steps[i],
          project_context: projectContext,
          step_number: i + 1,
          total_steps: steps.length,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Step ${i + 1} failed: ${response.statusText}`);
      }
    }

    // Mark as completed
    await supabase
      .from('flow_executions')
      .update({ 
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', executionId);

    return { success: true };
  } catch (error) {
    // Mark as failed
    await supabase
      .from('flow_executions')
      .update({ 
        status: 'failed',
        results: { error: error.message }
      })
      .eq('id', executionId);
    
    throw error;
  }
}, {
  connection: redis,
  concurrency: 5,
});

export default worker;
```

### **Phase 4: API Endpoints**

#### **4.1 Schedule Creation API**
```typescript
// api/schedule-automation.ts
import { automationQueue } from '../lib/queue';
import { supabase } from '../lib/supabase';
import { cronParser } from 'cron-parser';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    threadId, 
    automationId, 
    userId, 
    cronExpression, 
    steps, 
    projectContext 
  } = req.body;

  try {
    // Create execution record
    const { data: execution } = await supabase
      .from('flow_executions')
      .insert({
        thread_id: threadId,
        user_id: userId,
        status: 'scheduled',
        cron_expression: cronExpression,
        is_scheduled: true,
        next_scheduled_run: cronParser.parseExpression(cronExpression).next().toDate()
      })
      .select()
      .single();

    // Add job to queue with cron schedule
    const job = await automationQueue.add(
      'execute-automation',
      {
        executionId: execution.id,
        threadId,
        automationId,
        userId,
        steps,
        projectContext
      },
      {
        repeat: {
          cron: cronExpression,
        },
        jobId: `automation-${execution.id}` // Unique job ID
      }
    );

    // Track job in database
    await supabase.from('automation_jobs').insert({
      execution_id: execution.id,
      job_id: job.id,
      status: 'waiting'
    });

    res.json({ 
      success: true, 
      executionId: execution.id,
      jobId: job.id 
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

#### **4.2 Schedule Management API**
```typescript
// api/manage-schedule.ts
import { automationQueue } from '../lib/queue';
import { supabase } from '../lib/supabase';

export default async function handler(req, res) {
  const { action, executionId, jobId } = req.body;

  try {
    switch (action) {
      case 'pause':
        await automationQueue.pause();
        await supabase
          .from('flow_executions')
          .update({ status: 'paused' })
          .eq('id', executionId);
        break;

      case 'resume':
        await automationQueue.resume();
        await supabase
          .from('flow_executions')
          .update({ status: 'scheduled' })
          .eq('id', executionId);
        break;

      case 'delete':
        await automationQueue.removeJob(jobId);
        await supabase
          .from('flow_executions')
          .update({ status: 'cancelled', is_scheduled: false })
          .eq('id', executionId);
        break;
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

### **Phase 5: Frontend Integration**

#### **5.1 Enhanced FlowMapping Component**
```typescript
// Update existing FlowMapping.tsx
import { automationQueue } from '../lib/queue';

const FlowMapping = ({ threadId, automationId, userId }) => {
  const [scheduledJobs, setScheduledJobs] = useState([]);
  
  const scheduleAutomation = async (cronExpression: string) => {
    try {
      const response = await fetch('/api/schedule-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId,
          automationId, 
          userId,
          cronExpression,
          steps: flowSteps,
          projectContext
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setScheduledJobs(prev => [...prev, result]);
        // Show success message
      }
    } catch (error) {
      console.error('Scheduling failed:', error);
    }
  };

  const manageSchedule = async (action: string, executionId: string, jobId: string) => {
    await fetch('/api/manage-schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, executionId, jobId })
    });
    
    // Refresh schedule list
    fetchScheduledJobs();
  };

  // Rest of existing FlowMapping logic...
};
```

#### **5.2 Scheduling Popup Enhancement**
```typescript
// Create/update scheduling popup component
const SchedulingPopup = ({ onSchedule, onClose }) => {
  const [scheduleType, setScheduleType] = useState('once');
  const [cronExpression, setCronExpression] = useState('');
  
  const handleSchedule = () => {
    let cron = cronExpression;
    
    if (scheduleType === 'daily') {
      cron = `0 ${hour} * * *`;
    } else if (scheduleType === 'weekly') {
      cron = `0 ${hour} * * ${dayOfWeek}`;
    }
    
    onSchedule(cron);
    onClose();
  };

  return (
    <div className="scheduling-popup">
      <h3>Schedule Automation</h3>
      
      <select value={scheduleType} onChange={(e) => setScheduleType(e.target.value)}>
        <option value="once">Run Once</option>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="custom">Custom Cron</option>
      </select>
      
      {scheduleType === 'custom' && (
        <input 
          type="text"
          placeholder="0 9 * * 1 (Every Monday at 9 AM)"
          value={cronExpression}
          onChange={(e) => setCronExpression(e.target.value)}
        />
      )}
      
      <div className="popup-actions">
        <button onClick={handleSchedule}>Schedule</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
};
```

### **Phase 6: Monitoring & Management**

#### **6.1 Job Status Dashboard**
```typescript
// Add to ActivityLog.tsx or create new component
const ScheduleMonitor = ({ userId }) => {
  const [jobs, setJobs] = useState([]);
  
  useEffect(() => {
    const fetchJobs = async () => {
      const { data } = await supabase
        .from('flow_executions')
        .select('*, automation_jobs(*)')
        .eq('user_id', userId)
        .eq('is_scheduled', true);
      
      setJobs(data);
    };
    
    fetchJobs();
    
    // Real-time subscription for job updates
    const subscription = supabase
      .channel('job-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'automation_jobs'
      }, fetchJobs)
      .subscribe();
      
    return () => subscription.unsubscribe();
  }, [userId]);

  return (
    <div className="schedule-monitor">
      <h3>Scheduled Automations</h3>
      {jobs.map(job => (
        <div key={job.id} className="job-item">
          <span>{job.cron_expression}</span>
          <span>{job.status}</span>
          <span>{job.next_scheduled_run}</span>
          <button onClick={() => manageJob('pause', job.id)}>Pause</button>
          <button onClick={() => manageJob('delete', job.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
};
```

---

## 🎯 **INTEGRATION POINTS**

### **1. Work with Existing APIs**
- Use current `/api/agent2` for step execution
- Maintain existing payload structure
- Preserve current error handling

### **2. Database Compatibility**
- Extend existing tables instead of creating new ones
- Maintain current foreign key relationships
- Preserve existing data structure

### **3. Component Integration**
- Enhance FlowMapping.tsx with BullMQ scheduling
- Keep existing UI/UX patterns
- Maintain current real-time subscriptions

### **4. Deployment**
- Use existing Vercel configuration
- Add environment variables for Redis
- Deploy workers as Vercel Edge Functions

---

## ✅ **SUCCESS CRITERIA**

1. **BullMQ Integration**: Redis queues working with Vercel
2. **Reliable Scheduling**: Cron expressions executing automations
3. **Step Execution**: Each automation step calls Agent 2 successfully
4. **UI Integration**: Scheduling popup works with FlowMapping
5. **Monitoring**: Real-time job status and management
6. **Data Persistence**: Scheduled jobs survive server restarts
7. **Error Handling**: Failed jobs retry and log errors properly

---

## 🚨 **IMPORTANT NOTES**

- Maintain compatibility with existing Agent 1 & Agent 2 workflow
- Use current database schema with minimal changes
- Preserve existing component functionality
- Work with current Vercel deployment setup
- Keep existing authentication and security patterns
- Maintain real-time updates via Supabase subscriptions

This implementation provides a production-ready scheduling system that integrates seamlessly with your existing Wispix platform while adding the reliability and scalability of BullMQ.