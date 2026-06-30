-- Multi-tenant foundation: fraternities, chapters, profile extensions, seed data

-- Fraternities (national orgs)
CREATE TABLE IF NOT EXISTS fraternities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  billing_tier text NOT NULL DEFAULT 'free' CHECK (billing_tier IN ('free', 'paid')),
  logo_url text,
  primary_color text,
  accent_color text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Chapters
CREATE TABLE IF NOT EXISTS chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fraternity_id uuid NOT NULL REFERENCES fraternities(id) ON DELETE CASCADE,
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  school_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  display_title text,
  tagline text,
  logo_url text,
  crest_url text,
  primary_color text,
  accent_color text,
  invite_token text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chapters_fraternity_id_idx ON chapters(fraternity_id);
CREATE INDEX IF NOT EXISTS chapters_slug_idx ON chapters(slug);

-- Chapter requests (Start a Chapter form)
CREATE TABLE IF NOT EXISTS chapter_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fraternity_slug text NOT NULL DEFAULT 'sae',
  chapter_name text NOT NULL,
  school_name text NOT NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Profile extensions
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS chapter_id uuid REFERENCES chapters(id),
  ADD COLUMN IF NOT EXISTS search_scope text NOT NULL DEFAULT 'fraternity'
    CHECK (search_scope IN ('fraternity', 'chapter')),
  ADD COLUMN IF NOT EXISTS visibility_scope text NOT NULL DEFAULT 'fraternity'
    CHECK (visibility_scope IN ('chapter', 'fraternity', 'hidden')),
  ADD COLUMN IF NOT EXISTS privacy_settings jsonb NOT NULL DEFAULT '{
    "show_contact_to": "fraternity",
    "show_positions_to": "fraternity",
    "show_bio_to": "fraternity"
  }'::jsonb;

-- Expand role check if constraint exists — drop and recreate
DO $$
BEGIN
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('undergrad', 'alumni', 'admin', 'chapter_admin', 'founder', 'pending'));

CREATE INDEX IF NOT EXISTS profiles_chapter_id_idx ON profiles(chapter_id);

-- Seed SAE fraternity
INSERT INTO fraternities (slug, name, billing_tier, primary_color, accent_color)
VALUES (
  'sae',
  'Sigma Alpha Epsilon',
  'free',
  'oklch(0.32 0.16 295)',
  'oklch(0.75 0.13 78)'
)
ON CONFLICT (slug) DO NOTHING;

-- Seed CMU PA PHI chapter
INSERT INTO chapters (
  fraternity_id,
  slug,
  name,
  school_name,
  status,
  display_title,
  tagline,
  primary_color,
  accent_color
)
SELECT
  f.id,
  'cmu-paphi',
  'PA Phi',
  'Carnegie Mellon University',
  'active',
  'Sigma Alpha Epsilon PA PHI',
  'Find brothers by role or industry for referrals, mentorship, and opportunities.',
  'oklch(0.32 0.16 295)',
  'oklch(0.75 0.13 78)'
FROM fraternities f
WHERE f.slug = 'sae'
ON CONFLICT (slug) DO NOTHING;

-- Backfill all existing profiles to CMU chapter
UPDATE profiles p
SET chapter_id = c.id
FROM chapters c
WHERE c.slug = 'cmu-paphi'
  AND p.chapter_id IS NULL;

-- Promote first admin to founder, convert remaining admins to chapter_admin
WITH first_admin AS (
  SELECT id FROM profiles WHERE role = 'admin' ORDER BY created_at ASC NULLS LAST LIMIT 1
)
UPDATE profiles SET role = 'founder' WHERE id IN (SELECT id FROM first_admin);

UPDATE profiles SET role = 'chapter_admin' WHERE role = 'admin';

-- Enable RLS on new tables
ALTER TABLE fraternities ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_requests ENABLE ROW LEVEL SECURITY;

-- Fraternities: readable by authenticated users
DROP POLICY IF EXISTS fraternities_read ON fraternities;
CREATE POLICY fraternities_read ON fraternities
  FOR SELECT TO authenticated USING (true);

-- Chapters: readable by authenticated users
DROP POLICY IF EXISTS chapters_read ON chapters;
CREATE POLICY chapters_read ON chapters
  FOR SELECT TO authenticated USING (true);

-- Chapter requests: anyone can insert (public form), founder reads via service role
DROP POLICY IF EXISTS chapter_requests_insert ON chapter_requests;
CREATE POLICY chapter_requests_insert ON chapter_requests
  FOR INSERT TO anon, authenticated WITH CHECK (true);

GRANT SELECT ON fraternities TO authenticated;
GRANT SELECT ON chapters TO authenticated;
GRANT INSERT ON chapter_requests TO anon, authenticated;
