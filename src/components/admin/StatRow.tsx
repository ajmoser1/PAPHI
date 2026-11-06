import Link from 'next/link'
import { cn } from '@/lib/utils'

type Stat = { label: string; value: number | string; href: string; tone: 'neutral' | 'warning' | 'brand' }

/** Flat row of numbers separated by hairlines. No boxes. */
export function StatRow({ id, stats }: { id: string; stats: Stat[] }) {
  return (
    <section id={id} aria-label="Overview" className="scroll-mt-32">
      <dl className="grid grid-cols-2 divide-y divide-border sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="group flex flex-col gap-0.5 px-4 py-3 outline-none first:pl-0 last:pr-0 focus-visible:ring-2 focus-visible:ring-ring sm:px-5"
          >
            <dt className="eyebrow group-hover:text-foreground">{s.label}</dt>
            <dd
              className={cn(
                'font-heading text-3xl font-bold tabular-nums',
                s.tone === 'warning' ? 'text-warning-soft-foreground' : s.tone === 'brand' ? 'text-primary' : 'text-foreground'
              )}
            >
              {s.value}
            </dd>
          </Link>
        ))}
      </dl>
    </section>
  )
}
