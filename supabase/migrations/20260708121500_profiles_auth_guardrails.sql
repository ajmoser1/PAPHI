-- Keep profiles/auth in sync and prevent "active but undiscoverable" rows.
-- 1) Clean up legacy rows that can never behave correctly in app flows.
-- 2) Enforce profiles.id -> auth.users(id) to prevent future orphans.
-- 3) Enforce minimum requirements for active profiles used by directory search.

-- Backfill nullable legacy values.
UPDATE public.profiles
SET visibility_scope = 'fraternity'
WHERE visibility_scope IS NULL;

UPDATE public.profiles
SET search_scope = 'fraternity'
WHERE search_scope IS NULL;

UPDATE public.profiles
SET role = 'undergrad'
WHERE status = 'active'
  AND role = 'pending';

-- Active members without a chapter cannot appear in search_members (JOIN chapters).
UPDATE public.profiles
SET status = 'suspended'
WHERE status = 'active'
  AND chapter_id IS NULL;

-- Active rows without a backing auth account are orphaned and should not be active.
UPDATE public.profiles p
SET status = 'suspended'
WHERE p.status = 'active'
  AND NOT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = p.id
  );

-- Enforce one-to-one profile/auth lifecycle.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- Active profiles must be fully assignable to a chapter and visible to peers.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_active_requires_chapter_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_active_requires_chapter_check
  CHECK (status <> 'active' OR chapter_id IS NOT NULL);

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_active_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_active_role_check
  CHECK (status <> 'active' OR role <> 'pending');
