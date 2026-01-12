import { supabase } from '@/lib/customSupabaseClient';

export const sendManychatMessage = async (subscriberId, message) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-manychat-message', {
      body: JSON.stringify({
        subscriberId,
        message,
      }),
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error sending Manychat message:', error);
    throw error;
  }
};