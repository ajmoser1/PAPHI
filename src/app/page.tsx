import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getTenantContext } from '@/lib/tenant'
import { getPlatformStats } from '@/lib/stats'
import { TenantTheme } from '@/components/layout/TenantTheme'
import { AffiliationBranding } from '@/components/layout/AffiliationBranding'
import { CrestBackground } from '@/components/layout/CrestBackground'
import { PlatformStats } from '@/components/layout/PlatformStats'

export default async function Home() {
  const [tenant, stats] = await Promise.all([getTenantContext(), getPlatformStats()])

  if (tenant.isApex || !tenant.chapter) {
    return (
      <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-b from-background via-background to-muted/30">
        <CrestBackground />
        <main className="relative z-10 mx-auto flex max-w-4xl flex-col items-center gap-10 px-6 py-20 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-primary tracking-tight">
            Chapter Connect
          </h1>
          <p className="text-lg text-foreground max-w-2xl">
            The referral & networking platform for fraternity chapters. Find brothers by industry,
            get warm intros, and land opportunities through your network.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/auth/login" className={cn(buttonVariants({ size: 'lg' }))}>
              Sign in
            </Link>
            <Link
              href="/auth/register"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'border-transparent bg-[var(--gold)] text-primary hover:bg-[var(--gold)]/90'
              )}
            >
              Register
            </Link>
          </div>

          <div className="flex flex-col items-center">
            <AffiliationBranding />
            <PlatformStats initialStats={stats} />
          </div>
        </main>
      </div>
    )
  }

  const chapter = tenant.chapter
  const title = chapter.display_title ?? chapter.name
  const tagline = chapter.tagline ?? 'Find brothers for referrals, mentorship, and opportunities.'

  return (
    <>
      <TenantTheme primaryColor={chapter.primary_color} accentColor={chapter.accent_color} />
      <div className="relative min-h-screen min-h-[100dvh] overflow-x-hidden bg-gradient-to-b from-background via-background to-muted/30">
        <CrestBackground src={chapter.crest_url ?? undefined} />
        <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-16">
          <section className="flex w-full max-w-4xl flex-col items-center gap-8 text-center">
            <h1 className="max-w-3xl text-3xl text-primary font-bold tracking-tight sm:text-5xl">
              {title}
            </h1>
            <p className="max-w-2xl text-lg text-foreground sm:text-xl">{tagline}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/auth/login" className={cn(buttonVariants({ size: 'lg' }))}>
                Sign in
              </Link>
              <Link
                href="/auth/register"
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'border-transparent bg-[var(--gold)] text-primary hover:bg-[var(--gold)]/90'
                )}
              >
                Register
              </Link>
            </div>
            <div className="flex flex-col items-center">
              <AffiliationBranding schoolName={chapter.school_name} />
              <PlatformStats initialStats={stats} />
            </div>
          </section>
        </main>
      </div>
    </>
  )
}
