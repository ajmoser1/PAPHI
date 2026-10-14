import Link from 'next/link'
import { cn } from '@/lib/utils'

export function StatTile({
  label,
  value,
  href,
  tone = 'neutral',
  hint,
}: {
  label: string
  value: number | string
  href: string
  /** warning tone when the number needs attention */
  tone?: 'neutral' | 'warning' | 'brand'
  hint?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex flex-col gap-1 rounded-xl p-4 ring-1 outline-none transition duration-fast hover:-translate-y-px hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring',
        tone === 'warning' && 'bg-warning-soft ring-warning/40',
        tone === 'brand' && 'bg-primary-soft ring-primary/20',
        tone === 'neutral' && 'bg-card ring-foreground/10'
      )}
    >
      <span className="eyebrow">{label}</span>
      <span className={cn('font-heading text-3xl font-bold tabular-nums', tone === 'warning' ? 'text-warning-soft-foreground' : 'text-primary')}>
        {value}
      </span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </Link>
  )
}
