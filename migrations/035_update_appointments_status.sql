-- Migration: 035_update_appointments_status.sql
-- Description: Updates appointment status enum and adds new statuses as requested

-- First, add the new status values to the enum
ALTER TYPE public.appointment_status ADD VALUE IF NOT EXISTS 'not_confirmed';
ALTER TYPE public.appointment_status ADD VALUE IF NOT EXISTS 'arrived';
ALTER TYPE public.appointment_status ADD VALUE IF NOT EXISTS 'rescheduled';

-- Add a column to track who created the appointment (if not already exists)
-- Note: scheduled_by column already exists from migration 001

-- Add a column to track if this appointment was rescheduled from another date
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS rescheduled_from TIMESTAMPTZ;

-- Add comments for the new columns
COMMENT ON COLUMN public.appointments.rescheduled_from IS 'Original appointment date/time when rescheduled';

-- Update existing comments
COMMENT ON COLUMN public.appointments.scheduled_by IS 'User who created/scheduled this appointment';
