import Link from 'next/link'
import { MessageSquareReply } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import type { UnreadConversation } from '@/lib/unread'
import { MemberAvatar } from './MemberAvatar'
import { RoleMarker } from './RoleMarker'

export type WaitingProfile = {
  id: string
  first_name: string
  last_name: string
  avatar_url: string | null
  role: string
}

function relativeTime(iso: string | null): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.round(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Members who messaged you and are waiting on a reply. Always the top of Find a Brother. */
export function WaitingOnYou({
  unread,
  profiles,
}: {
  unread: UnreadConversation[]
  profiles: Record<string, WaitingProfile>
}) {
  const rows = unread.filter((u) => profiles[u.other_profile_id])
  if (rows.length === 0) return null

  return (
    <section aria-labelledby="waiting-heading" className="rounded-2xl border border-gold/50 bg-accent/60 p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="waiting-heading" className="heading-3 flex items-center gap-2">
          Waiting on you
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2 text-xs font-bold text-primary-foreground">
            {rows.length}
          </span>
        </h2>
        <Link href="/messages" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          All messages
        </Link>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((u) => {
          const p = profiles[u.other_profile_id]
          const count = u.unread_count
          return (
            <li key={u.conversation_id} className="flex gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
              <Link href={`/members/${p.id}`} className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <MemberAvatar firstName={p.first_name} lastName={p.last_name} avatarUrl={p.avatar_url} size={48} />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold">
                    {p.first_name} {p.last_name}
                  </p>
                  <RoleMarker role={p.role} />
                </div>
                <p className="text-xs font-medium text-primary">
                  {count} new {count === 1 ? 'message' : 'messages'} · {relativeTime(u.last_message_at)}
                </p>
                {u.last_message_preview && (
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{u.last_message_preview}</p>
                )}
                <Link href={`/messages/${u.conversation_id}`} className={buttonVariants({ size: 'sm', className: 'mt-2' })}>
                  <MessageSquareReply data-icon="inline-start" aria-hidden="true" />
                  Reply
                </Link>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
