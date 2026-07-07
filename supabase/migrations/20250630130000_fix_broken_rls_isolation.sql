-- Security fix: several RLS policies and a stale function let any
-- authenticated (or, in one case, unauthenticated) request bypass the
-- chapter/fraternity tenancy and visibility_scope rules that search_members
-- already enforced at the application layer. This closes those gaps at the
-- RLS layer, which is the actual security boundary for direct REST/JS
-- client access (the anon key is public by design).

-- 1. Drop the pre-multi-tenant search_alumni overload. It was superseded by
--    the 8-arg SECURITY INVOKER version in
--    20250630000001_search_rpc_multi_tenant.sql but never dropped. It was
--    SECURITY DEFINER (bypasses RLS) and executable by anon, letting
--    unauthenticated requests read every active alumnus's name, bio, and
--    current job via /rest/v1/rpc/search_alumni.
DROP FUNCTION IF EXISTS public.search_alumni(text, uuid, uuid, integer, integer);

-- 2. Helpers used by RLS policies below to enforce the same visibility rules
--    that search_members applies at the application layer (chapter/
--    fraternity tenancy + visibility_scope), so direct table/REST access
--    can't bypass them. SECURITY DEFINER avoids RLS recursion when looking
--    up the viewer's own row. These are internal helpers only — not meant
--    to be called directly via PostgREST RPC — so anon execute is revoked.
CREATE OR REPLACE FUNCTION public.viewer_chapter_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
  SELECT chapter_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.can_view_profile(target_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles target
    JOIN public.chapters target_chapter ON target_chapter.id = target.chapter_id
    WHERE target.id = target_profile_id
      AND target.status = 'active'
      AND target.visibility_scope <> 'hidden'
      AND (
        (
          target.visibility_scope = 'chapter'
          AND target.chapter_id = public.viewer_chapter_id()
        )
        OR (
          target.visibility_scope = 'fraternity'
          AND target_chapter.fraternity_id = (
            SELECT c.fraternity_id
            FROM public.chapters c
            WHERE c.id = public.viewer_chapter_id()
          )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.viewer_chapter_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_view_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.viewer_chapter_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_profile(uuid) TO authenticated;
-- This project's default privileges grant EXECUTE to anon explicitly (not
-- via PUBLIC), so REVOKE ALL FROM PUBLIC alone does not remove it.
REVOKE EXECUTE ON FUNCTION public.viewer_chapter_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_view_profile(uuid) FROM anon;

-- 3. profiles: "Active users can view active profiles" (USING auth.uid() IS
--    NOT NULL AND status='active') let any authenticated user read every
--    active profile directly, regardless of visibility_scope
--    ('hidden'/'chapter') or fraternity/chapter tenancy.
DROP POLICY IF EXISTS "Active users can view active profiles" ON public.profiles;

CREATE POLICY profiles_select_visible_tenant ON public.profiles
  FOR SELECT TO authenticated
  USING (public.can_view_profile(id));

-- 4. positions: "Authenticated users can view positions" (USING auth.uid()
--    IS NOT NULL) had no status or visibility restriction at all, exposing
--    work history for every profile (including pending/suspended and
--    hidden/cross-tenant ones) to any authenticated user.
DROP POLICY IF EXISTS "Authenticated users can view positions" ON public.positions;

CREATE POLICY positions_select_visible_tenant ON public.positions
  FOR SELECT TO authenticated
  USING (public.can_view_profile(profile_id));

-- 5. alumni_contact: "Authenticated users can view alumni contact (via
--    view)" (USING auth.uid() IS NOT NULL) let any authenticated user read
--    raw email/phone/linkedin_url for every alumnus directly from the base
--    table, bypassing both the show_email/show_phone/show_linkedin
--    per-field toggle (only enforced by the alumni_contact_public view,
--    which is security_invoker and therefore relies on this table's RLS)
--    and chapter/fraternity tenancy. Scope row visibility to
--    can_view_profile(); the view continues to mask individual fields
--    per-user.
DROP POLICY IF EXISTS "Authenticated users can view alumni contact (via view)" ON public.alumni_contact;

CREATE POLICY alumni_contact_select_visible_tenant ON public.alumni_contact
  FOR SELECT TO authenticated
  USING (public.can_view_profile(profile_id));
