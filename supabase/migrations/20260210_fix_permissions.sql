-- 1. Grant execute permission to the function
GRANT EXECUTE ON FUNCTION migrate_repairs_rpc(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION migrate_repairs_rpc(UUID) TO service_role;

-- 2. Verify if the function works by running a test (optional, just ensuring permissions)
-- SELECT migrate_repairs_rpc('YOUR_CLINIC_ID'); 
