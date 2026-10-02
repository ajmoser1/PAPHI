# Changelog

Major product and platform changes for PAPHI / Chapter Connect.
Newest first. Prefer a short **why** plus notable files; use `git log` / PRs for line-level detail.

Format inspired by [Keep a Changelog](https://keepachangelog.com/).

---

## [Unreleased] — 2026-08-09

Signup / first-session UX overhaul + founder-only preview tooling + Profile/Settings split + live Find a Brother search.

### Security Advisor warnings — 2026-10-02

Clears all 14 database warnings from the Supabase Security Advisor in one migration. Why: keep the advisor at zero so real regressions stand out, and shrink what the public anon key can reach. Report: [`docs/security/2026-10-02-security-advisor-warnings.md`](docs/security/2026-10-02-security-advisor-warnings.md).

- **RLS helpers moved to a `private` schema** (`viewer_chapter_id`, `viewer_is_active`, `can_view_profile`, `can_message`). Policies keep working (same function OIDs); the helpers just stop being callable as `/rest/v1/rpc/*`. `search_members` re-created to reference `private.*`.
- **`chapter_requests` is service-role only:** the always-true anon/authenticated INSERT policy and client grants are gone. The start-chapter form already inserted via the server action.
- **`get_platform_stats` restricted to the service role;** the home page's live counter now polls `/api/platform-stats` (new route handler) instead of the RPC.
- `handle_new_user`, prod-only `is_admin` and `rls_auto_enable`: EXECUTE revoked from client roles. `pg_trgm` moved from `public` to `extensions`.
- Still manual: enable leaked password protection in the Auth dashboard.
- Notable: `supabase/migrations/20261002000000_security_advisor_warnings.sql`, `docs/security/2026-10-02-security-advisor-verify.sql`, `src/app/api/platform-stats/route.ts`, `src/components/layout/PlatformStats.tsx`, `src/proxy.ts`

### Public Privacy Policy and Terms pages — 2026-10-02

Needed for Google OAuth brand verification (so the consent screen says "Chapter Connect" instead of the Supabase project domain). Why: Google requires public privacy and terms URLs on the app's own domain.

- New public routes `/privacy` and `/terms` under `src/app/(legal)/` with their own readable layout; allowed in `proxy.ts` without auth.
- Content reflects what the app actually does: phone collected for admin verification, member-controlled contact visibility, Supabase / Vercel / Google / Anthropic (optional LinkedIn PDF import) as processors, Google API Services User Data Policy statement.
- Operator name, contact email, governing law and effective date live in `src/lib/legal.ts`; contact email falls back to `NEXT_PUBLIC_FEEDBACK_EMAIL`.
- Footer links on the landing page and auth pages; "By continuing you agree…" line on register, complete-signup and start-chapter.

### Signup & onboarding UX / accessibility pass — 2026-10-01

Fixes from a UX audit of register → confirm → complete-signup → pending profile. Why: three dead ends were costing sign-ups, and no form error in the flow was reachable by assistive tech.

- **No more re-typing after email confirmation:** register stores phone, class year, role, chapter and invite token in user metadata (prefill only; server re-validates, `handle_new_user` still ignores it) and sets `emailRedirectTo` to our callback with the invite token, so complete-signup comes back pre-filled. Success state is now a green "Check your email" card instead of a red message over a live form.
- **Broken invite links fall back to the chapter list** instead of failing at submit (`MembershipFields`).
- **Submitted values survive a failed submit** (`AuthState.values`), since React 19 resets `<form action>` after the action runs.
- **Friendly auth errors with recovery actions:** "Email not confirmed" offers *Resend confirmation email* (`resendConfirmation` action); expired reset links offer a new one; "already registered" links to sign in (`lib/auth-errors.ts`).
- **Accessible forms:** new `ui/form-field.tsx` (`FormField`, `PasswordField`, `SelectField`, `FormAlert`) wires `aria-invalid` / `aria-describedby`, inline errors, a focusable `role="alert"` summary that links to each field and takes focus after a failed submit, show/hide password toggles, and `autoComplete` on every field. Role picker is a real `<fieldset>`/`<legend>`.
- **CTA hierarchy and touch targets:** primary buttons and inputs are 44px on touch / 40px with a pointer; "Request to start it" demoted from a full-width button to a link; login's "Create an account" is now an outline button under a "New here?" label.
- Complete-signup caption now reflects the real provider (no more "Signed in with Google" for email users); card titles render as `<h1>`; auth layout has a `<main>`; per-page `<title>`s via a root title template.
- Mobile nav toggle has an accessible name and `aria-expanded`; pending banner hides its "Set up profile" button on `/profile/edit`; pending profile page is titled "Set up your profile" and links out to Find a Brother.
- `/start-chapter` moved under the `(auth)` route group (same URL) so it shares the branded layout; fixed a literal `&apos;` in its success copy; added a back link.
- `/auth/pending` "Finishing account setup" has a *Check again* button instead of asking users to refresh.
- Notable: `src/actions/auth.ts`, `src/components/ui/form-field.tsx`, `src/components/auth/MembershipFields.tsx`, `src/app/(auth)/**`

### Security audit fixes — 2026-10-01

- **Stored XSS closed:** chapter branding colors are allowlisted (hex / `rgb` / `hsl` / `oklch`) on save and re-validated before rendering into `<style>` (`src/lib/colors.ts`, `TenantTheme.tsx`).
- **Approval gate enforced:** pending members no longer receive directory rows (the blurred grid is placeholder-only), and RLS `can_view_profile` now requires an *active* viewer. Legacy permissive `profiles_select_active` / `positions_select_active_profiles` policies dropped.
- **Messaging RLS:** conversations require both participants active + same fraternity (`can_message`); messages are soft-delete-only (column grant on `is_deleted`), so they can't be rewritten or moved into other threads; 4,000-char cap.
- **Avatar uploads:** JPEG/PNG/WebP/GIF only, verified by magic bytes; extension/content type are set server-side.
- `chapters.contact_email` hidden from client roles; `search_members` escapes LIKE wildcards, clamps page size to 100, and derives the viewer chapter server-side.
- Founder-only: reject/merge companies and rename/delete career fields (shared across all chapters).
- `lib/auth.ts` is `server-only` (was `'use server'`); removed service-role write fallbacks; suspended accounts can't edit profiles; admin/founder guards require `status = active`.
- Notable: `supabase/migrations/20261001000000_security_audit_fixes.sql`
- Avatar storage lockdown: dropped client write policies on the `avatars` bucket and limited it to images up to 5 MB (`20261001020000_avatar_storage_lockdown.sql`).
- Full report: [`docs/security/2026-10-01-security-audit.md`](docs/security/2026-10-01-security-audit.md) · commit `bb9e0c9`

### Launch security hardening

- Block privilege escalation: authenticated users can no longer UPDATE `profiles.role` / `status` / `chapter_id` (column grants + trigger); `handle_new_user` always seeds `pending`.
- Contact privacy enforced in DB: peer reads go through `alumni_contact_public` (SECURITY DEFINER + masking); base-table peer SELECT policy removed.
- Chapter `invite_token` hidden from client SELECT; invite resolution stays on service-role server paths.
- Revoke `anon` EXECUTE on `search_members` / `search_alumni`.
- Applied engineering career-field split on prod; documented messaging RLS in repo.
- Notable: `supabase/migrations/20260825210000_launch_security_hardening.sql`, `20260825220000_document_messaging_rls.sql`

### Companies & career fields

- Member position save **sets / backfills** `companies.industry_id` when a career field is chosen (fixes industry→company filter narrowing for organically created companies).
- Admin **Companies**: edit name/industry/website/status, soft-hide (`rejected`), restore, and **merge** duplicates (reassign positions).
- Admin **Career fields** (renamed from Industries): rename, delete when unused; usage counts shown.
- Split broad **Engineering** into Software / Computer / Electrical / Mechanical / Civil / Other Engineering; remap legacy rows; one-time backfill of company industries from positions (`20260825000000_split_engineering_industries.sql`).
- Member + directory copy clarifies **Career field** (role) vs company catalog industry default.

### Find a Brother — live search & sort

- Filters update without a Search button: debounced text (~300ms); industry, company, alumni, and sort apply immediately.
- Sort options: Name A–Z (default), class year oldest→newest, class year newest→oldest, chapter.
- Company dropdown narrows when an industry is selected; result count always shown.
- RPC: `search_members` / `search_alumni` accept `sort_by` (`20260812000000_search_members_sort_by.sql`).
- Moved All chapters / My chapter toggle under the search filters; removed the global white top-bar strip.
- Search input suggests company and career-field names via browser datalist.
- First-visit welcome strip on Find a Brother (dismissible per session); Settings **Questions or feedback** mailto card (`NEXT_PUBLIC_FEEDBACK_EMAIL`).

### Profile vs Settings

- **Profile** (`/profile/edit`): avatar, basic info, work experience, contact values only.
- **Settings** (`/settings`): privacy audiences, contact visibility toggles, default search scope, account email + password reset link.
- Sidebar **Settings** nav item for pending and active members.

### Pending members (ghost) experience

- **Blurred Find a Brother** while `pending_approval`: cards load but are non-clickable; clear “approval required” overlay.
- **Chapter admin contact** once on Find a Brother (email + phone + LinkedIn when available); top banner is status-only.
- Replaced one-shot pending modal with a **dismissible-per-session banner**.
- Member detail URL gate kept; CTAs point back to Find a Brother / profile (no “browse then surprise”).

### Profile progressive disclosure

- Pending / first-run: **essentials** (avatar, basic info, work add, contact); LinkedIn import under **Add more later**; privacy moved to Settings.
- After approval: dialog **“You’re approved — finish your profile”** → Profile (and Settings link).
- New column `profiles.profile_setup_completed_at` (migration + grandfather existing actives).
- Approving a member clears that field so they always get the enrichment prompt.
- Setup completes automatically when the member saves contact with ≥1 method visible.

### Contact rule

- Members must show ≥1 of email / phone / LinkedIn (value + visible toggle).
- Phone still required for admin verification; signup defaults `show_phone: true`.
- **Approval blocked** until a visible contact exists (server check + disabled Approve in admin Members UI).
- Failed contact save during signup rolls membership back to incomplete so stubs are not approvable.
- Active undergrad/alumni missing a visible contact see a **non-dismissible** prompt until they add one.

### Copy / stuck states

- Register footer aligned with real next step.
- `/auth/pending` shows **Account not approved** for suspended/rejected instead of “Finishing setup.”

### Founder UX preview (cookie overlay)

- Founder dashboard panel: simulate **Pending approval** or **Just approved** without mutating DB.
- Purple exit banner in-app; httpOnly `ux_preview` cookie (founder-only).
- Proxy + profile helpers respect effective status for Messages / blur / prompts.

### Notable paths

- `src/actions/profile.ts` (company find-or-create + industry backfill)
- `src/actions/admin.ts` (company/industry CRUD, merge, soft-hide)
- `src/components/admin/CompanyAdminList.tsx`, `IndustryAdminList.tsx`
- `supabase/migrations/20260825000000_split_engineering_industries.sql`
- `src/app/(app)/settings/page.tsx`
- `src/components/settings/*`
- `src/components/members/MembersSearchBar.tsx`
- `supabase/migrations/20260812000000_search_members_sort_by.sql`
- `supabase/migrations/20260810010000_profile_setup_completed_at.sql`
- `src/lib/chapter-admins.ts`, `src/lib/contact.ts`, `src/lib/ux-preview.ts`
- `src/components/members/PendingMembersGate.tsx`
- `src/components/layout/PendingApprovalBanner.tsx`, `PostApprovalSetupNotice.tsx`, `UxPreviewBanner.tsx`
- `src/components/founder/UxPreviewPanel.tsx`
- `src/app/(app)/members/page.tsx`, `profile/edit/page.tsx`, `(founder)/founder/page.tsx`

---

## 2026-08-09 — Google signup chapter assignment

- Fixed Google sign-ups not assigning a chapter / incomplete stub profiles.
- `isMembershipIncomplete`, proxy + OAuth callback routing to complete-signup.
- Trigger reads Google given/family name (`20260810000000_handle_new_user_google_names.sql`).
- Commit: `2762a69`

---

## 2026-08-06 — Google login & invite polish

- Added Google OAuth login / complete-signup path. (`831e236`)
- Pending user info for admins + personalized invite copy via invite links. (`fbecee9`)
- Platform stats / data on login screen. (`f282c30`)

---

## 2026-07-28 — Onboarding fixes

- Repeated onboarding / registration flow fixes. (`0da5200`, `5689080`)

---

## 2026-07-07–08 — Registration, branding, metadata

- Registration flow changes and chapter signup fixes. (`2618abc`, `a133380`, `2a0785d`)
- Personal / chapter branding. (`4f876e4`)
- Metadata updates. (`b1f3d6d`)

---

## 2026-07-01 — Founder chapter registration login

- Fixed chapter registration so founders can log in after setup. (`92a0d9a`)

---

## 2026-06-30 — Multi-tenant + ghost onboarding foundation

- Multi-tenant SAE platform, ghost onboarding, chapter management. (`b18deec`)
- Invite links use full site URL from `NEXT_PUBLIC_SITE_URL`. (`5764e24`)
- Ghost registration when profile row missing; redirect-loop / profile registration fixes. (`c4d8272`, `1d9c4b3`, `59f1908`)
- Featured job on profile; profile 404 fixes. (`e07f41d`, `99ef080`)

---

## 2026-06-29 — Profiles, LinkedIn, members consolidation

- LinkedIn PDF import + edit past work experiences. (`c33c044`, `07c7364`, `e2b1ec0`, …)
- Consolidated alumni and member pages. (`ae303d7`)
- Password recovery; all-members display of experience. (`b6d92bf`, `1b46ebf`)
- Profile photo removable; DB mismatch fix. (`83569a2`, `31370fd`)
- Vercel build: removed duplicate middleware. (`fd823d0`)

---

## Earlier (selected)

- Admin: view/remove accepted profiles; pending-approval bugs. (`6f674af`, `77b579d`)
- Messaging UX (chat button placement / clarity). (`a31a4dc`, `728afa3`)
- Search fix; Vercel analytics. (`562335c`, `d215336`)
- Project notes: `reflection.md`, `promptlog.md`. (`7070fb3`, `a37a997`)

---

## How to update this file

1. After a **major** feature or UX ship (not every typo fix), add a dated section at the top under `[Unreleased]` or promote Unreleased into a dated release.
2. One short paragraph + bullets is enough; link commit SHAs when known.
3. Keep `promptlog.md` / `reflection.md` for narrative; this file is the **product change index**.
