# Chapter Connect

A private directory for fraternity chapters, built so brothers can find each other for referrals, mentorship, and warm introductions.

Every chapter gets its own space, with its own name, colors, and admin, and members can search their chapter or every chapter in the fraternity. It started as PA PHI, the Sigma Alpha Epsilon chapter at Carnegie Mellon, and now any chapter can join.

## What you can do

**Find a brother.** Search the directory by name, company, or career field. Filter to alumni, sort by class year, and switch between your chapter and all chapters. Members with a job listed come first, so the people who can actually refer you are at the top.

**Ask for a referral or intro.** Message anyone in the directory. Every profile has a message starter with templates for a referral request, career advice, or just saying hello. Brothers who message you are pinned to the top of Find a Brother until you reply.

**Be findable.** Add your photo, current job, and career field so the next brother looking for someone at your company finds you. A completeness card shows what's missing and why it matters. You can also import your work history from a LinkedIn PDF.

**Control what's visible.** Choose who can find you in search, who sees your bio, and which contact details (phone, email, LinkedIn) other members can see. Your chapter admin always sees your phone to confirm you're a real brother; nobody else does unless you say so.

## How membership works

1. A brother registers with an invite link from their chapter (or signs in with Google).
2. They add a photo and their chapter, class year, and whether they're an undergrad or alumni.
3. A chapter admin reviews the request and approves it. Until then, the directory stays locked.
4. Once approved, the member can search, message, and be found.

Photos are required for every member, so the directory is always faces, not placeholders.

## For chapter admins

The admin dashboard is one page: pending approvals, the member list, chapter branding (name, tagline, colors, with a live preview), and the shared lists of companies and career fields. A copyable invite link brings new brothers in.

The platform founder uses the same dashboard to approve new chapter requests, copy invite links for any chapter, and assign chapter admins.

Any chapter can request its own space from the landing page. Approval creates the chapter and makes the requester its first admin.

## Privacy

Chapter Connect is invite-only and runs no ads. Data is never sold. Members control their own contact visibility, and chapter data is isolated: a member of one chapter can only see members of other chapters in the same fraternity, and only what those members chose to share. The full [Privacy Policy](src/app/(legal)/privacy/page.tsx) and [Terms of Service](src/app/(legal)/terms/page.tsx) are published in the app at `/privacy` and `/terms`.

## How it's built

- **Next.js** (App Router, React Server Components, server actions) on **Vercel**, with Vercel Analytics and Speed Insights.
- **Supabase** for authentication (email and Google), the Postgres database, row-level security that enforces chapter and fraternity boundaries in the database itself, Realtime for live messages, and Storage for member photos.
- **Tailwind CSS** with a token-based theme. Each chapter's primary and accent colors drive the whole interface, from the sidebar to focus rings, so a chapter's colors apply everywhere without custom styling.
- **shadcn/ui** components on **Base UI** for accessible dialogs, menus, and forms.
- **Anthropic's Claude** reads LinkedIn PDF exports during profile import, so members can bring their work history in without retyping it.
- Multi-tenant by subdomain: each chapter lives at its own hostname, with branding resolved per request.

## Security

Security reviews and the fixes that came out of them are written up in [`docs/security/`](docs/security/README.md). A strict content security policy, column-level database grants, and database-enforced visibility rules are part of the baseline.

## Changes

Product changes are tracked in [`CHANGELOG.md`](CHANGELOG.md).
