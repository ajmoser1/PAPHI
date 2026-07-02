-- Remember the requesting contact's email on the chapter itself so that when
-- they register through their chapter's invite link, we can automatically
-- promote them to chapter_admin instead of leaving them stranded as a
-- pending regular member with no way to administer the chapter they founded.
-- Named contact_email (not founder_email) to avoid collision with the
-- platform-level `founder` role, which is reserved for the site owner.

ALTER TABLE chapters
  ADD COLUMN IF NOT EXISTS contact_email text;
