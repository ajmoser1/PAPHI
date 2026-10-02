-- Avatar storage lockdown (2026-10-01).
-- Report: docs/security/2026-10-01-security-audit.md (finding 2026-10-01-17)
--
-- Prod had two storage policies letting any signed-in user INSERT / UPDATE files in
-- their own avatars/<uid>/ folder directly through the Storage API. That bypasses
-- the image checks in uploadAvatar (src/actions/profile.ts), so a user could host
-- SVG/HTML with script in the public bucket. The app never uploads from the
-- browser: upload, list and delete all run server-side with the service role,
-- which doesn't need these policies.
--
-- 1) Drop both client write policies (public bucket: viewing avatars needs no policy).
-- 2) Bucket limits, enforced by Supabase on every upload (service role included):
--    raster image types only, 5 MB (matches the app's own limit).
--
-- HOW TO RUN: paste into the Supabase SQL Editor and run. Single transaction,
-- idempotent. Changes only storage policies and bucket settings; no files are
-- deleted. If DROP POLICY fails with "must be owner of table objects", delete the
-- two policies in Dashboard -> Storage -> Policies instead, then re-run (the rest
-- will apply).

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars') THEN
    RAISE EXCEPTION 'Avatar lockdown aborted, nothing applied. Bucket "avatars" not found.';
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    file_size_limit = 5 * 1024 * 1024
WHERE id = 'avatars';

COMMIT;

-- ---------------------------------------------------------------------------
-- Post-run checks (read-only)
-- ---------------------------------------------------------------------------
-- Expect 0 rows: no client-facing policy on storage.objects mentions avatars.
--   select policyname, cmd, roles, qual, with_check from pg_policies
--   where schemaname = 'storage' and tablename = 'objects'
--     and (coalesce(qual, '') ilike '%avatars%' or coalesce(with_check, '') ilike '%avatars%');
--
-- Expect: public = true, the 4 image types, 5242880:
--   select id, public, allowed_mime_types, file_size_limit from storage.buckets where id = 'avatars';
--
-- Expect 0 rows: no non-image files already uploaded (delete any that appear,
-- via Dashboard -> Storage -> avatars):
--   select name, metadata->>'mimetype' as mimetype from storage.objects
--   where bucket_id = 'avatars'
--     and coalesce(metadata->>'mimetype', '') not in ('image/jpeg','image/png','image/webp','image/gif');
