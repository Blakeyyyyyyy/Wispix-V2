import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  try {
    // Get table info
    const { data: tableInfo, error: tableError } = await supabase
      .from('user_credentials')
      .select('*')
      .limit(1);

    // Get all records to see structure
    const { data: allRecords, error: allError } = await supabase
      .from('user_credentials')
      .select('*');

    res.status(200).json({
      tableInfo: tableInfo || [],
      allRecords: allRecords || [],
      errors: {
        table: tableError?.message,
        all: allError?.message
      },
      count: allRecords?.length || 0
    });
  } catch (error) {
    console.error('Error in test-user-credentials API:', error);
    res.status(500).json({ error: error.message });
  }
}
