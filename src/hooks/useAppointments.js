import { useState, useEffect, useCallback } from 'react';
import { getAppointments } from '@/database';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';

export const useAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const loadAppointments = useCallback(async () => {
    if (!user?.profile?.clinic_id) {
      setLoading(false);
      return;
    }

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

  const createAppointment = async (appointmentData) => {
    if (!user?.profile?.clinic_id) throw new Error('Clinic ID not found');

    const {
        patient_id,
        appointment_date,
        status = 'scheduled',
        type,
        notes,
        professional_id
    } = appointmentData;

    // Validate professional_id is UUID or null
    const validProfessionalId = professional_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(professional_id) 
        ? professional_id 
        : null;

    const { data, error } = await supabase
        .from('appointments')
        .insert({
            clinic_id: user.profile.clinic_id,
            patient_id,
            appointment_date,
            status,
            appointment_type: type,
            notes,
            professional_id: validProfessionalId,
            scheduled_by: user.id
        })
        .select()
        .single();

    if (error) throw error;
    
    return data;
  };

  return { appointments, loading, error, refetch: loadAppointments, createAppointment };
};
