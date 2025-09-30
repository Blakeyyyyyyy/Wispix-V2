import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables from .env file
const envContent = readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

console.log('Environment check:');
console.log('VITE_SUPABASE_URL:', supabaseUrl ? 'SET' : 'NOT SET');
console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'SET' : 'NOT SET');

const supabase = createClient(supabaseUrl, supabaseKey);

async function investigateBackgroundAutomations() {
  try {
    console.log('🔍 Investigating background automations...');
    
    // 1. Check all automation threads and their status
    const { data: threads, error: threadsError } = await supabase
      .from('automation_threads')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (threadsError) {
      console.error('Error fetching threads:', threadsError);
      throw new Error('Failed to fetch threads');
    }
    
    console.log(`📊 Found ${threads.length} automation threads:`);
    threads.forEach(thread => {
      console.log(`  - ${thread.automation_id}: "${thread.name}" (enabled: ${thread.enabled})`);
    });
    
    // 2. Check all active executions (pending, running, scheduled)
    const { data: activeExecutions, error: executionsError } = await supabase
      .from('flow_executions')
      .select('*')
      .in('status', ['pending', 'running', 'scheduled'])
      .order('created_at', { ascending: false });
    
    if (executionsError) {
      console.error('Error fetching executions:', executionsError);
      throw new Error('Failed to fetch executions');
    }
    
    console.log(`\n🔄 Found ${activeExecutions.length} active executions:`);
    activeExecutions.forEach(execution => {
      const thread = threads.find(t => t.automation_id === execution.automation_id);
      console.log(`  - ${execution.execution_id}: ${thread?.name || 'Unknown'} (${execution.status})`);
      console.log(`    Created: ${new Date(execution.created_at).toLocaleString()}`);
      if (execution.scheduled_for) {
        console.log(`    Scheduled for: ${new Date(execution.scheduled_for).toLocaleString()}`);
      }
      if (execution.next_scheduled_run) {
        console.log(`    Next run: ${new Date(execution.next_scheduled_run).toLocaleString()}`);
      }
    });
    
    // 3. Check for executions that might be stuck in running state
    const { data: runningExecutions, error: runningError } = await supabase
      .from('flow_executions')
      .select('*')
      .eq('status', 'running')
      .order('created_at', { ascending: false });
    
    if (runningError) {
      console.error('Error fetching running executions:', runningError);
      throw new Error('Failed to fetch running executions');
    }
    
    console.log(`\n⚠️ Found ${runningExecutions.length} executions stuck in 'running' state:`);
    runningExecutions.forEach(execution => {
      const thread = threads.find(t => t.automation_id === execution.automation_id);
      const timeSinceCreated = Date.now() - new Date(execution.created_at).getTime();
      const minutesAgo = Math.floor(timeSinceCreated / (1000 * 60));
      console.log(`  - ${execution.execution_id}: ${thread?.name || 'Unknown'} (${minutesAgo} minutes ago)`);
    });
    
    // 4. Check for executions with very old scheduled_for times
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: oldScheduledExecutions, error: oldError } = await supabase
      .from('flow_executions')
      .select('*')
      .eq('status', 'scheduled')
      .lt('scheduled_for', oneHourAgo);
    
    if (oldError) {
      console.error('Error fetching old scheduled executions:', oldError);
      throw new Error('Failed to fetch old scheduled executions');
    }
    
    console.log(`\n⏰ Found ${oldScheduledExecutions.length} old scheduled executions (older than 1 hour):`);
    oldScheduledExecutions.forEach(execution => {
      const thread = threads.find(t => t.automation_id === execution.automation_id);
      const scheduledTime = new Date(execution.scheduled_for);
      const timeDiff = Date.now() - scheduledTime.getTime();
      const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));
      console.log(`  - ${execution.execution_id}: ${thread?.name || 'Unknown'} (${hoursAgo} hours ago)`);
    });
    
    // 5. Check automation schedules
    const { data: schedules, error: schedulesError } = await supabase
      .from('automation_schedules')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (schedulesError) {
      console.error('Error fetching schedules:', schedulesError);
      throw new Error('Failed to fetch schedules');
    }
    
    console.log(`\n📅 Found ${schedules.length} automation schedules:`);
    schedules.forEach(schedule => {
      const thread = threads.find(t => t.automation_id === schedule.automation_id);
      console.log(`  - ${schedule.automation_id}: ${thread?.name || 'Unknown'} (enabled: ${schedule.enabled})`);
      console.log(`    Frequency: ${schedule.frequency} (interval: ${schedule.interval})`);
      if (schedule.next_scheduled_run) {
        console.log(`    Next run: ${new Date(schedule.next_scheduled_run).toLocaleString()}`);
      }
      if (schedule.scheduled_for) {
        console.log(`    Scheduled for: ${new Date(schedule.scheduled_for).toLocaleString()}`);
      }
    });
    
    // 6. Summary and recommendations
    console.log('\n📋 SUMMARY:');
    console.log(`- Total threads: ${threads.length}`);
    console.log(`- Enabled threads: ${threads.filter(t => t.enabled).length}`);
    console.log(`- Active executions: ${activeExecutions.length}`);
    console.log(`- Running executions: ${runningExecutions.length}`);
    console.log(`- Old scheduled executions: ${oldScheduledExecutions.length}`);
    console.log(`- Total schedules: ${schedules.length}`);
    console.log(`- Enabled schedules: ${schedules.filter(s => s.enabled).length}`);
    
    const potentialIssues = [];
    if (runningExecutions.length > 0) {
      potentialIssues.push(`${runningExecutions.length} executions stuck in 'running' state`);
    }
    if (oldScheduledExecutions.length > 0) {
      potentialIssues.push(`${oldScheduledExecutions.length} old scheduled executions`);
    }
    
    if (potentialIssues.length > 0) {
      console.log('\n⚠️ POTENTIAL ISSUES:');
      potentialIssues.forEach(issue => console.log(`  - ${issue}`));
    } else {
      console.log('\n✅ No obvious issues found');
    }
    
    return {
      success: true,
      summary: {
        totalThreads: threads.length,
        enabledThreads: threads.filter(t => t.enabled).length,
        activeExecutions: activeExecutions.length,
        runningExecutions: runningExecutions.length,
        oldScheduledExecutions: oldScheduledExecutions.length,
        totalSchedules: schedules.length,
        enabledSchedules: schedules.filter(s => s.enabled).length
      },
      threads,
      activeExecutions,
      runningExecutions,
      oldScheduledExecutions,
      schedules,
      potentialIssues
    };
    
  } catch (error) {
    console.error('Error investigating background automations:', error);
    throw error;
  }
}

// Run the investigation
investigateBackgroundAutomations().then(result => {
  console.log('\n🎯 Investigation complete!');
}).catch(error => {
  console.error('❌ Investigation failed:', error);
  process.exit(1);
});