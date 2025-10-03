import { Queue, Worker, Job } from 'bullmq';
import { createClient } from '@vercel/kv';
import { supabase, FlowExecution, AutomationJob } from './supabase';

// Initialize Redis client for BullMQ
const redis = createClient({
  url: process.env.KV_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// Queue configuration
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
export interface AutomationJobData {
  executionId: string;
  threadId: string;
  automationId: string;
  userId: string;
  steps: any[];
  projectContext: string;
  currentStep?: number;
  isRecurring?: boolean;
}

// Job processing function
export async function processAutomationJob(job: Job<AutomationJobData>) {
  const { executionId, threadId, automationId, userId, steps, projectContext, isRecurring } = job.data;
  
  console.log(`🚀 Processing automation job ${job.id} for execution ${executionId}`);
  
  try {
    // Update execution status to running
    const { error: updateError } = await supabase
      .from('flow_executions')
      .update({ 
        status: 'running',
        started_at: new Date().toISOString()
      })
      .eq('id', executionId);

    if (updateError) {
      throw new Error(`Failed to update execution status: ${updateError.message}`);
    }

    // Update job status to active
    await updateJobStatus(executionId, 'active');

    const results = [];

    // Execute each step via Agent 2 webhook
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      
      try {
        console.log(`🚀 Executing step ${i + 1}/${steps.length}: ${step.content}`);
        
        // Update current step in database
        await supabase
          .from('flow_executions')
          .update({ current_step: i + 1 })
          .eq('id', executionId);

        // Call Agent 2 webhook
        const response = await fetch('https://novusautomations.net/webhook/a13a060a-62be-4ae8-a1f3-6503d23032bb', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            thread_id: threadId,
            automation_id: automationId,
            user_id: userId,
            message: step.content,
            project_context: projectContext,
            step_number: i + 1,
            total_steps: steps.length,
            timestamp: new Date().toISOString(),
          }),
        });

        let stepResult = {
          step_number: i + 1,
          content: step.content,
          success: false,
          response: '',
          timestamp: new Date().toISOString()
        };

        if (response.ok) {
          const responseText = await response.text();
          stepResult.success = true;
          stepResult.response = responseText;
          console.log(`✅ Step ${i + 1} completed successfully`);
        } else {
          const errorText = await response.text();
          stepResult.response = `Error: ${response.status} - ${errorText}`;
          console.error(`❌ Step ${i + 1} failed: ${response.status} - ${errorText}`);
        }

        results.push(stepResult);

        // Update results in database
        await supabase
          .from('flow_executions')
          .update({ results: [...results] })
          .eq('id', executionId);

        // Add a small delay between steps
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (stepError) {
        console.error(`❌ Step ${i + 1} error:`, stepError);
        
        const stepResult = {
          step_number: i + 1,
          content: step.content,
          success: false,
          response: `Error: ${stepError.message}`,
          timestamp: new Date().toISOString()
        };
        
        results.push(stepResult);
        
        // Update results in database
        await supabase
          .from('flow_executions')
          .update({ results: [...results] })
          .eq('id', executionId);
        
        // For now, continue with next step instead of failing entire job
        // In production, you might want to fail the entire job
        console.log(`⚠️ Continuing with next step after step ${i + 1} failure`);
      }
    }

    // Mark execution as completed
    const { error: completeError } = await supabase
      .from('flow_executions')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        results: results
      })
      .eq('id', executionId);

    if (completeError) {
      throw new Error(`Failed to mark execution as completed: ${completeError.message}`);
    }

    // Update job status to completed
    await updateJobStatus(executionId, 'completed');

    console.log(`✅ Automation job ${job.id} completed successfully`);
    return { success: true, results };

  } catch (error) {
    console.error(`❌ Automation job ${job.id} failed:`, error);
    
    // Mark execution as failed
    await supabase
      .from('flow_executions')
      .update({ 
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString()
      })
      .eq('id', executionId);

    // Update job status to failed
    await updateJobStatus(executionId, 'failed', error.message);
    
    throw error;
  }
}

// Helper function to update job status
async function updateJobStatus(executionId: string, status: string, errorMessage?: string) {
  try {
    const updateData: any = {
      status,
      processed_at: new Date().toISOString()
    };

    if (status === 'failed' && errorMessage) {
      updateData.failed_at = new Date().toISOString();
      updateData.error_message = errorMessage;
    }

    await supabase
      .from('automation_jobs')
      .update(updateData)
      .eq('execution_id', executionId);
  } catch (error) {
    console.error('Failed to update job status:', error);
  }
}

// Queue event handlers
automationQueue.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

automationQueue.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err);
});

automationQueue.on('stalled', (job) => {
  console.warn(`⚠️ Job ${job.id} stalled`);
});

// Export queue for use in API endpoints
export { redis };