import { useState, useEffect, useCallback } from 'react';
import { getAppointments, deleteAppointment as deleteAppointmentDb } from '@/database'; // Importar do database (assumindo que existe lá)
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';

export const useAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const loadAppointments = useCallback(async () => {
    if (!user?.profile?.clinic_id) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getAppointments(); 
      setAppointments(data || []);
    } catch (err) {
      console.error('Error loading appointments:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user?.profile?.clinic_id]);

  // --- NOVA FUNÇÃO DE DELETAR ---
  const deleteAppointment = useCallback(async (appointmentId) => {
    try {
        const { error } = await supabase
            .from('appointments')
            .delete()
            .eq('id', appointmentId);

        if (error) throw error;

        // Atualiza estado local para feedback instantâneo
        setAppointments(prev => prev.filter(a => a.id !== appointmentId));
        return { success: true };
    } catch (err) {
        console.error('Error deleting appointment:', err);
        return { success: false, error: err };
    }
  }, []);
  // -----------------------------

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  useEffect(() => {
    if (!user?.profile?.clinic_id) return;

    const channel = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `clinic_id=eq.${user.profile.clinic_id}`,
        },
        () => {
          loadAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.profile?.clinic_id, loadAppointments]);

  return { 
      appointments, 
      loading, 
      error, 
      refetch: loadAppointments,
      deleteAppointment // <--- Exportando a nova função
  };
};