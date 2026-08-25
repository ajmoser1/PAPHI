-- Launch security hardening (privilege escalation, contact privacy, invites, search RPC).
-- Applied against linked prod with drifted migration history; keep idempotent.

-- ---------------------------------------------------------------------------
-- 1) Profiles: block self-promotion via column grants + trigger
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can update own profile (non-privileged fields)" ON public.profiles;

-- Keep a single own-row update policy (RLS). Privileged columns are revoked below.
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

REVOKE UPDATE ON TABLE public.profiles FROM anon, authenticated;
REVOKE ALL ON TABLE public.profiles FROM anon;

GRANT UPDATE (
  first_name,
  last_name,
  graduation_year,
  avatar_url,
  bio,
  chapter,
  search_scope,
  visibility_scope,
  privacy_settings,
  featured_position_id,
  profile_setup_completed_at,
  updated_at
) ON TABLE public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.profiles_block_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  -- PostgREST user JWTs connect as authenticated/anon. Service role bypasses.
  IF current_user IN ('authenticated', 'anon') THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.role IS DISTINCT FROM OLD.role
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.chapter_id IS DISTINCT FROM OLD.chapter_id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Cannot modify privileged profile fields'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_block_privilege_escalation ON public.profiles;
CREATE TRIGGER profiles_block_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_block_privilege_escalation();

-- ---------------------------------------------------------------------------
-- 2) handle_new_user: never take role from client-controlled auth metadata
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  full_name text := COALESCE(meta->>'full_name', meta->>'name', '');
  given_name text := COALESCE(meta->>'given_name', meta->>'first_name', '');
  family_name text := COALESCE(meta->>'family_name', meta->>'last_name', '');
  first_name text;
  last_name text;
BEGIN
  IF given_name <> '' OR family_name <> '' THEN
    first_name := given_name;
    last_name := family_name;
  ELSIF full_name <> '' THEN
    first_name := split_part(full_name, ' ', 1);
    last_name := NULLIF(btrim(substr(full_name, length(split_part(full_name, ' ', 1)) + 1)), '');
    last_name := COALESCE(last_name, '');
  ELSE
    first_name := '';
    last_name := '';
  END IF;

  INSERT INTO public.profiles (id, first_name, last_name, role, status)
  VALUES (
    NEW.id,
    first_name,
    last_name,
    'pending',
    'pending_approval'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 3) Contact privacy: peers must use masking view, not base table
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS alumni_contact_select_visible_tenant ON public.alumni_contact;

DROP VIEW IF EXISTS public.alumni_contact_public;
CREATE VIEW public.alumni_contact_public
WITH (security_invoker = false)
AS
SELECT
  profile_id,
  CASE WHEN show_email THEN email ELSE NULL::text END AS email,
  CASE WHEN show_phone THEN phone ELSE NULL::text END AS phone,
  CASE WHEN show_linkedin THEN linkedin_url ELSE NULL::text END AS linkedin_url,
  show_email,
  show_phone,
  show_linkedin
FROM public.alumni_contact
WHERE profile_id = auth.uid()
   OR public.can_view_profile(profile_id);

REVOKE ALL ON TABLE public.alumni_contact_public FROM PUBLIC;
REVOKE ALL ON TABLE public.alumni_contact_public FROM anon;
GRANT SELECT ON TABLE public.alumni_contact_public TO authenticated;

-- Tighten base-table grants: no anon access; authenticated keeps own-row CRUD via RLS
REVOKE ALL ON TABLE public.alumni_contact FROM anon;
REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.alumni_contact FROM authenticated;

-- ---------------------------------------------------------------------------
-- 4) Hide chapter invite tokens from direct client SELECT
-- ---------------------------------------------------------------------------

REVOKE SELECT ON TABLE public.chapters FROM anon, authenticated;

GRANT SELECT (
  id,
  fraternity_id,
  slug,
  name,
  school_name,
  status,
  display_title,
  tagline,
  logo_url,
  crest_url,
  primary_color,
  accent_color,
  created_at,
  contact_email
) ON TABLE public.chapters TO authenticated, anon;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.chapters FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5) Search RPCs: authenticated only (not anon)
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.search_members(text, uuid, uuid, boolean, uuid, uuid, uuid, integer, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_members(text, uuid, uuid, boolean, uuid, uuid, uuid, integer, integer, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.search_members(text, uuid, uuid, boolean, uuid, uuid, uuid, integer, integer, text) TO authenticated;

REVOKE ALL ON FUNCTION public.search_alumni(text, uuid, uuid, uuid, uuid, uuid, integer, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_alumni(text, uuid, uuid, uuid, uuid, uuid, integer, integer, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.search_alumni(text, uuid, uuid, uuid, uuid, uuid, integer, integer, text) TO authenticated;
