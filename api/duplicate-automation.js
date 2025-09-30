import { supabase } from '../src/lib/supabase-backend.js';

export default async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sourceThreadId, userId } = req.body;

    if (!sourceThreadId || !userId) {
      return res.status(400).json({ error: 'Missing sourceThreadId or userId' });
    }

    console.log('🔄 Duplicating automation:', { sourceThreadId, userId });

    // 1. Get the source automation thread
    const { data: sourceThread, error: threadError } = await supabase
      .from('automation_threads')
      .select('*')
      .eq('id', sourceThreadId)
      .eq('user_id', userId)
      .single();

    if (threadError || !sourceThread) {
      console.error('❌ Source thread not found:', threadError);
      return res.status(404).json({ error: 'Source automation not found' });
    }

    // 2. Create new automation thread
    const newAutomationId = `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newThreadName = `${sourceThread.name} (Copy)`;

    const { data: newThread, error: createThreadError } = await supabase
      .from('automation_threads')
      .insert({
        user_id: userId,
        name: newThreadName,
        automation_id: newAutomationId,
        enabled: false // Always start disabled
      })
      .select()
      .single();

    if (createThreadError) {
      console.error('❌ Error creating new thread:', createThreadError);
      return res.status(500).json({ error: 'Failed to create new automation' });
    }

    console.log('✅ Created new thread:', newThread.id);

    // 3. Copy automation flow data
    const { data: sourceFlow, error: flowError } = await supabase
      .from('automation_flows')
      .select('*')
      .eq('thread_id', sourceThreadId)
      .single();

    if (flowError && flowError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Error fetching source flow:', flowError);
      return res.status(500).json({ error: 'Failed to fetch source flow data' });
    }

    if (sourceFlow) {
      const { error: copyFlowError } = await supabase
        .from('automation_flows')
        .insert({
          thread_id: newThread.id,
          user_id: userId,
          steps: sourceFlow.steps,
          project_context: sourceFlow.project_context
        });

      if (copyFlowError) {
        console.error('❌ Error copying flow data:', copyFlowError);
        return res.status(500).json({ error: 'Failed to copy flow data' });
      }

      console.log('✅ Copied flow data');
    }

    // 4. Copy schedule configuration (if exists)
    const { data: sourceSchedule, error: scheduleError } = await supabase
      .from('automation_schedules')
      .select('*')
      .eq('thread_id', sourceThreadId)
      .single();

    if (scheduleError && scheduleError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Error fetching source schedule:', scheduleError);
      return res.status(500).json({ error: 'Failed to fetch source schedule data' });
    }

    if (sourceSchedule) {
      const { error: copyScheduleError } = await supabase
        .from('automation_schedules')
        .insert({
          thread_id: newThread.id,
          user_id: userId,
          enabled: false, // Always start with schedule disabled
          frequency: sourceSchedule.frequency,
          interval_value: sourceSchedule.interval_value,
          start_time: sourceSchedule.start_time,
          end_time: sourceSchedule.end_time,
          days_of_week: sourceSchedule.days_of_week,
          cron_expression: sourceSchedule.cron_expression,
          scheduled_for: sourceSchedule.scheduled_for,
          has_time_range: sourceSchedule.has_time_range
        });

      if (copyScheduleError) {
        console.error('❌ Error copying schedule data:', copyScheduleError);
        return res.status(500).json({ error: 'Failed to copy schedule data' });
      }

      console.log('✅ Copied schedule configuration');
    }

    console.log('✅ Automation duplicated successfully');

    res.json({
      success: true,
      newThread: newThread,
      message: 'Automation duplicated successfully'
    });

  } catch (error) {
    console.error('❌ Duplicate automation error:', error);
    res.status(500).json({ 
      error: 'Failed to duplicate automation',
      details: error.message 
    });
  }
};