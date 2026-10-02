import Link from 'next/link'
import { AffiliationBranding } from '@/components/layout/AffiliationBranding'
import { CrestBackground } from '@/components/layout/CrestBackground'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-screen min-h-[100dvh] flex-col items-center justify-center gap-8 overflow-x-hidden bg-gradient-to-b from-background via-background to-muted/30 px-4 py-10">
      <CrestBackground />
      <main id="main" className="relative z-10 w-full max-w-md">
        {children}
      </main>
      <div className="relative z-10 flex flex-col items-center gap-4">
        <AffiliationBranding />
        <nav aria-label="Legal" className="flex items-center gap-4 text-xs text-muted-foreground">
          <Link href="/privacy" className="inline-flex min-h-11 items-center underline-offset-4 hover:text-primary hover:underline">
            Privacy Policy
          </Link>
          <Link href="/terms" className="inline-flex min-h-11 items-center underline-offset-4 hover:text-primary hover:underline">
            Terms of Service
          </Link>
        </nav>
      </div>
    </div>
  )
}
