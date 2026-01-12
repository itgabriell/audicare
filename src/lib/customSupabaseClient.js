import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://edqvmybfluxgrdhjiujf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkcXZteWJmbHV4Z3JkaGppdWpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NzMyOTUsImV4cCI6MjA3ODQ0OTI5NX0.UEBzp7q_6hHFXUIS4oFTTRBjpr2Wt1AYTHSvtcNMMeY';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
