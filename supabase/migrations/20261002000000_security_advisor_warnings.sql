-- Supabase Security Advisor warnings (2026-10-02).
-- Report: docs/security/2026-10-02-security-advisor-warnings.md
-- Verify after running: docs/security/2026-10-02-security-advisor-verify.sql
--
-- Clears every WARN in the advisor report except "Leaked Password Protection
-- Disabled", which is an Auth setting, not SQL (see the report).
--
-- 1) extension_in_public: pg_trgm was installed in public (outside the repo's
--    migration history). Moved to the `extensions` schema. Nothing in the repo
--    uses trigram functions or operators; indexes that use its operator classes
--    keep working after a move.
-- 2) rls_policy_always_true: chapter_requests_insert allowed anon/authenticated
--    to INSERT any row (WITH CHECK (true)). The only writer is the server action
--    in src/actions/founder.ts, which uses the service role. The policy and the
--    client-role table grants are removed; chapter_requests is service-role only.
-- 3) anon/authenticated_security_definer_function_executable:
--    - get_platform_stats(): EXECUTE restricted to service_role. The home page
--      already loads it server-side with the service role; the browser poll now
--      goes through /api/platform-stats instead of /rest/v1/rpc.
--    - handle_new_user(): trigger on auth.users, never meant to be an RPC.
--      EXECUTE revoked from client roles. Postgres checks EXECUTE on a trigger
--      function when the trigger is created, not when it fires, so the trigger
--      is unaffected.
--    - is_admin(), rls_auto_enable(): prod-only functions (not in the repo).
--      EXECUTE revoked from client roles if they exist. Aborts if any policy
--      still uses is_admin() (the 2026-10-01 audit dropped all four).
--    - viewer_chapter_id(), viewer_is_active(), can_view_profile(uuid),
--      can_message(uuid): RLS helpers. Policies run them as the querying user,
--      so `authenticated` must keep EXECUTE. The linter's third remedy applies:
--      they move to a `private` schema that PostgREST does not expose, so they
--      drop off /rest/v1/rpc while RLS keeps working. ALTER FUNCTION ... SET
--      SCHEMA keeps the function OID, so every policy and view that references
--      them is untouched. The two SQL bodies that name them by schema
--      (can_view_profile, search_members) are re-created with `private.`.
--
-- HOW TO RUN: paste into the Supabase SQL Editor and run. Single transaction,
-- idempotent (safe to re-run). Pre-flight checks abort before any change if the
-- database is not in the expected state. Prerequisite: `private` must not be
-- listed under Settings -> API -> Exposed schemas (the pre-flight checks the
-- database-level setting; check the dashboard too).

BEGIN;

-- ---------------------------------------------------------------------------
-- Pre-flight (abort before any change)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  missing text[] := '{}';
  offenders text[];
  helper_oids oid[] := '{}';
  o oid;
BEGIN
  FOREACH o IN ARRAY ARRAY[
    to_regprocedure('public.viewer_chapter_id()'), to_regprocedure('private.viewer_chapter_id()'),
    to_regprocedure('public.viewer_is_active()'), to_regprocedure('private.viewer_is_active()'),
    to_regprocedure('public.can_view_profile(uuid)'), to_regprocedure('private.can_view_profile(uuid)'),
    to_regprocedure('public.can_message(uuid)'), to_regprocedure('private.can_message(uuid)')
  ] LOOP
    IF o IS NOT NULL THEN helper_oids := array_append(helper_oids, o); END IF;
  END LOOP;

  IF to_regprocedure('public.viewer_chapter_id()') IS NULL AND to_regprocedure('private.viewer_chapter_id()') IS NULL THEN missing := array_append(missing, 'viewer_chapter_id()'); END IF;
  IF to_regprocedure('public.viewer_is_active()') IS NULL AND to_regprocedure('private.viewer_is_active()') IS NULL THEN missing := array_append(missing, 'viewer_is_active()'); END IF;
  IF to_regprocedure('public.can_view_profile(uuid)') IS NULL AND to_regprocedure('private.can_view_profile(uuid)') IS NULL THEN missing := array_append(missing, 'can_view_profile(uuid)'); END IF;
  IF to_regprocedure('public.can_message(uuid)') IS NULL AND to_regprocedure('private.can_message(uuid)') IS NULL THEN missing := array_append(missing, 'can_message(uuid)'); END IF;
  IF to_regprocedure('public.get_platform_stats()') IS NULL THEN missing := array_append(missing, 'public.get_platform_stats()'); END IF;
  IF to_regprocedure('public.handle_new_user()') IS NULL THEN missing := array_append(missing, 'public.handle_new_user()'); END IF;
  IF to_regprocedure('public.search_members(text, uuid, uuid, boolean, uuid, uuid, uuid, integer, integer, text)') IS NULL THEN
    missing := array_append(missing, 'public.search_members(10 args)');
  END IF;
  IF to_regnamespace('extensions') IS NULL THEN missing := array_append(missing, 'schema extensions'); END IF;
  IF cardinality(missing) > 0 THEN
    RAISE EXCEPTION 'Security advisor migration aborted, nothing applied. Missing: %', array_to_string(missing, ', ');
  END IF;

  -- SQL/plpgsql bodies are re-parsed at call time, so any *other* function that
  -- names a helper (qualified with public. or unqualified) would break after the
  -- move. Only can_view_profile and search_members are expected; both are
  -- re-created below.
  SELECT array_agg(p.oid::regprocedure::text ORDER BY 1) INTO offenders
  FROM pg_proc p
  WHERE p.pronamespace NOT IN ('pg_catalog'::regnamespace, 'information_schema'::regnamespace)
    AND p.oid <> ALL (helper_oids)
    AND p.oid <> 'public.search_members(text, uuid, uuid, boolean, uuid, uuid, uuid, integer, integer, text)'::regprocedure
    AND (
      p.prosrc ~ '\mpublic\.(viewer_chapter_id|viewer_is_active|can_view_profile|can_message)\s*\('
      OR p.prosrc ~ '(^|[^[:alnum:]_.])(viewer_chapter_id|viewer_is_active|can_view_profile|can_message)\s*\('
    );
  IF offenders IS NOT NULL THEN
    RAISE EXCEPTION 'Security advisor migration aborted, nothing applied. Other function bodies reference the RLS helpers by name and must be updated to private.* first: %', array_to_string(offenders, ', ');
  END IF;

  -- is_admin(): revoking EXECUTE from authenticated would break any policy that still calls it.
  IF to_regprocedure('public.is_admin()') IS NOT NULL THEN
    SELECT array_agg(schemaname || '.' || tablename || '.' || policyname ORDER BY 1) INTO offenders
    FROM pg_policies
    WHERE coalesce(qual, '') ~* '\mis_admin\s*\(' OR coalesce(with_check, '') ~* '\mis_admin\s*\(';
    IF offenders IS NOT NULL THEN
      RAISE EXCEPTION 'Security advisor migration aborted, nothing applied. Policies still use is_admin(): %', array_to_string(offenders, ', ');
    END IF;
  END IF;

  -- `private` must stay out of the PostgREST exposed schemas, or moving the helpers achieves nothing.
  IF EXISTS (
    SELECT 1 FROM pg_db_role_setting s CROSS JOIN LATERAL unnest(s.setconfig) c
    WHERE c LIKE 'pgrst.db_schemas=%' AND c ~ '\mprivate\M'
  ) THEN
    RAISE EXCEPTION 'Security advisor migration aborted, nothing applied. Schema "private" is listed in pgrst.db_schemas; remove it from Settings -> API -> Exposed schemas first.';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1) pg_trgm out of public
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm' AND extnamespace = 'public'::regnamespace) THEN
    ALTER EXTENSION pg_trgm SET SCHEMA extensions;
  END IF;
END $$;
-- Fresh environments: install straight into extensions. No-op where it already exists.
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- 2) chapter_requests: service role only
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS chapter_requests_insert ON public.chapter_requests;
REVOKE ALL ON TABLE public.chapter_requests FROM PUBLIC, anon, authenticated;
ALTER TABLE public.chapter_requests ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3a) get_platform_stats: callable by the server (service role) only
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.get_platform_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_stats() TO service_role;

-- ---------------------------------------------------------------------------
-- 3b) handle_new_user: trigger function, not an RPC
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
DO $$
BEGIN
  -- Not required for the trigger to fire; kept so the auth service could call it explicitly.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3c) Prod-only SECURITY DEFINER functions not in the repo
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regprocedure('public.is_admin()') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon, authenticated;
  END IF;
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    -- Event-trigger style helper; like handle_new_user, firing does not need EXECUTE.
    REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3d) RLS helpers: move out of the API-exposed schema
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
-- Unlike public, nothing created here is auto-granted to client roles.
ALTER DEFAULT PRIVILEGES IN SCHEMA private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

DO $$
BEGIN
  IF to_regprocedure('public.viewer_chapter_id()') IS NOT NULL THEN
    ALTER FUNCTION public.viewer_chapter_id() SET SCHEMA private;
  END IF;
  IF to_regprocedure('public.viewer_is_active()') IS NOT NULL THEN
    ALTER FUNCTION public.viewer_is_active() SET SCHEMA private;
  END IF;
  IF to_regprocedure('public.can_view_profile(uuid)') IS NOT NULL THEN
    ALTER FUNCTION public.can_view_profile(uuid) SET SCHEMA private;
  END IF;
  IF to_regprocedure('public.can_message(uuid)') IS NOT NULL THEN
    ALTER FUNCTION public.can_message(uuid) SET SCHEMA private;
  END IF;
END $$;

-- Same body as 20261001000000, with the two helper calls now schema-qualified
-- to private. CREATE OR REPLACE keeps the OID the policies point at.
CREATE OR REPLACE FUNCTION private.can_view_profile(target_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
  SELECT private.viewer_is_active() AND EXISTS (
    SELECT 1
    FROM public.profiles target
    JOIN public.chapters target_chapter ON target_chapter.id = target.chapter_id
    WHERE target.id = target_profile_id
      AND target.status = 'active'
      AND target.visibility_scope <> 'hidden'
      AND (
        (
          target.visibility_scope = 'chapter'
          AND target.chapter_id = private.viewer_chapter_id()
        )
        OR (
          target.visibility_scope = 'fraternity'
          AND target_chapter.fraternity_id = (
            SELECT c.fraternity_id
            FROM public.chapters c
            WHERE c.id = private.viewer_chapter_id()
          )
        )
      )
  );
$$;

-- Privileges survive SET SCHEMA; re-asserted so this section is complete on its own.
REVOKE ALL ON FUNCTION private.viewer_chapter_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.viewer_is_active() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_view_profile(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_message(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.viewer_chapter_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.viewer_is_active() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_view_profile(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_message(uuid) TO authenticated, service_role;

-- search_members: identical to 20261001000000 except the three helper calls in
-- the params CTE now point at private.*. search_alumni wraps this and is unchanged.
CREATE OR REPLACE FUNCTION public.search_members(
  search_query text DEFAULT '',
  filter_industry_id uuid DEFAULT NULL,
  filter_company_id uuid DEFAULT NULL,
  filter_alumni_only boolean DEFAULT false,
  filter_fraternity_id uuid DEFAULT NULL,
  filter_chapter_id uuid DEFAULT NULL,
  viewer_chapter_id uuid DEFAULT NULL,
  result_limit int DEFAULT 100,
  result_offset int DEFAULT 0,
  sort_by text DEFAULT 'name'
)
RETURNS TABLE (
  profile_id uuid,
  first_name text,
  last_name text,
  avatar_url text,
  role text,
  current_company text,
  graduation_year int,
  chapter_id uuid,
  chapter_name text,
  school_name text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
-- pg_temp last: otherwise it is implicitly searched first for the unqualified tables below.
SET search_path = public, pg_temp
AS $$
  WITH params AS (
    SELECT
      COALESCE(search_query, '') AS q,
      '%' || replace(replace(replace(COALESCE(search_query, ''), '\', '\\'), '%', '\%'), '_', '\_') || '%' AS pat,
      private.viewer_chapter_id() AS viewer_chapter,
      private.viewer_is_active() AS viewer_active,
      (SELECT c.fraternity_id FROM chapters c WHERE c.id = private.viewer_chapter_id()) AS viewer_fraternity
  ),
  display_positions AS (
    SELECT DISTINCT ON (p.id)
      p.id AS profile_id,
      c.name AS company_name
    FROM profiles p
    JOIN positions pos ON pos.profile_id = p.id
    JOIN companies c ON c.id = pos.company_id
    ORDER BY
      p.id,
      CASE WHEN pos.id = p.featured_position_id THEN 0 ELSE 1 END,
      pos.is_current DESC,
      pos.start_year DESC NULLS LAST
  ),
  matching_profiles AS (
    SELECT p.id
    FROM profiles p
    CROSS JOIN params
    JOIN chapters ch ON ch.id = p.chapter_id
    LEFT JOIN display_positions dp ON dp.profile_id = p.id
    WHERE p.status = 'active'
      -- Encode visibility here too, not only via profiles RLS (defense in depth):
      -- active viewer, same fraternity.
      AND params.viewer_active
      AND ch.fraternity_id = params.viewer_fraternity
      AND p.role IN ('undergrad', 'alumni', 'chapter_admin', 'founder', 'admin')
      AND p.visibility_scope != 'hidden'
      AND (NOT filter_alumni_only OR p.role = 'alumni')
      AND (
        filter_fraternity_id IS NULL
        OR ch.fraternity_id = filter_fraternity_id
      )
      AND (
        filter_chapter_id IS NULL
        OR p.chapter_id = filter_chapter_id
      )
      AND (
        p.visibility_scope = 'fraternity'
        OR (
          p.visibility_scope = 'chapter'
          AND params.viewer_chapter IS NOT NULL
          AND p.chapter_id = params.viewer_chapter
        )
      )
      AND (
        params.q = ''
        OR p.first_name ILIKE params.pat
        OR p.last_name ILIKE params.pat
        OR (p.first_name || ' ' || p.last_name) ILIKE params.pat
        OR dp.company_name ILIKE params.pat
        OR EXISTS (
          SELECT 1
          FROM positions pos
          JOIN companies c ON c.id = pos.company_id
          LEFT JOIN industries i ON i.id = pos.industry_id
          WHERE pos.profile_id = p.id
            AND (
              c.name ILIKE params.pat
              OR i.name ILIKE params.pat
            )
        )
      )
      AND (
        filter_company_id IS NULL
        OR EXISTS (
          SELECT 1 FROM positions pos
          WHERE pos.profile_id = p.id AND pos.company_id = filter_company_id
        )
      )
      AND (
        filter_industry_id IS NULL
        OR EXISTS (
          SELECT 1 FROM positions pos
          WHERE pos.profile_id = p.id AND pos.industry_id = filter_industry_id
        )
      )
  )
  SELECT
    p.id AS profile_id,
    p.first_name,
    p.last_name,
    p.avatar_url,
    p.role,
    dp.company_name AS current_company,
    p.graduation_year,
    ch.id AS chapter_id,
    ch.name AS chapter_name,
    ch.school_name
  FROM profiles p
  JOIN matching_profiles mp ON mp.id = p.id
  JOIN chapters ch ON ch.id = p.chapter_id
  LEFT JOIN display_positions dp ON dp.profile_id = p.id
  ORDER BY
    CASE
      WHEN sort_by = 'class_asc' THEN p.graduation_year
    END ASC NULLS LAST,
    CASE
      WHEN sort_by = 'class_desc' THEN p.graduation_year
    END DESC NULLS LAST,
    CASE
      WHEN sort_by = 'chapter' THEN ch.name
    END ASC NULLS LAST,
    p.last_name,
    p.first_name
  LIMIT LEAST(GREATEST(COALESCE(result_limit, 100), 1), 100)
  OFFSET GREATEST(COALESCE(result_offset, 0), 0);
$$;

REVOKE ALL ON FUNCTION public.search_members(text, uuid, uuid, boolean, uuid, uuid, uuid, integer, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_members(text, uuid, uuid, boolean, uuid, uuid, uuid, integer, integer, text) TO authenticated;

COMMIT;

-- ---------------------------------------------------------------------------
-- Post-run: run docs/security/2026-10-02-security-advisor-verify.sql (read-only;
-- every row should be PASS), then re-run the Security Advisor in the dashboard.
-- ---------------------------------------------------------------------------
