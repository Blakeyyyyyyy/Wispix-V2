import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  try {
    console.log('🔍 Testing searchTools logic...');
    
    const platform = 'airtable';
    const action = 'delete_record';
    
    console.log('🔍 Searching for:', { platform, action });
    
    // Test the exact search logic from Agent 1
    const { data, error } = await supabase
      .from('tool_definitions')
      .select('*')
      .eq('platform', platform)
      .ilike('action', `%${action}%`);
    
    console.log('🔍 Search result:', { data, error });
    console.log('🔍 Found tools:', data?.length || 0);
    
    // Also test with different action variations
    const variations = ['delete', 'record', 'delete_record'];
    
    for (const variation of variations) {
      const { data: varData, error: varError } = await supabase
        .from('tool_definitions')
        .select('*')
        .eq('platform', platform)
        .ilike('action', `%${variation}%`);
      
      console.log(`🔍 Search "${variation}":`, { count: varData?.length || 0, error: varError?.message });
    }
    
    res.status(200).json({
      searchResult: { count: data?.length || 0, tools: data, error: error?.message },
      variations: variations.map(v => ({ variation: v }))
    });
    
  } catch (error) {
    console.error('❌ Search test error:', error);
    res.status(500).json({ error: error.message });
  }
}
