import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  try {
    console.log('🔍 Checking tools in database...');
    
    // Get all tools
    const { data: tools, error: toolsError } = await supabase
      .from('tool_definitions')
      .select('id, platform, action, display_name, description')
      .order('platform', { ascending: true });
    
    console.log('🔍 All tools:', tools);
    console.log('🔍 Tools error:', toolsError);
    
    // Test search for airtable delete
    const { data: airtableTools, error: airtableError } = await supabase
      .from('tool_definitions')
      .select('*')
      .eq('platform', 'airtable')
      .ilike('action', '%delete%');
    
    console.log('🔍 Airtable delete tools:', airtableTools);
    console.log('🔍 Airtable error:', airtableError);
    
    res.status(200).json({
      allTools: tools,
      airtableDeleteTools: airtableTools,
      errors: {
        allTools: toolsError?.message,
        airtableDelete: airtableError?.message
      }
    });
    
  } catch (error) {
    console.error('❌ Database check error:', error);
    res.status(500).json({ error: error.message });
  }
}
