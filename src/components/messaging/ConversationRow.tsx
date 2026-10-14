import Link from 'next/link'
import { MemberAvatar } from '@/components/members/MemberAvatar'
import { cn } from '@/lib/utils'

export function relativeTime(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  const diff = Date.now() - date.getTime()
  const m = Math.round(diff / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.round(h / 24)
  if (d === 1) return 'Yesterday'
  if (d < 7) return `${d}d`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function ConversationRow({
  href,
  firstName,
  lastName,
  avatarUrl,
  preview,
  mine,
  at,
  unreadCount,
}: {
  href: string
  firstName: string
  lastName: string
  avatarUrl: string | null
  preview: string | null
  mine: boolean
  at: string | null
  unreadCount: number
}) {
  const unread = unreadCount > 0
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-xl p-3 ring-1 ring-foreground/10 outline-none transition duration-fast hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring',
        unread ? 'bg-primary-soft/60' : 'bg-card'
      )}
    >
      <MemberAvatar firstName={firstName} lastName={lastName} avatarUrl={avatarUrl} size={48} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className={cn('truncate', unread ? 'font-semibold text-foreground' : 'font-medium')}>
            {firstName} {lastName}
          </p>
          <span className={cn('shrink-0 text-xs', unread ? 'font-semibold text-primary' : 'text-muted-foreground')}>
            {relativeTime(at)}
          </span>
        </div>
        {preview && (
          <p className={cn('truncate text-sm', unread ? 'text-foreground/90' : 'text-muted-foreground')}>
            {mine ? 'You: ' : ''}
            {preview}
          </p>
        )}
      </div>
      {unread && (
        <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
          <span aria-hidden="true">{unreadCount > 9 ? '9+' : unreadCount}</span>
          <span className="sr-only">{unreadCount} unread</span>
        </span>
      )}
    </Link>
  )
}
