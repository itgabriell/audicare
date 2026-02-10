-- Create a secure RPC function to migrate orphaned repairs
-- This bypasses RLS to find records with NULL clinic_id and assign them to the provided clinic_id
CREATE OR REPLACE FUNCTION migrate_repairs_rpc(target_clinic_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  count_updated INT;
BEGIN
  -- Update repair_tickets where clinic_id is NULL
  UPDATE repair_tickets
  SET clinic_id = target_clinic_id
  WHERE clinic_id IS NULL;
  
  GET DIAGNOSTICS count_updated = ROW_COUNT;
  
  -- Also attempt to migrate leads if needed
  UPDATE leads
  SET clinic_id = target_clinic_id
  WHERE clinic_id IS NULL;
  
  RETURN json_build_object('success', true, 'count', count_updated);
END;
$$;
