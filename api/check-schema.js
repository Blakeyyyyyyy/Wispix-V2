import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  try {
    console.log('🔍 Checking execution_plans table schema...');
    
    // Try to query the analysis_context column
    const { data, error } = await supabase
      .from('execution_plans')
      .select('analysis_context')
      .limit(1);
    
    console.log('🔍 Schema check result:', { data, error });
    
    if (error) {
      console.log('❌ analysis_context column does not exist:', error.message);
      return res.status(200).json({
        hasAnalysisContext: false,
        error: error.message,
        suggestion: 'Need to run migration to add analysis_context column'
      });
    }
    
    return res.status(200).json({
      hasAnalysisContext: true,
      message: 'analysis_context column exists'
    });
    
  } catch (error) {
    console.error('❌ Schema check error:', error);
    res.status(500).json({ error: error.message });
  }
}
