import { supabase } from '@/lib/customSupabaseClient.js';

export const getClinicId = async () => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return null;
        if (session.user?.user_metadata?.clinic_id) {
            return session.user.user_metadata.clinic_id;
        }
        const { data: profile } = await supabase
            .from('profiles')
            .select('clinic_id')
            .eq('id', session.user.id)
            .single();
        return profile?.clinic_id;
    } catch (error) {
        console.error("Error getting clinic ID:", error);
        return null;
    }
};

export const getUserId = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
};

export { supabase };
