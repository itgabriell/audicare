import { useState, useEffect, useCallback } from 'react';
import { getAppointments } from '@/database'; // CORRIGIDO: mudado de getAppointmentsForClinic para getAppointments
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';

export const useAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const loadAppointments = useCallback(async () => {
    // Verifica apenas se o usuário tem profile carregado
    if (!user?.profile?.clinic_id) {
      // Se não tiver clinic_id ainda, não tenta buscar (evita erro)
      return; 
    }

    try {
      setLoading(true);
      setError(null);
      // getAppointments() sem argumentos busca todos os agendamentos da clínica do usuário atual
      const data = await getAppointments(); 
      setAppointments(data || []);
    } catch (err) {
      console.error('Error loading appointments:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user?.profile?.clinic_id]);

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

  return { appointments, loading, error, refetch: loadAppointments };
};