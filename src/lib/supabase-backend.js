import { createClient } from '@supabase/supabase-js';

// Use process.env for Node.js serverless functions
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
// Use service role key for backend operations to bypass RLS
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

// Use service role key if available, otherwise fall back to anon key
const supabaseKey = supabaseServiceKey || supabaseAnonKey;

console.log('🔧 Backend Supabase config:', {
  url: supabaseUrl ? 'Present' : 'Missing',
  serviceKey: supabaseServiceKey ? 'Present' : 'Missing',
  anonKey: supabaseAnonKey ? 'Present' : 'Missing',
  usingKey: supabaseServiceKey ? 'Service Role' : 'Anon',
  allEnvVars: Object.keys(process.env).filter(key => key.includes('SUPABASE'))
});

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables!');
  console.log('Available environment variables:', Object.keys(process.env).filter(key => key.includes('SUPABASE')));
  throw new Error('Supabase configuration is missing. Please check your environment variables.');
}

// Create Supabase client with service role key for backend operations
const supabase = createClient(supabaseUrl, supabaseKey);

export { supabase };