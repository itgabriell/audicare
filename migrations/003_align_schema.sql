-- Migration: 003_align_schema.sql
-- Description: Aligns the schema with the application's expectations, ensuring critical columns exist.

-- 1. Ensure `patients.clinic_id` exists.
-- This column is critical for RLS and multi-tenancy.
-- The IF NOT EXISTS clause prevents errors if the column already exists.
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS clinic_id UUID;

-- 2. Ensure `contacts.channel_type` exists.
-- This column is essential for the multichannel inbox feature.
-- It is defined as `text` to allow for flexibility.
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS channel_type TEXT NOT NULL DEFAULT 'whatsapp';

-- 3. Re-apply RLS policies to ensure they cover the tables correctly.
-- This is idempotent and safe to run multiple times.

-- For `patients` table
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can manage patients from their own clinics" ON public.patients;
CREATE POLICY "Members can manage patients from their own clinics"
ON public.patients FOR ALL
USING (is_member_of_clinic(clinic_id));

-- For `contacts` table
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can manage contacts from their own clinics" ON public.contacts;
CREATE POLICY "Members can manage contacts from their own clinics"
ON public.contacts FOR ALL
USING (is_member_of_clinic(clinic_id));

-- For `conversations` table
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can manage conversations from their own clinics" ON public.conversations;
CREATE POLICY "Members can manage conversations from their own clinics"
ON public.conversations FOR ALL
USING (is_member_of_clinic(clinic_id));

-- For `messages` table
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can manage messages from their own clinics" ON public.messages;
CREATE POLICY "Members can manage messages from their own clinics"
ON public.messages FOR ALL
USING (is_member_of_clinic(clinic_id));

COMMENT ON COLUMN public.contacts.channel_type IS 'Identifies the communication channel for the contact (e.g., whatsapp, email). Added via migration 003.';