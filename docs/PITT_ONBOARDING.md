# Pitt Onboarding — End-to-End Test Plan

Use this checklist to validate the Pitt-ready milestone after applying migrations.

## Prerequisites

1. Run Supabase migrations in order (`supabase/migrations/20250630000000_*.sql` and later).
2. Confirm your account has `role = 'founder'` (migration promotes first admin automatically).
3. Set `NEXT_PUBLIC_SITE_URL` for your deployment domain.

## Test flow

### 1. Chapter request (Pitt)

1. Visit `/start-chapter` on the apex domain.
2. Submit: Chapter **Pitt**, School **University of Pittsburgh**, contact info.
3. As founder, visit `/founder` — Pitt request appears as pending.

### 2. Approve chapter

1. Click **Approve** on the Pitt request.
2. Verify new chapter appears with slug `pitt-university-of-pittsburgh` (or similar).
3. Copy the invite link shown on the founder dashboard.

### 3. Assign Pitt chapter admin

1. Have Pitt admin register at `/auth/register` (or use existing account).
2. In founder dashboard, enter their email and click **Assign admin**.

### 4. Customize branding

1. Pitt admin signs in, visits `/admin/customize`.
2. Update display title, colors, tagline.
3. Confirm chapter subdomain landing reflects new branding.

### 5. Member registration (ghost mode)

1. Brother opens invite link: `/auth/register?invite={token}`.
2. Registers → lands on `/profile/edit` (not blocked).
3. Completes profile including **phone number**.
4. Can browse `/members` but cannot access `/messages`.
5. Cannot see contact info on other profiles.

### 6. Admin approval

1. Pitt admin visits `/admin/approvals`.
2. Sees pending user with **phone number** displayed.
3. Approves account.

### 7. Full access

1. Approved brother can message members.
2. Appears in search results.
3. Can see contact info per privacy settings.

### 8. Cross-chapter (CMU ↔ Pitt)

1. CMU user sets search scope to **All chapters** (toggle in nav).
2. Pitt brothers appear in search with chapter badge.
3. CMU user can message Pitt brother (same fraternity).
4. Toggle **My chapter only** — Pitt brothers hidden.

## Subdomain notes (production)

- Configure wildcard DNS: `*.yourapp.com`
- Add wildcard domain in Vercel project settings
- `cmu-paphi.yourapp.com` → CMU branding
- `pitt-university-of-pittsburgh.yourapp.com` → Pitt branding
- Apex `yourapp.com` → platform marketing + Start a Chapter
