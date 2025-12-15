import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let _supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
	_supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
	
	if (import.meta.env.DEV) {

		console.warn('Supabase not configured: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing. Supabase client will not be created.');
	}
}

export const supabase: SupabaseClient | null = _supabase;
