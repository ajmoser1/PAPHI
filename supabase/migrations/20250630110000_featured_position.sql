-- Let members choose which job appears on their profile and in directory search.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS featured_position_id uuid REFERENCES positions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS profiles_featured_position_id_idx ON profiles(featured_position_id);

DROP FUNCTION IF EXISTS search_members(text, uuid, uuid, boolean, uuid, uuid, uuid, int, int);

CREATE OR REPLACE FUNCTION search_members(
  search_query text DEFAULT '',
  filter_industry_id uuid DEFAULT NULL,
  filter_company_id uuid DEFAULT NULL,
  filter_alumni_only boolean DEFAULT false,
  filter_fraternity_id uuid DEFAULT NULL,
  filter_chapter_id uuid DEFAULT NULL,
  viewer_chapter_id uuid DEFAULT NULL,
  result_limit int DEFAULT 100,
  result_offset int DEFAULT 0
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
SET search_path = public
AS $$
  WITH display_positions AS (
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
    JOIN chapters ch ON ch.id = p.chapter_id
    LEFT JOIN display_positions dp ON dp.profile_id = p.id
    WHERE p.status = 'active'
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
          AND viewer_chapter_id IS NOT NULL
          AND p.chapter_id = viewer_chapter_id
        )
      )
      AND (
        search_query = ''
        OR p.first_name ILIKE '%' || search_query || '%'
        OR p.last_name ILIKE '%' || search_query || '%'
        OR (p.first_name || ' ' || p.last_name) ILIKE '%' || search_query || '%'
        OR dp.company_name ILIKE '%' || search_query || '%'
        OR EXISTS (
          SELECT 1
          FROM positions pos
          JOIN companies c ON c.id = pos.company_id
          LEFT JOIN industries i ON i.id = pos.industry_id
          WHERE pos.profile_id = p.id
            AND (
              c.name ILIKE '%' || search_query || '%'
              OR i.name ILIKE '%' || search_query || '%'
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
  ORDER BY p.last_name, p.first_name
  LIMIT result_limit
  OFFSET result_offset;
$$;

GRANT EXECUTE ON FUNCTION search_members(text, uuid, uuid, boolean, uuid, uuid, uuid, int, int) TO authenticated;
