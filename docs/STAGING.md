# Staging environment

The `staging` Git branch is bound to a permanent Vercel domain, so every push to it builds and
updates the test site. Production stays on `main`. To test a change: branch from `main`, merge or
push to `staging`, check it at the staging URL, then merge to `main`.

The test URL is a subdomain of the production domain, e.g. `https://staging.yourapp.com`.
`staging`, `preview`, `dev`, `test` and `www` are reserved host labels in `src/lib/tenant.ts`,
so the staging host renders the apex site instead of looking up a chapter named "staging".

1. Vercel → Settings → Domains → add `staging.yourapp.com` and set its Git Branch to `staging`.
   For an external DNS provider, add a CNAME `staging` → `cname.vercel-dns.com`.
2. Vercel → Settings → Environment Variables: branch deployments use the **Preview** environment.
   Add each variable below for Preview and scope it to the `staging` branch so it does not leak
   into other preview builds:
   - `NEXT_PUBLIC_SITE_URL=https://staging.yourapp.com` (used for invite links)
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
     for the Supabase project staging should use (see below)
   - `NEXT_PUBLIC_FEEDBACK_EMAIL`, `ANTHROPIC_API_KEY` as needed
3. Supabase → Authentication → URL configuration → add `https://staging.yourapp.com/api/auth/callback`
   to the redirect allow list of whichever Supabase project staging points at.
4. Chapter subdomains on staging (`<slug>.staging.yourapp.com`) need a wildcard domain
   `*.staging.yourapp.com` bound to the `staging` branch; Vercel only allows wildcards when the
   domain uses Vercel's nameservers. Without it, test chapter pages on staging via the
   `chapter_slug` cookie fallback or on production.

Pointing staging at the production Supabase project means testing against live member data and
sending real emails. A separate Supabase project is safer; the free plan allows two. The repo's
migrations cannot build a database from scratch (the base schema predates them), so seed a new
project from a schema dump of production (`supabase db dump --linked -f schema.sql`) rather than
`supabase db reset`.
