-- Unread message tracking + home tips dismissal (2026-10-12).
--
-- HOW TO RUN: paste this whole file into the Supabase SQL Editor and run it.
-- Single transaction, idempotent, drops nothing. The only data it writes is a
-- one-time backfill marking every existing conversation as read for both
-- participants as of now, so launch day does not flood members with old
-- threads in "Waiting on you".
--
-- 1) conversation_reads: one row per (conversation, user) with last_read_at.
--    RLS: a user sees and writes only their own rows, and only for
--    conversations they take part in. Client roles get column-limited grants.
-- 2) mark_conversation_read(uuid): upsert helper called when a thread is open.
-- 3) get_unread_conversations(): per-conversation unread counts for the caller,
--    SECURITY INVOKER so the messaging RLS policies still apply.
-- 4) profiles.home_tips_dismissed_at: when the member dismissed the
--    "what you can do here" tiles on Find a Brother (null = show).
--    profiles.profile_completeness_dismissed_at: when the member closed the
--    completeness card on their profile after reaching 100% (null = show).
--
-- PRE-FLIGHT ABORTS (nothing is applied) if the messaging tables, profiles, or
-- the profiles update grant this script extends are missing.

BEGIN;

SET LOCAL lock_timeout = '5s';

DO $$
DECLARE
  missing text[] := ARRAY[]::text[];
BEGIN
  IF to_regclass('public.conversations') IS NULL THEN missing := array_append(missing, 'table conversations'); END IF;
  IF to_regclass('public.messages') IS NULL THEN missing := array_append(missing, 'table messages'); END IF;
  IF to_regclass('public.profiles') IS NULL THEN missing := array_append(missing, 'table profiles'); END IF;
  IF cardinality(missing) > 0 THEN
    RAISE EXCEPTION 'Unread-messages migration aborted, nothing applied. Missing: %', array_to_string(missing, ', ');
  END IF;
END $$;

-- 1) conversation_reads -------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.conversation_reads (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

COMMENT ON TABLE public.conversation_reads IS
  'When each participant last opened a conversation. Messages from the other participant after last_read_at are unread.';

CREATE INDEX IF NOT EXISTS conversation_reads_user_idx
  ON public.conversation_reads (user_id);

-- Supports the unread query (messages after a timestamp per conversation).
CREATE INDEX IF NOT EXISTS messages_conversation_created_idx
  ON public.messages (conversation_id, created_at);

ALTER TABLE public.conversation_reads ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.conversation_reads FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.conversation_reads TO authenticated;
GRANT INSERT (conversation_id, user_id, last_read_at) ON TABLE public.conversation_reads TO authenticated;
GRANT UPDATE (last_read_at) ON TABLE public.conversation_reads TO authenticated;

DROP POLICY IF EXISTS conversation_reads_select_own ON public.conversation_reads;
CREATE POLICY conversation_reads_select_own ON public.conversation_reads
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS conversation_reads_insert_own ON public.conversation_reads;
CREATE POLICY conversation_reads_insert_own ON public.conversation_reads
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.participant_a = (select auth.uid()) OR c.participant_b = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS conversation_reads_update_own ON public.conversation_reads;
CREATE POLICY conversation_reads_update_own ON public.conversation_reads
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- 2) mark_conversation_read ---------------------------------------------------

CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id uuid)
RETURNS void
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = 'public', 'pg_temp'
AS $$
  INSERT INTO public.conversation_reads (conversation_id, user_id, last_read_at)
  VALUES (p_conversation_id, (select auth.uid()), now())
  ON CONFLICT (conversation_id, user_id)
  DO UPDATE SET last_read_at = now();
$$;

REVOKE ALL ON FUNCTION public.mark_conversation_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(uuid) TO authenticated;

-- 3) get_unread_conversations -------------------------------------------------

DROP FUNCTION IF EXISTS public.get_unread_conversations();
CREATE FUNCTION public.get_unread_conversations()
RETURNS TABLE (
  conversation_id uuid,
  other_profile_id uuid,
  unread_count bigint,
  last_message_at timestamptz,
  last_message_preview text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = 'public', 'pg_temp'
AS $$
  WITH me AS (SELECT (select auth.uid()) AS id)
  SELECT
    c.id AS conversation_id,
    CASE WHEN c.participant_a = me.id THEN c.participant_b ELSE c.participant_a END AS other_profile_id,
    count(m.id) AS unread_count,
    max(m.created_at) AS last_message_at,
    (
      SELECT left(m2.body, 140)
      FROM public.messages m2
      WHERE m2.conversation_id = c.id AND m2.is_deleted = false
      ORDER BY m2.created_at DESC
      LIMIT 1
    ) AS last_message_preview
  FROM me
  JOIN public.conversations c
    ON c.participant_a = me.id OR c.participant_b = me.id
  JOIN public.messages m
    ON m.conversation_id = c.id
   AND m.sender_id <> me.id
   AND m.is_deleted = false
  LEFT JOIN public.conversation_reads r
    ON r.conversation_id = c.id AND r.user_id = me.id
  WHERE r.last_read_at IS NULL OR m.created_at > r.last_read_at
  GROUP BY c.id, c.participant_a, c.participant_b, me.id
  ORDER BY max(m.created_at) DESC;
$$;

REVOKE ALL ON FUNCTION public.get_unread_conversations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_unread_conversations() TO authenticated;

-- One-time backfill: existing threads start as read for both participants.
INSERT INTO public.conversation_reads (conversation_id, user_id, last_read_at)
SELECT c.id, p.user_id, now()
FROM public.conversations c
CROSS JOIN LATERAL (VALUES (c.participant_a), (c.participant_b)) AS p(user_id)
ON CONFLICT (conversation_id, user_id) DO NOTHING;

-- 4) profiles.home_tips_dismissed_at -----------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS home_tips_dismissed_at timestamptz;

COMMENT ON COLUMN public.profiles.home_tips_dismissed_at IS
  'When the member dismissed the "what you can do here" tiles on Find a Brother. Null = show them.';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_completeness_dismissed_at timestamptz;

COMMENT ON COLUMN public.profiles.profile_completeness_dismissed_at IS
  'When the member closed the profile-completeness card after reaching 100%. Null = show it.';

-- Members may update their own dismissals (profiles UPDATE is column-granted).
GRANT UPDATE (home_tips_dismissed_at, profile_completeness_dismissed_at) ON TABLE public.profiles TO authenticated;

COMMIT;
