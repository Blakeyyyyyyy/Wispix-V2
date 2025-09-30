import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

export const maxDuration = 30; // 30 seconds max

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔄 Migrating execution_thread_id for existing executions...');

    // Find all executions without execution_thread_id
    const { data: executionsWithoutThreadId, error: fetchError } = await supabase
      .from('flow_executions')
      .select('id, automation_id, thread_id, created_at')
      .is('execution_thread_id', null)
      .order('created_at', 'asc');

    if (fetchError) {
      console.error('❌ Error fetching executions:', fetchError);
      return res.status(500).json({ 
        error: 'Failed to fetch executions',
        details: fetchError.message 
      });
    }

    if (!executionsWithoutThreadId || executionsWithoutThreadId.length === 0) {
      console.log('✅ No executions need migration');
      return res.status(200).json({
        success: true,
        message: 'No executions need migration',
        migrated_count: 0
      });
    }

    console.log(`📊 Found ${executionsWithoutThreadId.length} executions without execution_thread_id`);

    let migratedCount = 0;
    const errors = [];

    // Update each execution with a unique execution_thread_id
    for (const execution of executionsWithoutThreadId) {
      try {
        const executionThreadId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const { error: updateError } = await supabase
          .from('flow_executions')
          .update({ 
            execution_thread_id: executionThreadId
          })
          .eq('id', execution.id);

        if (updateError) {
          console.error(`❌ Failed to update execution ${execution.id}:`, updateError);
          errors.push({
            execution_id: execution.id,
            error: updateError.message
          });
        } else {
          console.log(`✅ Updated execution ${execution.id} with execution_thread_id: ${executionThreadId}`);
          migratedCount++;
        }
      } catch (error) {
        console.error(`❌ Error processing execution ${execution.id}:`, error);
        errors.push({
          execution_id: execution.id,
          error: error.message
        });
      }
    }

    console.log(`✅ Migration completed: ${migratedCount}/${executionsWithoutThreadId.length} executions migrated`);

    res.status(200).json({
      success: true,
      message: 'Execution thread ID migration completed',
      total_executions: executionsWithoutThreadId.length,
      migrated_count: migratedCount,
      error_count: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Migration error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}