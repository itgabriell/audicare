-- Migration to align tables with new clinic business rules.

-- 1. Alter 'appointments' table
-- Add 'appointment_type' with a default value, as it's now a core business logic field.
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS appointment_type TEXT NOT NULL DEFAULT 'Retorno comum';

-- Add 'professional_name' to store who is conducting the appointment. Default to the primary professional.
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS professional_name TEXT NOT NULL DEFAULT 'Dra. Karine Brandão';

-- Ensure the 'notes' column for appointment-specific observations exists.
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS notes TEXT;


-- 2. Alter 'contacts' table
-- Rename 'observacoes' to 'notes' for consistency with the request.
-- This operation is safe as long as no views or functions depend on the 'observacoes' name.
-- We check if 'observacoes' exists and 'notes' does not, to prevent errors on re-runs.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contacts' AND column_name = 'observacoes')
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contacts' AND column_name = 'notes')
    THEN
        ALTER TABLE public.contacts RENAME COLUMN observacoes TO notes;
    END IF;
END $$;

-- If 'notes' still doesn't exist (e.g., 'observacoes' also didn't exist), add it.
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Alter 'patients' table
-- Ensure the 'notes' column for patient-level general observations exists.
ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comments for clarity
COMMENT ON COLUMN public.appointments.appointment_type IS 'The official type of the appointment (e.g., "Primeiro agendamento/avaliação").';
COMMENT ON COLUMN public.appointments.professional_name IS 'Name of the professional responsible for the appointment. Currently defaults to "Dra. Karine Brandão".';
COMMENT ON COLUMN public.appointments.notes IS 'Consultation-specific notes, relevant only to this particular appointment.';
COMMENT ON COLUMN public.contacts.notes IS 'General, persistent observations about the contact/patient that are relevant across all interactions.';
COMMENT ON COLUMN public.patients.notes IS 'General, persistent observations about the patient that are relevant across all interactions.';