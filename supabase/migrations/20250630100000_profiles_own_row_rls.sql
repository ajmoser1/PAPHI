-- Ghost onboarding: authenticated users must read/update their own profile row
-- even when status is pending_approval (RLS may otherwise only expose active profiles).

DROP POLICY IF EXISTS profiles_select_own ON profiles;
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS profiles_update_own ON profiles;
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS alumni_contact_select_own ON alumni_contact;
CREATE POLICY alumni_contact_select_own ON alumni_contact
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS alumni_contact_insert_own ON alumni_contact;
CREATE POLICY alumni_contact_insert_own ON alumni_contact
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS alumni_contact_update_own ON alumni_contact;
CREATE POLICY alumni_contact_update_own ON alumni_contact
  FOR UPDATE TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS positions_select_own ON positions;
CREATE POLICY positions_select_own ON positions
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS positions_insert_own ON positions;
CREATE POLICY positions_insert_own ON positions
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS positions_update_own ON positions;
CREATE POLICY positions_update_own ON positions
  FOR UPDATE TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS positions_delete_own ON positions;
CREATE POLICY positions_delete_own ON positions
  FOR DELETE TO authenticated
  USING (profile_id = auth.uid());
