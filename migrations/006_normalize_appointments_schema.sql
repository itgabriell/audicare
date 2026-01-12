-- Migration to add missing and useful columns to contacts and appointments tables.
-- Using "IF NOT EXISTS" to make the script safe to re-run.

-- Add a general notes/observations column to the contacts table.
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- Add columns to the appointments table for more detailed scheduling.
-- professional_id: To link which user/professional is responsible for the appointment.
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS professional_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- scheduled_at: To record when the appointment was created, distinct from the appointment_date itself.
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ DEFAULT NOW();

-- Add comments to clarify the purpose of important columns in the appointments table.
COMMENT ON COLUMN public.appointments.patient_id IS 'Required. The patient for whom the appointment is scheduled. Foreign key to patients.id.';
COMMENT ON COLUMN public.appointments.clinic_id IS 'Required. The clinic where the appointment will take place. Foreign key to clinics.id.';
COMMENT ON COLUMN public.appointments.appointment_date IS 'Required. The date and time of the scheduled appointment.';
COMMENT ON COLUMN public.appointments.status IS 'Required. The current status of the appointment (e.g., scheduled, confirmed, cancelled).';
COMMENT ON COLUMN public.appointments.appointment_type IS 'Optional. The type of appointment (e.g., "Primeira Consulta", "Retorno").';
COMMENT ON COLUMN public.appointments.professional_id IS 'Optional. The professional assigned to this appointment. Foreign key to profiles.id.';
COMMENT ON COLUMN public.appointments.notes IS 'Optional. General observations or notes about the appointment.';