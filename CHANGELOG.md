# Changelog

Major product and platform changes for PAPHI / Chapter Connect.
Newest first. Prefer a short **why** plus notable files; use `git log` / PRs for line-level detail.

Format inspired by [Keep a Changelog](https://keepachangelog.com/).

---

## [Unreleased] — 2026-08-09

Signup / first-session UX overhaul + founder-only preview tooling.
*(Working tree as of this entry; not yet a single git commit.)*

### Pending members (ghost) experience

- **Blurred Find a Brother** while `pending_approval`: cards load but are non-clickable; clear “approval required” overlay.
- **Chapter admin contact** for pending users (server helper bypasses RLS): name + email/phone/LinkedIn when visible, else chapter `contact_email`, else soft fallback copy.
- Replaced one-shot pending modal with a **dismissible-per-session banner** that includes admin contact.
- Member detail URL gate kept; CTAs point back to Find a Brother / profile (no “browse then surprise”).

### Profile progressive disclosure

- Pending / first-run: **essentials** (avatar, basic info, work add, contact); LinkedIn import + privacy under **Add more later**.
- After approval: dialog **“You’re approved — finish your profile”** → `/profile/edit?setup=1`.
- New column `profiles.profile_setup_completed_at` (migration + grandfather existing actives).
- Approving a member clears that field so they always get the enrichment prompt.
- **Mark setup complete** action requires at least one **displayed** contact.

### Contact rule

- Members must show ≥1 of email / phone / LinkedIn (value + visible toggle).
- Phone still required for admin verification; signup defaults `show_phone: true`.

### Copy / stuck states

- Register footer aligned with real next step.
- `/auth/pending` shows **Account not approved** for suspended/rejected instead of “Finishing setup.”

### Founder UX preview (cookie overlay)

- Founder dashboard panel: simulate **Pending approval** or **Just approved** without mutating DB.
- Purple exit banner in-app; httpOnly `ux_preview` cookie (founder-only).
- Proxy + profile helpers respect effective status for Messages / blur / prompts.

### Notable paths

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
