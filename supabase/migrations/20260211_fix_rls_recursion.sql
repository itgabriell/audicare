-- Migration to fix infinite recursion in RLS policies
-- We replace subqueries on the table being checked with a SECURITY DEFINER function call

-- 1. Fix PROFILES (The main culprit)
DROP POLICY IF EXISTS "Users can view profiles from their own clinic" ON public.profiles;

CREATE POLICY "Users can view profiles from their own clinic"
ON public.profiles FOR SELECT
TO authenticated
USING (is_member_of_clinic(clinic_id));


-- 2. Fix CAMPAIGN_RULES (Also potentially recursive)
DROP POLICY IF EXISTS "Enable select for authenticated users based on profiles" ON public.campaign_rules;
CREATE POLICY "Enable select for authenticated users based on profiles"
ON public.campaign_rules FOR SELECT
TO authenticated
USING (is_member_of_clinic(clinic_id));

DROP POLICY IF EXISTS "Enable delete for authenticated users based on profiles" ON public.campaign_rules;
CREATE POLICY "Enable delete for authenticated users based on profiles"
ON public.campaign_rules FOR DELETE
TO authenticated
USING (is_member_of_clinic(clinic_id));

DROP POLICY IF EXISTS "Enable insert for authenticated users based on profiles" ON public.campaign_rules;
CREATE POLICY "Enable insert for authenticated users based on profiles"
ON public.campaign_rules FOR INSERT
TO authenticated
WITH CHECK (is_member_of_clinic(clinic_id));

DROP POLICY IF EXISTS "Enable update for authenticated users based on profiles" ON public.campaign_rules;
CREATE POLICY "Enable update for authenticated users based on profiles"
ON public.campaign_rules FOR UPDATE
TO authenticated
USING (is_member_of_clinic(clinic_id))
WITH CHECK (is_member_of_clinic(clinic_id));
