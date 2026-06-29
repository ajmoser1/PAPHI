-- Include active admin profiles in the member directory search.

CREATE OR REPLACE FUNCTION search_members(
  search_query text DEFAULT '',
  filter_industry_id uuid DEFAULT NULL,
  filter_company_id uuid DEFAULT NULL,
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
  graduation_year int
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH current_positions AS (
    SELECT DISTINCT ON (pos.profile_id)
      pos.profile_id,
      c.name AS company_name
    FROM positions pos
    JOIN companies c ON c.id = pos.company_id
    WHERE pos.is_current = true
    ORDER BY pos.profile_id, pos.start_year DESC NULLS LAST
  ),
  matching_profiles AS (
    SELECT p.id
    FROM profiles p
    LEFT JOIN current_positions cp ON cp.profile_id = p.id
    WHERE p.status = 'active'
      AND p.role IN ('undergrad', 'alumni', 'admin')
      AND (
        search_query = ''
        OR p.first_name ILIKE '%' || search_query || '%'
        OR p.last_name ILIKE '%' || search_query || '%'
        OR (p.first_name || ' ' || p.last_name) ILIKE '%' || search_query || '%'
        OR cp.company_name ILIKE '%' || search_query || '%'
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
    cp.company_name AS current_company,
    p.graduation_year
  FROM profiles p
  JOIN matching_profiles mp ON mp.id = p.id
  LEFT JOIN current_positions cp ON cp.profile_id = p.id
  ORDER BY p.last_name, p.first_name
  LIMIT result_limit
  OFFSET result_offset;
$$;

GRANT EXECUTE ON FUNCTION search_members(text, uuid, uuid, int, int) TO authenticated;
