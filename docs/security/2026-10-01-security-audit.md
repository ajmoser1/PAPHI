# Security report: SQL injection, passwords, stored procedures, and full-app audit

- **Date:** 2026-10-01
- **Author / reviewer:** amoser, with Claude Code
- **Scope:** All of `src/` (server actions, route handlers, proxy, pages, components) and every file in `supabase/migrations/`
- **Commit reviewed:** `8e62d84`
- **Fix commit(s):** uncommitted at time of writing
- **Status:** Database migration applied to production on 2026-10-01; app changes pending deploy

## Summary

The three areas originally asked about are in good shape. There is no SQL injection risk, Supabase Auth hashes passwords with bcrypt, and the Postgres functions follow good practice apart from one visibility gap.

The wider audit found three High issues:
- Chapter admins could inject script through the branding color fields (stored XSS).
- The member-approval gate was cosmetic: pending accounts could see the directory.
- Two old permissive RLS policies left in the repo's migration history would cancel tenant isolation. A later review of the migration confirmed they don't exist on prod, but it found four prod-only `is_admin()` policies (on `profiles`, `companies`, `industries` and `positions`) that bypass RLS for admins (2026-10-01-15).

Thirteen of fifteen findings are fixed in code and in a new migration. Rate limiting and one privacy trade-off are deferred.

## Scope and method

- Manual review of every server action, the auth and Supabase helpers, the proxy, the auth callback, and the pages that read member data.
- Line-by-line review of all RLS policies, grants and database functions across the migration history.
- Not checked: the live production schema (`supabase db dump` needs Docker) and Supabase dashboard settings. Both are listed under open items.

## Part 1: The three requested areas

### SQL injection: protected

- The app has no raw SQL. Every query goes through `supabase-js` and PostgREST, which parameterize input.
- All database functions are static SQL with typed parameters. None use `EXECUTE` or `format()`.
- The only interpolated PostgREST filter (`.or()` in `messages/page.tsx`) uses the authenticated `user.id`, not user input.
- Minor gap: `LIKE` wildcards (`%`, `_`) weren't escaped. This wasn't injection, but it caused a data-integrity bug. See finding 2026-10-01-12.

### Password storage: protected (handled by Supabase Auth)

- Passwords are hashed with bcrypt in `auth.users.encrypted_password`. The app never stores, logs or reads them.
- Server actions pass passwords straight to `signUp`, `signInWithPassword` and `updateUser` over HTTPS.
- Dashboard settings to confirm (minimum length, leaked-password protection, MFA) are listed under open items.

### Stored procedures: used, mostly sound

| Function | Security mode | Notes |
|---|---|---|
| `search_members`, `search_alumni` | INVOKER | `search_path` pinned; anon access revoked; RLS applies. |
| `get_platform_stats` | DEFINER, anon allowed | Returns counts only. |
| `viewer_chapter_id`, `can_view_profile` | DEFINER, used by RLS | `can_view_profile` didn't check that the viewer is active (2026-10-01-02). |
| `handle_new_user` (trigger) | DEFINER | Ignores the client-supplied role. `search_path` lacked `pg_temp`. |
| `profiles_block_privilege_escalation` (trigger) | INVOKER | Good defense in depth. |

## Findings

| ID | Severity | Finding | Status |
|---|---|---|---|
| 2026-10-01-01 | High | Stored XSS through chapter branding colors | Fixed (pending deploy) |
| 2026-10-01-02 | High | Approval gate was cosmetic: pending users could read the directory | Fixed (pending deploy) |
| 2026-10-01-03 | High | Legacy permissive RLS policies never dropped | Not present on prod (dropped defensively) |
| 2026-10-01-04 | Medium | Message senders could rewrite messages or move them into other conversations | Fixed (pending deploy) |
| 2026-10-01-05 | Medium | Messaging RLS didn't enforce the "active + same fraternity" rule | Fixed (pending deploy) |
| 2026-10-01-06 | Medium | Avatar upload accepted any file type into a public bucket | Fixed (pending deploy) |
| 2026-10-01-07 | Medium | `chapters.contact_email` readable by anonymous visitors | Fixed (pending deploy) |
| 2026-10-01-08 | Medium | Any chapter admin could alter shared companies and career fields | Fixed (pending deploy) |
| 2026-10-01-09 | Low | Auth guard helpers exposed as Server Actions (`'use server'`) | Fixed (pending deploy) |
| 2026-10-01-10 | Low | Failed user-scoped writes retried with the service role | Fixed (pending deploy) |
| 2026-10-01-11 | Low | No rate limiting on public signup and paid LLM endpoints | Deferred |
| 2026-10-01-12 | Low | Unescaped `LIKE` wildcards; unbounded search page size | Fixed (pending deploy) |
| 2026-10-01-13 | Low | Pending members shown chapter admins' hidden contact details | Accepted risk |
| 2026-10-01-14 | Low | `handle_new_user` `search_path` missing `pg_temp` | Fixed (pending deploy) |
| 2026-10-01-15 | Medium–High | Prod-only `is_admin()` policies on profiles, companies, industries, positions bypass RLS | Fixed (pending deploy) |
| 2026-10-01-16 | Low | `last_message_at` trigger never worked under RLS; clients could forge message timestamps | Fixed (pending deploy) |

### 2026-10-01-01: Stored XSS through chapter branding colors

- **Severity:** High
- **Location:** `src/actions/chapter-admin.ts` (`updateChapterBranding`), `src/components/layout/TenantTheme.tsx`
- **Issue:** `primaryColor` and `accentColor` accepted any string, which was then written into a `<style>` tag with `dangerouslySetInnerHTML`. A value containing `</style>` could close the tag and add a script. The CSP allows `'unsafe-inline'` scripts, so it would run.
- **Impact:** A chapter admin (or anyone who gained that role) could run JavaScript in the session of every member of the chapter, including the founder.
- **Fix:** New `src/lib/colors.ts` allowlist: hex, plus `rgb`/`hsl`/`oklch`/`oklab` with numeric arguments only. It's enforced by zod when saving, and enforced again when rendering, so a bad value already in the database is ignored. Branding text fields now also have length limits.
- **Status:** Fixed (pending deploy)

### 2026-10-01-02: Approval gate was cosmetic

- **Severity:** High
- **Location:** `src/app/(app)/members/page.tsx`, `src/components/members/PendingMembersGate.tsx`, `can_view_profile()`
- **Issue:** Anyone can register and pick any chapter. Pending members got the real directory (names, avatars, companies) in the HTML, hidden only by CSS `blur-sm`. Separately, `can_view_profile()` never checked the viewer's status, so pending users could also query `profiles`, `positions` and `alumni_contact_public` directly through the REST API.
- **Impact:** Unapproved strangers could scrape the member directory and visible contact details.
- **Fix:** The members page skips the search for pending users, and the gate renders placeholder cards only. The new `viewer_is_active()` helper is required by `can_view_profile()`.
- **Status:** Fixed (pending deploy)

### 2026-10-01-03: Legacy permissive RLS policies

- **Severity:** High (if present on prod)
- **Location:** created in `20250630120000_profiles_view_active_members.sql`
- **Issue:** `profiles_select_active` (`USING status = 'active'`) and `positions_select_active_profiles` were never dropped. The later isolation fix dropped differently named policies. Postgres combines permissive policies with OR, so these would cancel tenant, visibility and hidden-profile rules.
- **Impact:** Any authenticated user could read every active profile and position, across fraternities and including hidden profiles.
- **Fix:** Explicit `DROP POLICY IF EXISTS` for these two and the earlier legacy names.
- **Status:** A migration review against the live schema found that neither legacy policy exists on prod. The `DROP ... IF EXISTS` statements are kept to protect other environments built from repo history. The same review found a different policy that bypasses visibility; see 2026-10-01-15.

### 2026-10-01-04: Messages could be rewritten or moved

- **Severity:** Medium
- **Location:** `20260825220000_document_messaging_rls.sql`
- **Issue:** `UPDATE` was granted on every column of `messages`, and the policy only checked `sender_id`. A sender could change `body`, or change `conversation_id` to a conversation they don't belong to.
- **Impact:** Messages injected into other people's threads; message history rewritten.
- **Fix:** Client roles can update only `messages.is_deleted`. The policy's `WITH CHECK` also re-verifies that the sender belongs to the conversation. Soft delete is one-way: only rows where `is_deleted = false` can be updated, and only to `true`. The first draft allowed undeleting; the migration review caught it.
- **Status:** Fixed (pending deploy)

### 2026-10-01-05: Messaging RLS didn't match the server action

- **Severity:** Medium
- **Location:** `src/actions/messaging.ts`, conversations and messages policies
- **Issue:** The "active members only, same fraternity" rules existed only in the server action. Direct REST calls could open conversations with anyone, including from pending accounts.
- **Fix:** New `can_message()` helper (both people active, same fraternity), required when creating a conversation *and* on every message sent. If the other person is suspended or leaves the fraternity, the thread becomes read-only. The first draft checked only at conversation creation; the migration review caught it. Messages can't be inserted already marked deleted. There's a 4,000-character cap as a database constraint (`NOT VALID`, so existing rows aren't checked) and in the action. `DELETE` and `TRUNCATE` are revoked.
- **Status:** Fixed (pending deploy)

### 2026-10-01-06: Unrestricted avatar upload type

- **Severity:** Medium
- **Location:** `src/actions/profile.ts` (`uploadAvatar`)
- **Issue:** The extension came from the client filename and the content type from the client. Files were uploaded with the service role into the public `avatars` bucket.
- **Impact:** SVG or HTML with script could be hosted on the project's storage domain.
- **Fix:** Allowlist of JPEG/PNG/WebP/GIF, checked by magic bytes. The extension comes from the verified type, and `contentType` is set explicitly.
- **Status:** Fixed (pending deploy)

### 2026-10-01-07: `chapters.contact_email` exposed

- **Severity:** Medium
- **Location:** `20260825210000_launch_security_hardening.sql` (column grants)
- **Issue:** `contact_email` was readable by `anon`. Registering with that email automatically makes the account the chapter admin (`createMemberProfile`). That's safe only while email confirmation is required.
- **Fix:** Column grants reset without `contact_email`. Every app read of it already uses the service role.
- **Status:** Fixed (pending deploy)

### 2026-10-01-08: Cross-tenant edits to shared data

- **Severity:** Medium
- **Location:** `src/actions/admin.ts`
- **Issue:** Companies and career fields are shared by every chapter, but any chapter admin could reject or merge companies and rename or delete career fields.
- **Fix:** Those actions are now founder-only. Chapter admins can still create companies and career fields and edit company details.
- **Status:** Fixed (pending deploy). This product rule is still to be confirmed; see open items.

### 2026-10-01-09: Guards exposed as Server Actions

- **Severity:** Low
- **Location:** `src/lib/auth.ts`
- **Issue:** The `'use server'` directive turned `requireAuth`, `requireChapterAdmin` and `requireFounder` into publicly callable endpoints.
- **Fix:** Replaced with `import 'server-only'`. The admin and founder guards also require `status = 'active'`, and a new `requireNotSuspended()` guards profile edits.
- **Status:** Fixed (pending deploy)

### 2026-10-01-10: Service-role retry pattern

- **Severity:** Low
- **Location:** `src/actions/profile.ts`, `src/actions/chapter-admin.ts`
- **Issue:** When a user-scoped write failed, it was retried with the service role, which silently bypassed the database guardrails.
- **Fix:** Retries removed. The service role is still used for storage (paths scoped to `userId`) and for company lookup and creation.
- **Status:** Fixed (pending deploy)

### 2026-10-01-11: No rate limiting

- **Severity:** Low
- **Location:** `submitChapterRequest` (public; creates auth users), `parseLinkedInPdf` (paid Anthropic calls; any authenticated user)
- **Fix:** Deferred. This needs a shared store such as Upstash or Vercel KV. Supabase Auth's own rate limits partly cover signup.
- **Status:** Deferred

### 2026-10-01-12: LIKE wildcards and unbounded search

- **Severity:** Low
- **Location:** `findOrCreateCompany` in `src/actions/profile.ts`, `search_members()`
- **Issue:** A company name of `%` matched an arbitrary existing company, and could backfill that company's industry. The search RPC accepted any `result_limit` and trusted the client-supplied `viewer_chapter_id`.
- **Fix:** Wildcards are escaped in both places. Page size is clamped to 1–100. The viewer's chapter comes from `viewer_chapter_id()`; the parameter is kept but ignored. Following the migration review, the function also enforces "viewer is active" and "results are in the viewer's fraternity" itself, so it stays safe even if RLS on `profiles` changes.
- **Status:** Fixed (pending deploy)

### 2026-10-01-13: Admin contact fallback for pending members

- **Severity:** Low
- **Location:** `src/lib/chapter-admins.ts`
- **Issue:** If a chapter admin has no visible contact, pending members are shown the admin's stored email and phone anyway.
- **Fix:** None. This is intentional (documented in the code) so pending members can always reach an admin.
- **Status:** Accepted risk

### 2026-10-01-14: `handle_new_user` search path

- **Severity:** Low
- **Fix:** `ALTER FUNCTION ... SET search_path = public, pg_temp`.
- **Status:** Fixed (pending deploy)

### 2026-10-01-15: Prod-only `is_admin()` policies

- **Severity:** Medium to High (depends on who `is_admin()` counts as an admin)
- **Location:** live database only; these aren't in the repo's migration history. All are granted `TO public`:
  - `profiles`: "Admins can view all profiles" (SELECT, `is_admin()`)
  - `companies`: "Admins can manage companies" (ALL)
  - `industries`: "Admins can manage industries" (ALL)
  - `positions`: "Admins can manage all positions" (ALL)
- **Issue:** Found by the migration review and confirmed with `pg_policies`. Permissive policies are combined with OR, so these exempt admins from tenant, visibility and hidden-profile rules. The `ALL` policies also let admins create, edit or delete *any* company, career field or member's job history directly through the REST API, which bypasses the founder-only checks in `src/actions/admin.ts`.
- **Impact:** An admin account could read every profile on the platform, rewrite or delete other members' positions, and alter or delete shared catalog data.
- **Fix:** All four dropped in the migration. The `is_admin()` function is left in place. The app doesn't depend on these policies:
  - Admins read their own profile through `profiles_select_own`.
  - Company and career-field writes, and the admin company listing, use the service role.
  - Career-field reads use the general member read policy.
  - Members edit only their own positions.
- **Verification:** on a local database with stand-in copies of these policies, all four were removed. Members could still read companies and career fields, and direct REST updates and deletes of companies and career fields were blocked.
- **Status:** Fixed (pending deploy)

### 2026-10-01-16: `last_message_at` trigger and client-supplied timestamps

- **Severity:** Low (integrity and functionality)
- **Location:** prod-only trigger `messages_update_conversation` → `update_conversation_last_message()`; client `INSERT` grants on `messages` and `conversations`
- **Issue:** The first prod run was stopped by the migration's trigger gate. The trigger function ran with the sender's privileges, and with no `UPDATE` policy on `conversations` its update silently matched 0 rows. Prod showed 5 of 5 conversations with `last_message_at` never set, so the inbox's most-recent-first sort never worked. Separately, clients could insert any `id`, `created_at` or `is_deleted` value, which allowed backdated messages.
- **Fix:**
  - The function is now `SECURITY DEFINER`, with the same body, a schema-qualified table, a pinned `search_path`, and `EXECUTE` revoked from client roles.
  - A one-time backfill sets `last_message_at` from each conversation's latest message, filling `NULL`s only.
  - Client `INSERT` is limited to the columns the app sends (`participant_a`, `participant_b` and `conversation_id`, `sender_id`, `body`), so timestamps and IDs always come from database defaults.
  - The trigger gate now runs after the fix, so it still aborts on any *other* trigger like this one.
- **Verification:** on a stub with prod's exact function and trigger, the before state reproduced 5 of 5 never updated; afterwards 0. The backfill matched each conversation's latest message, new messages update `last_message_at`, and forged `created_at`, `id` or `last_message_at` are denied. An additional ordinary trigger still aborts the script, with full rollback.
- **Status:** Fixed (pending deploy)

### Chapter column grants and `PUBLIC`

The migration review also noted that a table-level `SELECT` granted to `PUBLIC` would override the column grants on `chapters`. The migration now revokes from `PUBLIC` as well. The review also raised a `select('*')` concern; the only `select('*')` on `chapters` (`admin/customize/page.tsx`) uses the service role, so it isn't affected.

## Changed files

- New: `src/lib/colors.ts`, `supabase/migrations/20261001000000_security_audit_fixes.sql`
- Modified: `src/lib/auth.ts`, `src/actions/admin.ts`, `src/actions/chapter-admin.ts`, `src/actions/messaging.ts`, `src/actions/profile.ts`, `src/app/(app)/members/page.tsx`, `src/components/members/PendingMembersGate.tsx`, `src/components/layout/TenantTheme.tsx`, `src/components/profile/AvatarUpload.tsx`

## Verification

- **Migration:** applied to a throwaway local Postgres 18 with a stub Supabase schema, on top of the earlier RLS migrations. It applied cleanly, and a second run also succeeded.
- **RLS checks** (pending user, active user, other-fraternity user):
  - Pending user sees only their own profile, 0 contacts and 0 search results, and can't create a conversation.
  - Active user sees same-fraternity members only, and can read masked contacts.
  - Conversations with another fraternity are denied. Same-fraternity conversations and messages work.
  - A 5,000-character message is rejected by the constraint.
  - Changing `conversation_id` or `body` gets "permission denied". Soft delete works, and another user can't soft-delete it.
  - `contact_email` is denied to `anon` and `authenticated`; the other chapter columns are still readable.
  - `search_members('_')` returns 0, confirming the wildcard is escaped, and a `result_limit` of 100,000 is clamped.
- **Color allowlist:** the real seeded values (`#5b21b6`, `oklch(0.32 0.16 295)`) are allowed. The `</style>` breakout, `;}` rule injection, `url()` and `expression()` payloads are all blocked.
- **Second pass (after the migration review):** re-applied on a fresh database, twice.
  - The "Admins can view all profiles" stand-in policy and the `PUBLIC` `SELECT` grant are both removed.
  - `search_members` returns 0 rows for a pending viewer, and only same-fraternity active members for an active viewer, *even with RLS bypassed* (run as superuser).
  - Undeleting a message is denied (`UPDATE 0`), and inserting a message already marked deleted is denied.
  - Sending to a participant who is now suspended is denied, and works again once they're reactivated.
- **Third pass (second migration review):** the stub was seeded with `PUBLIC` `UPDATE`/`DELETE`/`TRUNCATE` grants on `messages` and `conversations`, plus leftover column grants on `chapters.contact_email` and `invite_token`.
  - After the migration, every sensitive privilege is false for `anon` and `authenticated`, and `is_deleted` is still updatable.
  - `search_members` runs with `search_path = public, pg_temp`.
  - A drifted `search_members` (different return columns) makes the pre-flight abort with a clear message, and nothing is applied.
  - Confirmed in Postgres that a table-level `REVOKE` also removes that role's column-level grants, and that `PUBLIC` grants were the real gap.
- **Fourth pass (third migration review):** every existing `messages` column now has its `UPDATE` explicitly revoked, using a loop over the live column list. It no longer relies on the documented rule that a table-level `REVOKE` also removes column grants. Tested with column-level `UPDATE` grants on every column for `authenticated`, `PUBLIC` and `anon`, plus an extra prod-only column. Afterwards the only client-updatable column was `authenticated | is_deleted`. A post-run check now lists every updatable column.
- **Fifth pass (fourth migration review):**
  - **Pre-flight now aborts** if RLS is disabled on any affected table, or if `conversations` or `messages` has a permissive policy the script doesn't know about. Both were tested: each aborts with a message naming the table or policy, and nothing is applied. A restrictive policy is still allowed.
  - **Full privilege reset:** privileges on `chapters`, `messages` and `conversations` are reset at table level and column by column (live column list) for `PUBLIC` and `anon`, plus `authenticated` where relevant. Explicit re-grants follow, including `service_role`.
  - **Messy-prod test:** a stub with 72 unexpected client privileges went to 0 according to the allowlist audit query from the post-run checks. `service_role` and normal messaging kept working.
  - **Length cap:** it now exempts deleted rows, so a legacy message over 4,000 characters can still be soft-deleted. Verified, along with the cap still rejecting new 5,000-character messages.
- **Sixth pass (fifth migration review):**
  - **All five messaging policies are now dropped and recreated** with canonical definitions, so an existing policy with an expected name but a broader rule can't survive. Tested by replacing both "view" policies with `FOR ALL USING (true)`: an outsider went from seeing the conversation to seeing nothing, and participants were unaffected.
  - **Client `UPDATE` on `conversations` is revoked.** A new pre-flight check aborts if a trigger on `messages` that isn't `SECURITY DEFINER` writes to `conversations`, since that trigger would break once `UPDATE` is revoked. Tested both ways: an ordinary trigger aborts the script; a `SECURITY DEFINER` trigger still updates `last_message_at` while direct client updates are denied.
  - **The length cap can't evaluate to `NULL`**, so a `NULL` or empty body is rejected for live messages even if prod's `body` column is nullable. Legacy `NULL`-body messages can still be soft-deleted.
- **App:** `npx tsc --noEmit` and `npm run build` pass.
- **Not verified:** the app running against the production Supabase project.

## Open items

- [x] Recorded the current definitions of the `is_admin()` policies being dropped: all four use `qual = is_admin()`, `roles = {public}`, and the `ALL` ones also have `with_check = is_admin()`.
- [ ] Optional, for the record: `select pg_get_functiondef('public.is_admin()'::regprocedure);` to note which roles `is_admin()` treats as admin.
- [x] Run [`2026-10-01-pre-migration-snapshot.sql`](2026-10-01-pre-migration-snapshot.sql) on prod (read-only) and download the result as CSV. It's the restore point for the policies, functions and grants the migration replaces. The SQL Editor's "destructive operations" warning is expected: it's triggered by `DROP POLICY`, `REVOKE` and `ALTER`; no table or row is dropped or deleted.
- [x] **2026-10-01:** applied to production (second attempt; the first was safely aborted by the trigger gate, see 2026-10-01-16). Applied `20261001000000_security_audit_fixes.sql` to production by pasting the whole file into the SQL Editor. It already contains `BEGIN;` / `COMMIT;`, a pre-flight check and a 5-second lock timeout, so any failure applies nothing. It's idempotent. Afterwards, run the post-run checks at the bottom of the file.
- [ ] Run the `pg_policies` query below on prod and confirm no other permissive `SELECT` policies exist on `profiles`, `positions` or `alumni_contact`:
  ```sql
  select tablename, policyname, cmd, roles, qual from pg_policies
  where schemaname = 'public' and cmd in ('SELECT','ALL') order by tablename;
  ```
- [ ] Check the `avatars` bucket for non-image files that are already uploaded, and remove any:
  ```sql
  select name, metadata->>'mimetype' from storage.objects
  where bucket_id = 'avatars'
    and metadata->>'mimetype' not in ('image/jpeg','image/png','image/webp','image/gif');
  ```
- [ ] Recommended: rehearse on a non-production copy first (a Supabase branch, or a second project restored from a prod backup), then apply to prod.
- [ ] Validate admin workflows after the `is_admin()` policies are dropped:
  - Approvals: approve, reject and remove a member.
  - Promote a chapter admin.
  - Companies: create, edit, and confirm hide/merge is founder-only.
  - Career fields: create, and confirm rename/delete is founder-only.
  - Branding save.
  - Founder: approve a chapter request and assign an admin.
- [x] Ran [`2026-10-01-post-migration-verify.sql`](2026-10-01-post-migration-verify.sql) on prod: 11 of 12 PASS. Check 5 found `authenticated` still had `REFERENCES` (and `TRIGGER`) on `messages` and `conversations`, from Supabase's default grants, which the migration didn't revoke. This isn't exploitable through the API (it requires DDL), but it was removed anyway. The test stub had missed it because its default grants were applied before the messaging tables existed; the stub now mirrors Supabase's defaults, and check 6 now also covers `REFERENCES` and `TRIGGER`.
- [x] **2026-10-01:** ran follow-up [`20261001010000_revoke_messaging_references_trigger.sql`](../../supabase/migrations/20261001010000_revoke_messaging_references_trigger.sql) on prod, then re-ran the verify query: **all 12 PASS** on prod.
- [ ] Smoke-test after deploying, since the service-role retries are gone:
  - Edit your profile.
  - Add, edit and delete a position.
  - Save contact info and change its visibility.
  - Upload and remove an avatar.
  - Save privacy settings and chapter branding.
  - Send a message and approve a member.
  - Confirm a pending account sees placeholders on `/members`.
- [ ] Supabase dashboard settings:
  - Keep "Confirm email" **on**.
  - Minimum password length of 8 or more with complexity rules.
  - Enable leaked-password protection.
  - Enable MFA for the founder.
  - Restrict the `avatars` bucket's MIME types and set a 5 MB limit.
- [ ] Decide whether founder-only control of shared companies and career fields (2026-10-01-08) is the right product rule.
- [ ] Decide on rate limiting (2026-10-01-11).
- [ ] Commit the fixes and record the SHA in this report's header.

## Related

- CHANGELOG entry: "Security audit fixes — 2026-10-01" in [`CHANGELOG.md`](../../CHANGELOG.md)
- Previous reports: none (first archived report). Earlier hardening is described in the "Launch security hardening" CHANGELOG entry and `20260825210000_launch_security_hardening.sql`.
