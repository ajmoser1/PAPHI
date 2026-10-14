import { cn } from '@/lib/utils'

export function roleKind(role: string): 'alumni' | 'admin' | 'undergrad' | 'pending' {
  if (role === 'alumni') return 'alumni'
  if (role === 'pending') return 'pending'
  if (role === 'admin' || role === 'chapter_admin' || role === 'founder') return 'admin'
  return 'undergrad'
}

const LABEL = { alumni: 'Alumni', admin: 'Admin', undergrad: 'Undergrad', pending: 'Pending' } as const

/** Small role pill. Alumni use the accent, admins the primary tint, undergrads neutral. */
export function RoleMarker({ role, className }: { role: string; className?: string }) {
  const kind = roleKind(role)
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-2 text-[0.6875rem] font-semibold uppercase tracking-wide',
        kind === 'alumni' && 'bg-accent text-accent-foreground',
        kind === 'admin' && 'bg-primary-soft text-primary',
        (kind === 'undergrad' || kind === 'pending') && 'bg-secondary text-secondary-foreground',
        className
      )}
    >
      {kind === 'alumni' && <span aria-hidden="true" className="size-1.5 rounded-full bg-gold" />}
      {LABEL[kind]}
    </span>
  )
}
