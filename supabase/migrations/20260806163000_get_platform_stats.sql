-- Public aggregate stats for the home page (counts only — no row-level data).
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS TABLE(user_count bigint, chapter_count bigint, company_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
  SELECT
    (SELECT count(*) FROM profiles WHERE status = 'active'),
    (SELECT count(*) FROM chapters WHERE status = 'active'),
    (SELECT count(DISTINCT pos.company_id)
       FROM positions pos
       JOIN profiles p ON p.id = pos.profile_id
      WHERE p.status = 'active'
        AND pos.company_id IS NOT NULL);
$$;

REVOKE ALL ON FUNCTION public.get_platform_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_platform_stats() TO anon, authenticated;
