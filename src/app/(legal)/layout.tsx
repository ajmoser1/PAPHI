import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { LEGAL } from '@/lib/legal'

/**
 * Public, unauthenticated layout for long-form legal pages. Readable measure
 * (about 65 characters per line), generous line height, and a consistent
 * footer so the two documents link to each other.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to Chapter Connect
          </Link>
          <nav aria-label="Legal pages" className="flex items-center gap-4 text-sm">
            <Link href="/privacy" className="min-h-11 inline-flex items-center underline-offset-4 hover:underline">
              Privacy
            </Link>
            <Link href="/terms" className="min-h-11 inline-flex items-center underline-offset-4 hover:underline">
              Terms
            </Link>
          </nav>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <article className="legal-doc">{children}</article>
      </main>
      <footer className="border-t">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:px-6">
          <span>© {new Date().getUTCFullYear()} {LEGAL.operatorName}</span>
          <span>
            Questions:{' '}
            <a href={`mailto:${LEGAL.contactEmail}`} className="underline underline-offset-4 hover:text-primary">
              {LEGAL.contactEmail}
            </a>
          </span>
        </div>
      </footer>
    </div>
  )
}
