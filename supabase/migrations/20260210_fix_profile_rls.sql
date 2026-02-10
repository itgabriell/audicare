-- Policy: Users can view profiles of other users in the same clinic
DROP POLICY IF EXISTS "Users can view profiles in same clinic" ON profiles;

CREATE POLICY "Users can view profiles in same clinic"
ON profiles FOR SELECT
USING (
    clinic_id IN (
        SELECT clinic_id FROM profiles WHERE id = auth.uid()
    )
);

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
