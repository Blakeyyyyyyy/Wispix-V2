// Export Supabase configuration for use in API endpoints
export const supabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
};

// Make it available globally for API endpoints
if (typeof window !== 'undefined') {
  (window as any).SUPABASE_CONFIG = supabaseConfig;
}