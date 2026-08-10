-- Tracks whether an active member finished (or soft-completed) post-approval
-- profile enrichment. Null = show the "finish your profile" prompt.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_setup_completed_at timestamptz;

COMMENT ON COLUMN public.profiles.profile_setup_completed_at IS
  'Set when the member completes post-approval profile enrichment (or soft-skips after meeting the visible-contact rule).';

-- Grandfather existing active members so only newly approved users see the prompt.
UPDATE public.profiles
SET profile_setup_completed_at = coalesce(created_at, now())
WHERE status = 'active'
  AND profile_setup_completed_at IS NULL;
