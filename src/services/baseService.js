import { supabase } from '@/lib/customSupabaseClient.js';

export const getClinicId = async () => {
    console.log("[BaseService] getClinicId called");
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) console.error("[BaseService] getSession error:", error);

        if (!session) {
            console.warn("[BaseService] No session found");
            return null;
        }

        if (session.user?.user_metadata?.clinic_id) {
            console.log("[BaseService] Found clinic_id in metadata:", session.user.user_metadata.clinic_id);
            return session.user.user_metadata.clinic_id;
        }

        console.log("[BaseService] Fetching profile for clinic_id...");
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('clinic_id')
            .eq('id', session.user.id)
            .single();

        if (profileError) console.error("[BaseService] Profile fetch error:", profileError);

        if (profile?.clinic_id) return profile.clinic_id;

        // Fallback
        console.warn("[BaseService] Using hardcoded fallback clinic_id");
        return 'b82d5019-c04c-47f6-b9f9-673ca736815b';
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
