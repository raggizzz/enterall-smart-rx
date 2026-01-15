import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration - Direct values with env fallback
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://modmqstvraatkqgishaf.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG1xc3R2cmFhdGtxZ2lzaGFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MDU0MTIsImV4cCI6MjA4NDA4MTQxMn0.HPyy1ekQN77Aly2nViOdXXWQkNqOc9IlNbTdiWMCqi0';

// Create Supabase client
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;

