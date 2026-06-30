-- Allow authenticated users to view active members and their work experience.

DROP POLICY IF EXISTS profiles_select_active ON profiles;
CREATE POLICY profiles_select_active ON profiles
  FOR SELECT TO authenticated
  USING (status = 'active');

DROP POLICY IF EXISTS positions_select_active_profiles ON positions;
CREATE POLICY positions_select_active_profiles ON positions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = positions.profile_id
        AND p.status = 'active'
    )
  );
