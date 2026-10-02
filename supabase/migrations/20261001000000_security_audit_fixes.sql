-- Security audit fixes (2026-10-01).
-- Report: docs/security/2026-10-01-security-audit.md
--
-- HOW TO RUN: paste this whole file into the Supabase SQL Editor and run it.
-- It is wrapped in a single transaction: if any statement fails, nothing is
-- applied. It is also idempotent (safe to re-run). It drops no tables and deletes
-- no rows. The only data it writes is a one-time backfill of conversations whose
-- last_message_at is NULL (the trigger that should set it never worked; see 3).
-- Existing messages are not validated against the new length cap.
-- (Intended for the SQL Editor; prod migration history has drifted from the CLI.)
--
-- 1) Drop permissive policies that OR-bypass tenant/visibility RLS:
--    legacy repo policies + the prod-only is_admin() policies on profiles,
--    companies, industries, positions.
-- 2) RLS visibility requires an *active* viewer (pending members could read the directory).
-- 3) Messaging: participants must be active + same fraternity, re-checked on every
--    send; soft delete only, one-way (no undelete, no rewriting body, no moving to
--    another conversation); 4,000-char cap on new messages. Privileges on
--    messages / conversations are fully reset and re-granted, with INSERT limited
--    to the columns the app sends. The last_message_at trigger function becomes
--    SECURITY DEFINER (it never worked under RLS).
-- 4) chapters: privileges fully reset; client roles get read-only access to an
--    explicit column allowlist (no contact_email / invite_token).
-- 5) search_members: escape LIKE wildcards, clamp page size, derive viewer chapter
--    server-side, and enforce active viewer + same fraternity in the function itself.
-- 6) handle_new_user: pin search_path including pg_temp.
--
-- PRE-FLIGHT ABORTS (nothing is applied) if: a required table/function is missing,
-- search_members' signature has drifted, RLS is off on any affected table, the
-- messaging tables have a permissive policy this script doesn't know about, or
-- (checked after section 3 fixes the known one) any other non-SECURITY DEFINER
-- trigger on messages writes to conversations. If it aborts, the error message
-- names exactly what to review.

BEGIN;

-- Fail fast instead of queueing behind live traffic for table locks.
SET LOCAL lock_timeout = '5s';

-- Pre-flight: stop with a clear message if prod is missing something this script expects.
DO $$
DECLARE
  missing text[] := ARRAY[]::text[];
BEGIN
  IF to_regclass('public.profiles') IS NULL THEN missing := array_append(missing, 'table profiles'); END IF;
  IF to_regclass('public.positions') IS NULL THEN missing := array_append(missing, 'table positions'); END IF;
  IF to_regclass('public.chapters') IS NULL THEN missing := array_append(missing, 'table chapters'); END IF;
  IF to_regclass('public.companies') IS NULL THEN missing := array_append(missing, 'table companies'); END IF;
  IF to_regclass('public.industries') IS NULL THEN missing := array_append(missing, 'table industries'); END IF;
  IF to_regclass('public.alumni_contact') IS NULL THEN missing := array_append(missing, 'table alumni_contact'); END IF;
  IF to_regclass('public.conversations') IS NULL THEN missing := array_append(missing, 'table conversations'); END IF;
  IF to_regclass('public.messages') IS NULL THEN missing := array_append(missing, 'table messages'); END IF;
  IF to_regprocedure('public.viewer_chapter_id()') IS NULL THEN missing := array_append(missing, 'function viewer_chapter_id()'); END IF;
  IF to_regprocedure('public.handle_new_user()') IS NULL THEN missing := array_append(missing, 'function handle_new_user()'); END IF;
  IF cardinality(missing) > 0 THEN
    RAISE EXCEPTION 'Security migration aborted, nothing applied. Missing: %', array_to_string(missing, ', ');
  END IF;

  -- CREATE OR REPLACE below cannot change a function's return type or input
  -- parameter names, so verify prod's search_members matches before touching it.
  IF to_regprocedure('public.search_members(text, uuid, uuid, boolean, uuid, uuid, uuid, integer, integer, text)') IS NULL THEN
    RAISE EXCEPTION 'Security migration aborted, nothing applied. search_members(text, uuid, uuid, boolean, uuid, uuid, uuid, integer, integer, text) not found — prod signature has drifted.';
  END IF;
  IF pg_get_function_identity_arguments('public.search_members(text, uuid, uuid, boolean, uuid, uuid, uuid, integer, integer, text)'::regprocedure)
       <> 'search_query text, filter_industry_id uuid, filter_company_id uuid, filter_alumni_only boolean, filter_fraternity_id uuid, filter_chapter_id uuid, viewer_chapter_id uuid, result_limit integer, result_offset integer, sort_by text'
     OR pg_get_function_result('public.search_members(text, uuid, uuid, boolean, uuid, uuid, uuid, integer, integer, text)'::regprocedure)
       <> 'TABLE(profile_id uuid, first_name text, last_name text, avatar_url text, role text, current_company text, graduation_year integer, chapter_id uuid, chapter_name text, school_name text)' THEN
    RAISE EXCEPTION 'Security migration aborted, nothing applied. search_members parameter names or return columns differ from expected: (%) -> %',
      pg_get_function_identity_arguments('public.search_members(text, uuid, uuid, boolean, uuid, uuid, uuid, integer, integer, text)'::regprocedure),
      pg_get_function_result('public.search_members(text, uuid, uuid, boolean, uuid, uuid, uuid, integer, integer, text)'::regprocedure);
  END IF;

  -- Every policy in this script assumes RLS is on. Abort (don't silently enable:
  -- turning RLS on for a table with no policies would lock the app out).
  SELECT array_agg(c.relname ORDER BY c.relname) INTO missing
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN ('profiles', 'positions', 'alumni_contact', 'chapters',
                      'companies', 'industries', 'conversations', 'messages')
    AND NOT c.relrowsecurity;
  IF cardinality(missing) > 0 THEN
    RAISE EXCEPTION 'Security migration aborted, nothing applied. RLS is disabled on: %', array_to_string(missing, ', ');
  END IF;

  -- (The trigger check runs later, after section 3 redefines the known
  -- last_message_at trigger function, so it still catches any other one.)

  -- Permissive policies combine with OR, so an unknown one on the messaging
  -- tables would silently widen the rules below. Stop and review it instead.
  -- (Restrictive policies only narrow access and are allowed.)
  SELECT array_agg(format('%s: "%s" (%s)', tablename, policyname, cmd) ORDER BY tablename, policyname) INTO missing
  FROM pg_policies
  WHERE schemaname = 'public'
    AND permissive = 'PERMISSIVE'
    AND (tablename, policyname) NOT IN (
      ('conversations', 'Authenticated users can create conversations'),
      ('conversations', 'Participants can view their conversations'),
      ('messages', 'Participants can send messages'),
      ('messages', 'Participants can view messages'),
      ('messages', 'Senders can soft-delete own messages')
    )
    AND tablename IN ('conversations', 'messages');
  IF cardinality(missing) > 0 THEN
    RAISE EXCEPTION 'Security migration aborted, nothing applied. Unreviewed permissive policies on messaging tables: %', array_to_string(missing, '; ');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1) Legacy permissive policies (created in 20250630120000, never dropped)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS profiles_select_active ON public.profiles;
DROP POLICY IF EXISTS positions_select_active_profiles ON public.positions;
DROP POLICY IF EXISTS "Active users can view active profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view positions" ON public.positions;
DROP POLICY IF EXISTS "Authenticated users can view alumni contact (via view)" ON public.alumni_contact;

-- Prod-only is_admin() policies (not in repo history), all granted TO public.
-- Permissive policies OR together, so these exempt admins from tenant/visibility
-- rules (profiles) and let them write ANY company, industry, or member position
-- directly via REST — bypassing the founder-only checks in src/actions/admin.ts.
-- The app does not depend on them:
--   profiles   — admins read their own row via profiles_select_own; others via service role
--   companies  — all writes (and admin listing) use the service role
--   industries — writes use the service role; reads use the general member read policy
--   positions  — members only edit their own rows (own-row policies)
-- The is_admin() function itself is left in place.
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can manage industries" ON public.industries;
DROP POLICY IF EXISTS "Admins can manage all positions" ON public.positions;

-- ---------------------------------------------------------------------------
-- 2) Visibility helpers: viewer must be active
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.viewer_is_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_profile(target_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
  SELECT public.viewer_is_active() AND EXISTS (
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

-- Messaging eligibility: both sides active and in the same fraternity.
CREATE OR REPLACE FUNCTION public.can_message(other_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles me
    JOIN public.chapters my_chapter ON my_chapter.id = me.chapter_id
    JOIN public.profiles other ON other.id = other_profile_id
    JOIN public.chapters other_chapter ON other_chapter.id = other.chapter_id
    WHERE me.id = auth.uid()
      AND me.status = 'active'
      AND other.status = 'active'
      AND other.id <> me.id
      AND my_chapter.fraternity_id = other_chapter.fraternity_id
  );
$$;

REVOKE ALL ON FUNCTION public.viewer_is_active() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_view_profile(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_message(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.viewer_is_active() FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_view_profile(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_message(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.viewer_is_active() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_message(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) Messaging RLS
-- ---------------------------------------------------------------------------
-- Every known messaging policy is dropped and recreated here with a canonical
-- definition, so an existing policy with an expected *name* but a broader rule
-- (FOR ALL, USING (true), ...) cannot survive. Unknown names abort in pre-flight.
-- Resulting set: conversations = INSERT + SELECT only (no UPDATE/DELETE/ALL);
-- messages = INSERT + SELECT + one-way soft-delete UPDATE.

DROP POLICY IF EXISTS "Participants can view their conversations" ON public.conversations;
CREATE POLICY "Participants can view their conversations"
  ON public.conversations
  FOR SELECT TO authenticated
  USING (auth.uid() = participant_a OR auth.uid() = participant_b);

DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
CREATE POLICY "Participants can view messages"
  ON public.messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
CREATE POLICY "Authenticated users can create conversations"
  ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (
    (auth.uid() = participant_a AND public.can_message(participant_b))
    OR (auth.uid() = participant_b AND public.can_message(participant_a))
  );

DROP POLICY IF EXISTS "Participants can send messages" ON public.messages;
CREATE POLICY "Participants can send messages"
  ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND is_deleted = false
    AND public.viewer_is_active()
    AND EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())
        -- Re-check eligibility on every send: if the other participant was
        -- suspended or left the fraternity, the thread becomes read-only.
        AND public.can_message(
          CASE WHEN c.participant_a = auth.uid() THEN c.participant_b ELSE c.participant_a END
        )
    )
  );

-- One-way soft delete: only not-yet-deleted rows can be updated, and only to deleted.
DROP POLICY IF EXISTS "Senders can soft-delete own messages" ON public.messages;
CREATE POLICY "Senders can soft-delete own messages"
  ON public.messages
  FOR UPDATE TO authenticated
  USING (sender_id = auth.uid() AND is_deleted = false)
  WITH CHECK (
    sender_id = auth.uid()
    AND is_deleted = true
    AND EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())
    )
  );

-- Messaging privileges: full reset, then explicit re-grants.
--   PUBLIC, anon       -> nothing (every role inherits PUBLIC, so it must be empty)
--   authenticated      -> SELECT on both tables; INSERT only on the columns the app
--                         sends (id / created_at / is_deleted always come from DB
--                         defaults, so timestamps can't be forged); UPDATE on
--                         messages.is_deleted only; no UPDATE on conversations;
--                         no DELETE / TRUNCATE (TRUNCATE bypasses RLS)
--   service_role       -> re-granted ALL explicitly, so server code that may have
--                         relied on PUBLIC keeps working
-- Privileges are revoked at table level *and* column by column (reading the live
-- column list, so it adapts to prod). The per-column revokes are the safeguard
-- against any earlier column-level grant surviving.
-- Clients never update conversations (the app doesn't, and no UPDATE policy exists),
-- so the privilege is revoked rather than left to RLS. A trigger maintaining
-- last_message_at must be SECURITY DEFINER; the pre-flight check enforces that.
REVOKE ALL ON TABLE public.messages, public.conversations FROM PUBLIC, anon;
-- REFERENCES / TRIGGER are part of Supabase's default ALL grant; clients need neither.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.messages, public.conversations FROM authenticated;
DO $$
DECLARE
  col record;
BEGIN
  FOR col IN
    SELECT a.attrelid::regclass AS tbl, a.attname
    FROM pg_attribute a
    WHERE a.attrelid IN ('public.messages'::regclass, 'public.conversations'::regclass)
      AND a.attnum > 0 AND NOT a.attisdropped
  LOOP
    EXECUTE format('REVOKE ALL (%I) ON TABLE %s FROM PUBLIC, anon', col.attname, col.tbl);
    EXECUTE format('REVOKE INSERT (%1$I), UPDATE (%1$I), REFERENCES (%1$I) ON TABLE %2$s FROM authenticated', col.attname, col.tbl);
  END LOOP;
END $$;
GRANT SELECT ON TABLE public.messages, public.conversations TO authenticated;
-- Exactly the columns src/actions/messaging.ts inserts.
GRANT INSERT (participant_a, participant_b) ON TABLE public.conversations TO authenticated;
GRANT INSERT (conversation_id, sender_id, body) ON TABLE public.messages TO authenticated;
GRANT UPDATE (is_deleted) ON TABLE public.messages TO authenticated;
GRANT ALL ON TABLE public.messages, public.conversations TO service_role;

-- last_message_at trigger (prod-only; not in repo history). It ran with the
-- sender's privileges, and with no UPDATE policy on conversations its update
-- silently matched 0 rows, so last_message_at was never set. Now that clients have
-- no UPDATE privilege it would fail outright, so it runs as the function owner.
-- Same body as prod, with the table schema-qualified. It only touches the new
-- message's own conversation, and NEW.created_at can no longer be client-supplied
-- (column-scoped INSERT above). Trigger functions can't be called directly, but
-- EXECUTE is revoked from client roles anyway.
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.update_conversation_last_message() FROM PUBLIC, anon, authenticated;

-- One-time backfill: conversations whose last_message_at was never set (the trigger
-- never worked). Only fills NULLs; no other data is changed.
UPDATE public.conversations c
SET last_message_at = latest.created_at
FROM (
  SELECT conversation_id, max(created_at) AS created_at
  FROM public.messages
  GROUP BY conversation_id
) latest
WHERE latest.conversation_id = c.id
  AND c.last_message_at IS NULL;

-- Gate: now that the known trigger is fixed, abort if any *other* non-SECURITY
-- DEFINER trigger on messages writes to conversations — it would break sending
-- messages once client UPDATE on conversations is revoked.
DO $$
DECLARE
  offenders text[];
BEGIN
  SELECT array_agg(format('trigger "%s" -> %s()', t.tgname, p.oid::regproc) ORDER BY t.tgname) INTO offenders
  FROM pg_trigger t
  JOIN pg_proc p ON p.oid = t.tgfoid
  WHERE t.tgrelid = 'public.messages'::regclass
    AND NOT t.tgisinternal
    AND NOT p.prosecdef
    AND p.prosrc ILIKE '%conversations%';
  IF cardinality(offenders) > 0 THEN
    RAISE EXCEPTION 'Security migration aborted, nothing applied. Non-SECURITY DEFINER trigger(s) on messages touch conversations and would break once client UPDATE is revoked: %', array_to_string(offenders, '; ');
  END IF;
END $$;

-- Length cap on new messages. NOT VALID skips checking existing rows, but Postgres
-- re-checks the constraint on every UPDATE, so a legacy message over 4,000 chars
-- could never be soft-deleted. Exempt deleted rows: inserts must have
-- is_deleted = false (insert policy), so the cap still applies to every new message.
-- Written to never evaluate to NULL (a NULL CHECK result counts as passing), so a
-- NULL body is rejected for live messages even if prod's column is nullable.
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_body_length;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_body_length
  CHECK (
    COALESCE(is_deleted, false)
    OR (body IS NOT NULL AND char_length(body) BETWEEN 1 AND 4000)
  ) NOT VALID;

-- ---------------------------------------------------------------------------
-- 4) chapters.contact_email: service role only
-- ---------------------------------------------------------------------------

-- Full reset, then an explicit allowlist. Client roles get read-only access to
-- the listed columns and nothing else; contact_email and invite_token are
-- excluded. Revoked at table level and column by column (live column list), so no
-- earlier grant on any column (including via PUBLIC) survives. Client roles never
-- write chapters (server actions use the service role).
REVOKE ALL ON TABLE public.chapters FROM PUBLIC, anon, authenticated;
DO $$
DECLARE
  col record;
BEGIN
  FOR col IN
    SELECT attname FROM pg_attribute
    WHERE attrelid = 'public.chapters'::regclass AND attnum > 0 AND NOT attisdropped
  LOOP
    EXECUTE format('REVOKE ALL (%I) ON TABLE public.chapters FROM PUBLIC, anon, authenticated', col.attname);
  END LOOP;
END $$;
GRANT ALL ON TABLE public.chapters TO service_role;
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
  created_at
) ON TABLE public.chapters TO authenticated, anon;

-- ---------------------------------------------------------------------------
-- 5) search_members: escaped wildcards, clamped limit, server-derived viewer chapter
--    (viewer_chapter_id param kept for signature compatibility but ignored)
-- ---------------------------------------------------------------------------

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
      public.viewer_chapter_id() AS viewer_chapter,
      public.viewer_is_active() AS viewer_active,
      (SELECT c.fraternity_id FROM chapters c WHERE c.id = public.viewer_chapter_id()) AS viewer_fraternity
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

REVOKE ALL ON FUNCTION public.search_members(text, uuid, uuid, boolean, uuid, uuid, uuid, integer, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_members(text, uuid, uuid, boolean, uuid, uuid, uuid, integer, integer, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.search_members(text, uuid, uuid, boolean, uuid, uuid, uuid, integer, integer, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6) handle_new_user: SECURITY DEFINER must pin pg_temp too
-- ---------------------------------------------------------------------------

ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;

COMMIT;

-- ---------------------------------------------------------------------------
-- Post-run checks (run separately after COMMIT; read-only)
-- ---------------------------------------------------------------------------
-- Expect 0 rows (no policies left using is_admin()):
--   select tablename, policyname from pg_policies
--   where qual ilike '%is_admin%' or with_check ilike '%is_admin%';
--
-- Review the policies left on these tables. Expected:
--   - *_visible_tenant SELECT policies (qual = can_view_profile(...))
--   - own-row policies (*_own, or an ALL policy) whose qual / with_check is only
--     "id = auth.uid()" or "profile_id = auth.uid()"
--   Anything else that reads other people's rows needs a look.
--   select tablename, policyname, cmd, roles, qual, with_check from pg_policies
--   where schemaname = 'public' and tablename in ('profiles','positions','alumni_contact')
--   order by tablename, policyname;
--
-- Messaging tables: expect exactly these 5 PERMISSIVE policies (plus any RESTRICTIVE ones):
--   conversations | Authenticated users can create conversations | INSERT
--   conversations | Participants can view their conversations    | SELECT
--   messages      | Participants can send messages               | INSERT
--   messages      | Participants can view messages               | SELECT
--   messages      | Senders can soft-delete own messages         | UPDATE
--   No ALL / DELETE policies, and no UPDATE policy on conversations.
--   select tablename, policyname, permissive, cmd, roles, qual, with_check from pg_policies
--   where schemaname = 'public' and tablename in ('conversations','messages')
--   order by tablename, policyname;
--
-- Expect 0 rows (RLS enabled everywhere this script relies on it):
--   select relname from pg_class
--   where relnamespace = 'public'::regnamespace and not relrowsecurity
--     and relname in ('profiles','positions','alumni_contact','chapters','companies',
--                     'industries','conversations','messages');
--
-- Every client privilege on chapters / messages / conversations that is NOT on
-- the intended allowlist. Expect 0 rows. (PUBLIC grants are inherited by anon and
-- authenticated, so they show up here too.)
--   with priv(p) as (values ('SELECT'), ('INSERT'), ('UPDATE'), ('REFERENCES')),
--   actual as (
--     select r.role, a.attrelid::regclass::text as tbl, a.attname as col, priv.p
--     from (values ('anon'), ('authenticated')) r(role)
--     cross join priv
--     join pg_attribute a
--       on a.attrelid in ('public.chapters'::regclass, 'public.messages'::regclass, 'public.conversations'::regclass)
--      and a.attnum > 0 and not a.attisdropped
--     where has_column_privilege(r.role, a.attrelid, a.attname, priv.p)
--   )
--   select * from actual
--   where not (
--        (tbl = 'chapters' and p = 'SELECT' and col in ('id','fraternity_id','slug','name','school_name','status',
--          'display_title','tagline','logo_url','crest_url','primary_color','accent_color','created_at'))
--     or (tbl in ('messages','conversations') and role = 'authenticated' and p = 'SELECT')
--     or (tbl = 'messages' and role = 'authenticated' and p = 'INSERT'
--         and col in ('conversation_id','sender_id','body'))
--     or (tbl = 'conversations' and role = 'authenticated' and p = 'INSERT'
--         and col in ('participant_a','participant_b'))
--     or (tbl = 'messages' and role = 'authenticated' and p = 'UPDATE' and col = 'is_deleted')
--   )
--   order by 1, 2, 3, 4;
--
-- Expect: the trigger function is SECURITY DEFINER (t), and never_updated = 0
-- (unless a conversation has no messages yet):
--   select prosecdef from pg_proc where oid = 'public.update_conversation_last_message()'::regprocedure;
--   select count(*) as conversations, count(*) filter (where last_message_at is null) as never_updated
--   from public.conversations;
--
-- Expect every column to be false:
--   select has_table_privilege('authenticated', 'public.messages', 'TRUNCATE')      as can_truncate_messages,
--          has_table_privilege('authenticated', 'public.conversations', 'TRUNCATE') as can_truncate_conversations,
--          has_table_privilege('authenticated', 'public.messages', 'DELETE')        as can_delete_messages,
--          has_table_privilege('authenticated', 'public.conversations', 'DELETE')   as can_delete_conversations,
--          has_table_privilege('authenticated', 'public.conversations', 'UPDATE')   as can_update_conversations,
--          has_table_privilege('anon', 'public.chapters', 'INSERT')                 as anon_can_insert_chapters,
--          has_table_privilege('authenticated', 'public.chapters', 'UPDATE')        as auth_can_update_chapters;
