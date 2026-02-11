import { supabase } from '@/lib/customSupabaseClient.js';

const GET_SESSION_TIMEOUT = 10000;

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

        // --- CHECK USER METADATA CACHE FIRST ---
        // This avoids a DB call to 'profiles' almost every time
        const cachedId = session.user?.user_metadata?.clinic_id || session.user?.app_metadata?.clinic_id;
        if (cachedId) return cachedId;

        // Fallback to profile check if not in metadata
        const { data: profile } = await supabase
            .from('profiles')
            .select('clinic_id')
            .eq('id', session.user.id)
            .single();

        if (profile?.clinic_id) {
            // Background sync so next time it's cached
            supabase.auth.updateUser({ data: { clinic_id: profile.clinic_id } }).catch(() => { });
            return profile.clinic_id;
        }

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
