import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  try {
    console.log('🔍 Testing database structure...');
    
    // Check if tool_definitions table exists
    const { data: tools, error: toolsError } = await supabase
      .from('tool_definitions')
      .select('*')
      .limit(5);
    
    console.log('🔍 Tools query result:', { tools, toolsError });
    
    // Check if execution_plans table exists
    const { data: plans, error: plansError } = await supabase
      .from('execution_plans')
      .select('*')
      .limit(5);
    
    console.log('🔍 Plans query result:', { plans, plansError });
    
    // Check if thread_memory table exists
    const { data: memory, error: memoryError } = await supabase
      .from('thread_memory')
      .select('*')
      .limit(5);
    
    console.log('🔍 Memory query result:', { memory, memoryError });
    
    res.status(200).json({
      tools: { count: tools?.length || 0, error: toolsError?.message },
      plans: { count: plans?.length || 0, error: plansError?.message },
      memory: { count: memory?.length || 0, error: memoryError?.message }
    });
    
  } catch (error) {
    console.error('❌ Database test error:', error);
    res.status(500).json({ error: error.message });
  }
}
