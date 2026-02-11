-- Fix search path for security functions
ALTER FUNCTION auto_tag_lead_campaign() SET search_path = public;
ALTER FUNCTION migrate_repairs_rpc(uuid) SET search_path = public;

-- Secure RLS for campaign_rules (using profiles table instead of insecure user_metadata)
DROP POLICY IF EXISTS "Enable select for authenticated users based on clinic_id" ON campaign_rules;
DROP POLICY IF EXISTS "Enable insert for authenticated users based on clinic_id" ON campaign_rules;
DROP POLICY IF EXISTS "Enable update for authenticated users based on clinic_id" ON campaign_rules;
DROP POLICY IF EXISTS "Enable delete for authenticated users based on clinic_id" ON campaign_rules;

CREATE POLICY "Enable select for authenticated users based on profiles" 
ON campaign_rules FOR SELECT 
TO authenticated 
USING (clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Enable insert for authenticated users based on profiles" 
ON campaign_rules FOR INSERT 
TO authenticated 
WITH CHECK (clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Enable update for authenticated users based on profiles" 
ON campaign_rules FOR UPDATE 
TO authenticated 
USING (clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Enable delete for authenticated users based on profiles" 
ON campaign_rules FOR DELETE 
TO authenticated 
USING (clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid()));
