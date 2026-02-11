-- Migration to harden security policies for multi-tenancy isolation
-- Target tables: appointments, repair_tickets, profiles, campaign_rules

-- 1. Fix APPOINTMENTS
DROP POLICY IF EXISTS "Authenticated users can manage appointments" ON public.appointments;

CREATE POLICY "Users can view appointments from their own clinic"
ON public.appointments FOR SELECT
TO authenticated
USING (is_member_of_clinic(clinic_id));

CREATE POLICY "Users can insert appointments for their own clinic"
ON public.appointments FOR INSERT
TO authenticated
WITH CHECK (is_member_of_clinic(clinic_id));

CREATE POLICY "Users can update appointments from their own clinic"
ON public.appointments FOR UPDATE
TO authenticated
USING (is_member_of_clinic(clinic_id));

CREATE POLICY "Users can delete appointments from their own clinic"
ON public.appointments FOR DELETE
TO authenticated
USING (is_member_of_clinic(clinic_id));


-- 2. Fix REPAIR_TICKETS
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.repair_tickets;

CREATE POLICY "Users can view repair tickets from their own clinic"
ON public.repair_tickets FOR SELECT
TO authenticated
USING (is_member_of_clinic(clinic_id));

CREATE POLICY "Users can insert repair tickets for their own clinic"
ON public.repair_tickets FOR INSERT
TO authenticated
WITH CHECK (is_member_of_clinic(clinic_id));

CREATE POLICY "Users can update repair tickets from their own clinic"
ON public.repair_tickets FOR UPDATE
TO authenticated
USING (is_member_of_clinic(clinic_id));

CREATE POLICY "Users can delete repair tickets from their own clinic"
ON public.repair_tickets FOR DELETE
TO authenticated
USING (is_member_of_clinic(clinic_id));


-- 3. Fix PROFILES (Privacy Hardening)
-- Users should only see profiles from their own clinic
DROP POLICY IF EXISTS "profile_read_all" ON public.profiles;

CREATE POLICY "Users can view profiles from their own clinic"
ON public.profiles FOR SELECT
TO authenticated
USING (
    clinic_id IN (
        SELECT p.clinic_id 
        FROM public.profiles p 
        WHERE p.id = auth.uid()
    )
);


-- 4. Fix CAMPAIGN_RULES (Cleanup permissive policies)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.campaign_rules;

-- The other policies I added earlier seem correct but let's ensure they are clean
-- "Enable select for authenticated users based on profiles" already exists.

-- 5. Fix CLINICS (Harden INSERT)
-- Currently any authenticated user can insert into clinics.
-- This is fine if we want them to be able to create their own clinic, 
-- but we should ensure they become the owner immediately via the RPC function they use.
-- The RPC 'create_clinic_and_add_owner' is SECURITY DEFINER, so it bypasses RLS if needed or works with it.
-- Let's keep it as is for now if it's required for the onboarding flow.

-- 6. Add Search Path to functions (Security Advisor recommendation)
ALTER FUNCTION public.is_member_of_clinic(uuid) SET search_path = public, extensions;
ALTER FUNCTION public.create_clinic_and_add_owner(jsonb, uuid) SET search_path = public, extensions;
