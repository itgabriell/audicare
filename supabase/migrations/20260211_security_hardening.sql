-- Fix search path for security functions
ALTER FUNCTION auto_tag_lead_campaign() SET search_path = public;
ALTER FUNCTION migrate_repairs_rpc(uuid) SET search_path = public;

-- Tighten RLS for campaign_rules
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON campaign_rules;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON campaign_rules;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON campaign_rules;
DROP POLICY IF EXISTS "Enable select for authenticated users only" ON campaign_rules;

CREATE POLICY "Enable select for authenticated users based on clinic_id" 
ON campaign_rules FOR SELECT 
TO authenticated 
USING (clinic_id = (auth.jwt() -> 'user_metadata' ->> 'clinic_id')::uuid);

CREATE POLICY "Enable insert for authenticated users based on clinic_id" 
ON campaign_rules FOR INSERT 
TO authenticated 
WITH CHECK (clinic_id = (auth.jwt() -> 'user_metadata' ->> 'clinic_id')::uuid);

CREATE POLICY "Enable update for authenticated users based on clinic_id" 
ON campaign_rules FOR UPDATE 
TO authenticated 
USING (clinic_id = (auth.jwt() -> 'user_metadata' ->> 'clinic_id')::uuid)
WITH CHECK (clinic_id = (auth.jwt() -> 'user_metadata' ->> 'clinic_id')::uuid);

CREATE POLICY "Enable delete for authenticated users based on clinic_id" 
ON campaign_rules FOR DELETE 
TO authenticated 
USING (clinic_id = (auth.jwt() -> 'user_metadata' ->> 'clinic_id')::uuid);
