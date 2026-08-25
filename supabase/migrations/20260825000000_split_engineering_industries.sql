-- Split broad "Engineering" into career-field subtypes and backfill company industries.

-- 1) Insert engineering subtypes (idempotent on slug)
INSERT INTO industries (name, slug)
VALUES
  ('Software Engineering', 'software-engineering'),
  ('Computer Engineering', 'computer-engineering'),
  ('Electrical Engineering', 'electrical-engineering'),
  ('Mechanical Engineering', 'mechanical-engineering'),
  ('Civil Engineering', 'civil-engineering'),
  ('Other Engineering', 'other-engineering')
ON CONFLICT (slug) DO NOTHING;

-- 2) Remap legacy "Engineering" → "Other Engineering"
DO $$
DECLARE
  old_id uuid;
  new_id uuid;
BEGIN
  SELECT id INTO old_id FROM industries WHERE slug = 'engineering' LIMIT 1;
  SELECT id INTO new_id FROM industries WHERE slug = 'other-engineering' LIMIT 1;

  IF old_id IS NOT NULL AND new_id IS NOT NULL AND old_id <> new_id THEN
    UPDATE positions SET industry_id = new_id WHERE industry_id = old_id;
    UPDATE companies SET industry_id = new_id WHERE industry_id = old_id;
    DELETE FROM industries WHERE id = old_id;
  ELSIF old_id IS NOT NULL AND new_id IS NULL THEN
    -- Fallback: rename in place if Other Engineering insert somehow failed
    UPDATE industries
    SET name = 'Other Engineering', slug = 'other-engineering'
    WHERE id = old_id;
  END IF;
END $$;

-- 3) Backfill companies.industry_id from the earliest position that has an industry
UPDATE companies c
SET industry_id = sub.industry_id,
    updated_at = now()
FROM (
  SELECT DISTINCT ON (company_id)
    company_id,
    industry_id
  FROM positions
  WHERE industry_id IS NOT NULL
  ORDER BY company_id, created_at ASC NULLS LAST
) sub
WHERE c.id = sub.company_id
  AND c.industry_id IS NULL;
