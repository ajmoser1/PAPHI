# PAPHI

Social networking platform for CMU PA PHI Chapter for mentorship, referrals, and so forth.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy `.env.example` to `.env.local` and fill in Supabase keys. See `.env.example` for Google Auth and production subdomain notes.

## Stack

- Next.js App Router
- Supabase (Auth, Postgres, RLS, Storage)
- Multi-tenant chapters via subdomain / chapter slug
