import { supabase } from '@/lib/customSupabaseClient';
import { getClinicId } from './baseService';

export const internalChatService = {
    // Fetch users for the clinic (potential chat partners)
    getClinicUsers: async () => {
        const clinicId = await getClinicId();
        if (!clinicId) return [];

        // Assuming profiles table serves as user list
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('clinic_id', clinicId);

        if (error) {
            console.error('Error fetching clinic users:', error);
            return [];
        }
        return data;
    },

    // Fetch messages between current user and another user
    getMessages: async (otherUserId) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('internal_messages')
            .select('*')
            .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching messages:', error);
            return [];
        }
        return data;
    },

    // Send a message
    sendMessage: async (receiverId, content) => {
        const clinicId = await getClinicId();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !clinicId) return { error: 'User or clinic not found' };

        const { data, error } = await supabase
            .from('internal_messages')
            .insert({
                clinic_id: clinicId,
                sender_id: user.id,
                receiver_id: receiverId,
                content: content
            })
            .select()
            .single();

        return { data, error };
    },

    // Mark messages as read from a specific sender
    markAsRead: async (senderId) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase
            .from('internal_messages')
            .update({ is_read: true })
            .eq('sender_id', senderId)
            .eq('receiver_id', user.id)
            .eq('is_read', false);
    },

    // Get total unread count for current user
    getUnreadCount: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return 0;

        const { count, error } = await supabase
            .from('internal_messages')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', user.id)
            .eq('is_read', false);

        return count || 0;
    },

    // Verify if there are unread messages per user (to show badges in list)
    getUnreadCountsByUser: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return {};

        const { data, error } = await supabase
            .from('internal_messages')
            .select('sender_id')
            .eq('receiver_id', user.id)
            .eq('is_read', false);

        if (error) return {};

        // Group by sender_id
        const counts = {};
        data.forEach(msg => {
            counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1;
        });

        return counts;
    }
};
