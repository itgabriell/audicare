import { supabase } from '@/lib/customSupabaseClient.js';

const GET_SESSION_TIMEOUT = 5000;

const getSessionWithTimeout = async () => {
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Supabase getSession timeout")), GET_SESSION_TIMEOUT)
    );
    try {
        const { data: { session } } = await Promise.race([
            supabase.auth.getSession(),
            timeoutPromise
        ]);
        return session;
    } catch (error) {
        console.warn("[baseService] getSession failed or timed out:", error);
        return null;
    }
};

export const getClinicId = async () => {
    try {
        const session = await getSessionWithTimeout();
        if (!session) return 'b82d5019-c04c-47f6-b9f9-673ca736815b'; // Force fallback on fail

        if (session.user?.user_metadata?.clinic_id) {
            return session.user.user_metadata.clinic_id;
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('clinic_id')
            .eq('id', session.user.id)
            .single();

        if (profile?.clinic_id) return profile.clinic_id;

        return 'b82d5019-c04c-47f6-b9f9-673ca736815b';
    } catch (error) {
        return 'b82d5019-c04c-47f6-b9f9-673ca736815b';
    }
};

export const getUserId = async () => {
    const session = await getSessionWithTimeout();
    return session?.user?.id || null;
};

export { supabase };
