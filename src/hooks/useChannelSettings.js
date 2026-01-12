import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export const useChannelSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.profile?.clinic_id) {
      setLoading(false);
      return;
    }

    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('clinics')
          .select('*')
          .eq('id', user.profile.clinic_id)
          .single();

        if (error) throw error;
        setSettings(data);
      } catch (error) {
        console.error('Error fetching channel settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [user?.profile?.clinic_id]);

  const updateSettings = async (updates) => {
    if (!user?.profile?.clinic_id) return;

    try {
      const { data, error } = await supabase
        .from('clinics')
        .update(updates)
        .eq('id', user.profile.clinic_id)
        .select()
        .single();

      if (error) throw error;
      setSettings(data);
      return { success: true, data };
    } catch (error) {
      console.error('Error updating channel settings:', error);
      return { success: false, error };
    }
  };

  return { settings, loading, updateSettings };
};