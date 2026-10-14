import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, Handshake, Search, UserRoundCheck } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getTenantContext } from '@/lib/tenant'
import { getPlatformStats } from '@/lib/stats'
import { createClient } from '@/lib/supabase/server'
import { TenantTheme } from '@/components/layout/TenantTheme'
import { AffiliationBranding } from '@/components/layout/AffiliationBranding'
import { CrestBackground } from '@/components/layout/CrestBackground'
import { PlatformStats } from '@/components/layout/PlatformStats'

function LegalLinks() {
  return (
    <nav aria-label="Legal" className="flex items-center gap-4 text-xs text-muted-foreground">
      <Link href="/privacy" className="inline-flex min-h-11 items-center underline-offset-4 hover:text-primary hover:underline">
        Privacy Policy
      </Link>
      <Link href="/terms" className="inline-flex min-h-11 items-center underline-offset-4 hover:text-primary hover:underline">
        Terms of Service
      </Link>
    </nav>
  )
}

const STEPS = [
  {
    icon: Search,
    title: 'Find a brother',
    body: 'Search every member by company, career field, or name. Alumni and undergrads, your chapter or all of them.',
  },
  {
    icon: Handshake,
    title: 'Ask for a referral or intro',
    body: 'Message anyone directly. Brothers expect it. Referrals, advice, a warm intro to the right person.',
  },
  {
    icon: UserRoundCheck,
    title: 'Be findable',
    body: 'Add your photo, job, and field once. The next brother looking for someone where you work finds you.',
  },
]

function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="w-full">
      <h2 id="how-heading" className="eyebrow mb-4 text-center">
        How it works
      </h2>
      <ol className="grid gap-3 text-left sm:grid-cols-3">
        {STEPS.map((step, i) => {
          const Icon = step.icon
          return (
            <li key={step.title} className="rounded-2xl bg-card/90 p-5 ring-1 ring-foreground/10 backdrop-blur-sm">
              <div className="mb-3 flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="font-heading text-sm font-semibold text-muted-foreground">0{i + 1}</span>
              </div>
              <h3 className="heading-4">{step.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function Ctas() {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      <Link href="/auth/register" className={cn(buttonVariants({ size: 'lg' }), 'min-w-40')}>
        Register
        <ArrowRight data-icon="inline-end" aria-hidden="true" />
      </Link>
      <Link href="/auth/login" className={cn(buttonVariants({ size: 'lg', variant: 'outline' }), 'min-w-40 bg-card/80')}>
        Sign in
      </Link>
    </div>
  )
}

export default async function Home() {
  const supabase = await createClient()
  const [{ data: { user } }, tenant, stats] = await Promise.all([supabase.auth.getUser(), getTenantContext(), getPlatformStats()])
  if (user) redirect('/members')

  const chapter = tenant.isApex ? null : tenant.chapter
  const title = chapter ? (chapter.display_title ?? chapter.name) : 'Chapter Connect'
  const tagline = chapter
    ? (chapter.tagline ?? 'Find brothers for referrals, mentorship, and opportunities.')
    : 'The private referral and networking directory for fraternity chapters. Find brothers by company or field, ask for a warm intro, and land the opportunity.'

  return (
    <>
      {chapter && <TenantTheme primaryColor={chapter.primary_color} accentColor={chapter.accent_color} />}
      <div className="relative min-h-dvh overflow-x-hidden bg-gradient-to-b from-background via-background to-muted/40">
        <CrestBackground src={chapter?.crest_url ?? undefined} />
        <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center gap-12 px-4 py-14 text-center sm:px-6 sm:py-20">
          <section className="flex max-w-3xl flex-col items-center gap-6">
            {chapter && <p className="eyebrow">Chapter Connect</p>}
            <h1 className="heading-display text-[2.5rem] sm:text-6xl">{title}</h1>
            <p className="max-w-2xl text-lg text-foreground/85 sm:text-xl">{tagline}</p>
            <Ctas />
            <p className="text-xs text-muted-foreground">Invite-only. Approved by your chapter admin.</p>
          </section>

          <HowItWorks />

          <PlatformStats initialStats={stats} />

          {tenant.isApex && (
            <section className="w-full rounded-2xl bg-sidebar px-6 py-8 text-sidebar-foreground">
              <h2 className="heading-2 text-sidebar-foreground">Bring your chapter on</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-sidebar-foreground/80">
                Any chapter can run its own directory here, with its own colors and admin. Free. You become the first admin.
              </p>
              <Link
                href="/start-chapter"
                className={cn(buttonVariants({ size: 'lg' }), 'mt-5 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90')}
              >
                Start a chapter
              </Link>
            </section>
          )}

          <footer className="flex flex-col items-center gap-4">
            <AffiliationBranding schoolName={chapter?.school_name} logoUrl={chapter?.logo_url} />
            <LegalLinks />
          </footer>
        </main>
      </div>
    </>
  )
}
