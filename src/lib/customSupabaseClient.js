import { createClient } from '@supabase/supabase-js';

// Fallback to hardcoded keys if env strings are empty (Fail-safe for Production)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://edqvmybfluxgrdhjiujf.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkcXZteWJmbHV4Z3JkaGppdWpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NzMyOTUsImV4cCI6MjA3ODQ0OTI5NX0.UEBzp7q_6hHFXUIS4oFTTRBjpr2Wt1AYTHSvtcNMMeY';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export {
    customSupabaseClient,
    customSupabaseClient as supabase,
};
