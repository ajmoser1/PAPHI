# Security report: Supabase Security Advisor warnings

- **Date:** 2026-10-02
- **Author / reviewer:** Claude (Fable 5.1), for amoser
- **Scope:** The 15 `WARN` rows from the Supabase Security Advisor run of 2026-10-02 03:55 UTC: one extension placement, one permissive RLS policy, twelve `SECURITY DEFINER` function exposures (eight functions), and the Auth leaked-password setting
- **Commit reviewed:** `f0ee5bf`
- **Fix commit(s):** uncommitted
- **Status:** Fixes in code, pending deploy (migration + app deploy + one dashboard setting)

## Summary

All 14 database warnings are cleared by one idempotent migration, `supabase/migrations/20261002000000_security_advisor_warnings.sql`, plus a small app change so the home page's live counter no longer calls the stats function from the browser. None of the warnings was an active breach: the permissive policy guarded a form the app never writes through, and the exposed functions either return the caller's own data or counts. The remaining item, leaked-password protection, is an Auth dashboard toggle and must be done by hand.

The one deliberate deviation from the "revoke and re-grant" recipe is for the four RLS helper functions. Postgres evaluates policy expressions as the querying user, so `authenticated` must keep `EXECUTE` on them, and revoking it would break every policy on `profiles`, `positions`, `alumni_contact`, `conversations` and `messages`. The linter's third remedy applies instead: the helpers move to a `private` schema that PostgREST does not expose, so they disappear from `/rest/v1/rpc` while RLS keeps working.

## Scope and method

- Mapped each advisor row to the migration that created the object. Three objects (`pg_trgm`, `is_admin()`, `rls_auto_enable()`) exist only on prod and have no repo history, so the migration handles them conditionally.
- Read the linter source (supabase/splinter, lints 0014, 0024, 0028, 0029) to confirm what clears each warning. 0028/0029 look at `pg_proc.prosecdef`, `has_function_privilege(role, ...)` and whether the schema is in `pgrst.db_schemas`.
- Checked every app call site: `chapter_requests` is only written and read with the service role (`src/actions/founder.ts`, `src/app/(founder)/founder/page.tsx`); `get_platform_stats` was called server-side with the service role and from the browser with the anon key (`src/components/layout/PlatformStats.tsx`); none of the helper functions are called from app code.
- Built a local stand-in database (Postgres 18, Supabase roles and default privileges, `auth.uid()`, the tables the objects touch, the real function and policy definitions extracted from the repo's migrations, `pg_trgm` in `public` with a trigram index) and ran the four linter queries against it. Docker and `supabase start` were not available, and the repo's migrations cannot be applied to an empty database because the base schema predates them, so this fixture was the practical way to run the real lints.
- Not checked: live prod state beyond what the advisor reported, and the exact bodies of `is_admin()` and `rls_auto_enable()`.

## Findings

| ID | Severity | Finding | Status |
|---|---|---|---|
| 2026-10-02-01 | Low | `pg_trgm` installed in `public` | Fixed (pending deploy) |
| 2026-10-02-02 | Medium | `chapter_requests_insert` lets anon and authenticated insert any row | Fixed (pending deploy) |
| 2026-10-02-03 | Low | `get_platform_stats()` is `SECURITY DEFINER` and callable by anon and authenticated | Fixed (pending deploy) |
| 2026-10-02-04 | Low | `handle_new_user()` trigger function callable by anon and authenticated | Fixed (pending deploy) |
| 2026-10-02-05 | Low | Prod-only `is_admin()` and `rls_auto_enable()` callable by anon and authenticated | Fixed (pending deploy) |
| 2026-10-02-06 | Low | RLS helpers (`viewer_chapter_id`, `viewer_is_active`, `can_view_profile`, `can_message`) exposed on `/rest/v1/rpc` | Fixed (pending deploy) |
| 2026-10-02-07 | Medium | Leaked password protection disabled | Open (dashboard setting) |

### 2026-10-02-01: `pg_trgm` in `public`

- **Severity:** Low
- **Location:** Prod database (no migration installs it)
- **Issue:** The extension's functions and operators live in `public`, the API-exposed schema. Nothing in the repo uses trigram matching; `search_members` uses `ILIKE`.
- **Impact:** Advisor hygiene. Extension objects in `public` can shadow or be shadowed by user objects and are reachable through the API surface.
- **Fix:** `ALTER EXTENSION pg_trgm SET SCHEMA extensions` when it is in `public`, then `CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions` for fresh environments. Indexes keep working across the move (verified with a `gin_trgm_ops` index in the fixture).
- **Status:** Fixed (pending deploy)

### 2026-10-02-02: `chapter_requests_insert` always true

- **Severity:** Medium
- **Location:** `supabase/migrations/20250630000000_multi_tenant_foundation.sql` (policy and `GRANT INSERT`)
- **Issue:** `FOR INSERT TO anon, authenticated WITH CHECK (true)`, left over from when the start-chapter form was meant to post directly. The form's server action (`src/actions/founder.ts`) inserts with the service role, and the founder page reads with the service role, so no client needs any access.
- **Impact:** Anyone with the public anon key could insert unlimited rows into the founder's request queue, with arbitrary `contact_user_id` values, through `/rest/v1/chapter_requests`.
- **Fix:** Policy dropped and all table privileges revoked from `anon` and `authenticated` (Supabase's default grants had given them `ALL`). RLS stays enabled with no policies, so client roles are denied at both layers. A restricted policy was not kept because no client path exists to use it.
- **Status:** Fixed (pending deploy)

### 2026-10-02-03: `get_platform_stats()` callable by client roles

- **Severity:** Low
- **Location:** `supabase/migrations/20260806163000_get_platform_stats.sql`, `src/components/layout/PlatformStats.tsx`
- **Issue:** `SECURITY DEFINER` so it can count across RLS; granted to `anon` and `authenticated` because the home page polled it from the browser every 15 seconds.
- **Impact:** Returns three counts only. The risk is the pattern: a definer function on the public RPC surface.
- **Fix:** `EXECUTE` restricted to `service_role`. New route handler `src/app/api/platform-stats/route.ts` runs the existing server-side `getPlatformStats()` and the browser polls that instead. The route is added to the proxy's public list so signed-out visitors can reach it.
- **Status:** Fixed (pending deploy)

### 2026-10-02-04: `handle_new_user()` callable by client roles

- **Severity:** Low
- **Location:** `supabase/migrations/20260825210000_launch_security_hardening.sql`
- **Issue:** The `auth.users` insert trigger function had Supabase's default `EXECUTE` grants. A trigger function cannot be invoked meaningfully through RPC (PostgREST rejects trigger return types), but it still showed up on the surface.
- **Fix:** `EXECUTE` revoked from `PUBLIC`, `anon`, `authenticated`; granted to `supabase_auth_admin` where that role exists. Postgres checks `EXECUTE` on a trigger function at `CREATE TRIGGER` time, not when it fires, so signups are unaffected. Verified in the fixture: an insert into `auth.users` by a role with no `EXECUTE` still created the profile row.
- **Status:** Fixed (pending deploy)

### 2026-10-02-05: prod-only `is_admin()` and `rls_auto_enable()`

- **Severity:** Low
- **Location:** Prod database only
- **Issue:** Both are `SECURITY DEFINER` with default grants. `is_admin()` was used by four policies the 2026-10-01 audit dropped (finding 2026-10-01-15); `rls_auto_enable()` looks like an event-trigger helper.
- **Fix:** `EXECUTE` revoked from client roles if the functions exist. The pre-flight aborts the whole migration if any policy still references `is_admin()`, because revoking would break that policy for signed-in users.
- **Status:** Fixed (pending deploy)

### 2026-10-02-06: RLS helpers exposed on `/rest/v1/rpc`

- **Severity:** Low
- **Location:** `20250630130000_fix_broken_rls_isolation.sql`, `20261001000000_security_audit_fixes.sql`
- **Issue:** The four helpers are `SECURITY DEFINER` (to avoid RLS recursion) and granted to `authenticated` (required, since policies run them as the caller). Being in `public`, they were also callable as RPCs: `can_message(uuid)` would tell a signed-in user whether an arbitrary profile id is active and in their fraternity, including hidden profiles.
- **Fix:** New `private` schema (`USAGE` to `authenticated` and `service_role`, default function privileges revoked from `PUBLIC`). `ALTER FUNCTION ... SET SCHEMA private` for all four; this keeps each function's OID, so the policies and the `alumni_contact_public` view that reference them need no change. `can_view_profile` and `search_members` are re-created because their SQL bodies name the helpers as `public.*` text, which is re-resolved at call time. `search_alumni` wraps `search_members` and is unchanged. The pre-flight scans every other function body for a helper reference and aborts if one is found.
- **Status:** Fixed (pending deploy)

### 2026-10-02-07: leaked password protection disabled

- **Severity:** Medium
- **Location:** Supabase Dashboard, Authentication, Sign In / Providers, Email provider ("Prevent use of leaked passwords")
- **Issue:** Supabase Auth can reject passwords found in the HaveIBeenPwned corpus. This is off.
- **Impact:** Users can sign up with known-breached passwords.
- **Fix:** Not SQL. Turn on the toggle in the dashboard (requires the Pro plan or above). The app's own error mapping already surfaces Auth error messages, so no code change is expected; watch for the new `weak_password` error on signup after enabling.
- **Status:** Open

## Verification

Against the local stand-in database described above:

- The four linter queries returned the same 14 findings as the advisor before the migration, and no rows after it.
- `docs/security/2026-10-02-security-advisor-verify.sql`: all 16 checks PASS.
- Behaviour after the migration: an `auth.users` insert by a role without `EXECUTE` on `handle_new_user()` still created the profile; an active member sees own row plus fraternity-visible profiles and not chapter-only profiles from another chapter; `search_members` and `search_alumni` return the expected rows; `anon` and `authenticated` get "permission denied" on `chapter_requests` and `get_platform_stats()`; `service_role` can still insert requests and read stats; the trigram index stays valid and `pg_trgm` reports schema `extensions`; `pg_policies` renders the helper as `private.can_view_profile(id)`.
- Re-running the migration on an already-migrated database succeeds with only "already exists / does not exist, skipping" notices and still lints clean.
- Both pre-flight abort paths (a policy still using `is_admin()`; another function body naming a helper) stop before any change: helpers still in `public`, `pg_trgm` still in `public`.
- `docs/security/2026-10-01-post-migration-verify.sql` check 11 updated to accept the helpers in either schema; it still passes.
- `npx tsc --noEmit` passes with the app changes.

Not run: `supabase db lint` (it runs plpgsql_check, not the Security Advisor, and there is no local Supabase stack in this repo). The advisor itself must be re-run in the dashboard after deploy.

## Open items

- [ ] Run `20261002000000_security_advisor_warnings.sql` in the Supabase SQL Editor, then `2026-10-02-security-advisor-verify.sql` (all PASS), then re-run the Security Advisor. Confirm `private` is not listed under Settings, API, Exposed schemas first.
- [ ] Deploy the app change in the same window. Until the app deploys, the browser poll of `get_platform_stats` fails quietly and the home page shows the server-rendered counts without refreshing. Until the migration runs, the new route still works (service role).
- [ ] Enable leaked password protection in the Auth dashboard (2026-10-02-07).
- [ ] Optional: if prod has no index or function using `pg_trgm`, consider `DROP EXTENSION pg_trgm` in a later migration. This report moved it rather than dropping it because prod dependencies could not be inspected.

## Related

- CHANGELOG entry: [CHANGELOG.md](../../CHANGELOG.md), "Security Advisor warnings — 2026-10-02"
- Previous reports: [2026-10-01 security audit](2026-10-01-security-audit.md) (dropped the `is_admin()` policies this migration relies on; introduced `viewer_is_active` and `can_message`)
