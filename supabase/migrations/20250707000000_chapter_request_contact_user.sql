-- Link chapter requests to the account created at signup time so approval can
-- promote an existing user instead of sending a passwordless invite email.

ALTER TABLE chapter_requests
  ADD COLUMN IF NOT EXISTS contact_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS chapter_requests_contact_user_id_idx
  ON chapter_requests(contact_user_id);
