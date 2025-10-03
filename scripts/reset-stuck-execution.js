import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function resetStuckExecution() {
  console.log('🔄 Resetting stuck execution...');
  
  // Find the stuck execution
  const { data: executions, error } = await supabase
    .from('flow_executions')
    .select('*')
    .eq('id', 'a8001a9d-7496-41c9-85fc-3d23212e1ca2')
    .single();

  if (error) {
    console.error('❌ Error fetching execution:', error);
    return;
  }

  console.log('📋 Current execution state:', {
    id: executions.id,
    status: executions.status,
    current_step: executions.current_step,
    results: executions.results
  });

  // Reset the execution to start fresh
  const { error: updateError } = await supabase
    .from('flow_executions')
    .update({
      status: 'pending',
      current_step: 0,
      results: [],
      started_at: null,
      completed_at: null,
      error_message: null
    })
    .eq('id', 'a8001a9d-7496-41c9-85fc-3d23212e1ca2');

  if (updateError) {
    console.error('❌ Error resetting execution:', updateError);
    return;
  }

  console.log('✅ Execution reset successfully!');
}

resetStuckExecution().catch(console.error);
