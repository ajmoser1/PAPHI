import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MessageSquareText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getOwnProfileForApp } from '@/lib/profile'
import { getUnreadConversations } from '@/lib/unread'
import { PageHeader } from '@/components/layout/PageHeader'
import { buttonVariants } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { ConversationRow } from '@/components/messaging/ConversationRow'

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const profile = await getOwnProfileForApp()
  if (profile?.status === 'pending_approval') redirect('/members')

  const [{ data: conversations }, unread] = await Promise.all([
    supabase
      .from('conversations')
      .select(`
        id,
        participant_a,
        participant_b,
        last_message_at,
        messages(body, created_at, sender_id)
      `)
      .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
      .order('last_message_at', { ascending: false })
      .order('created_at', { foreignTable: 'messages', ascending: false })
      .limit(1, { foreignTable: 'messages' }),
    getUnreadConversations(),
  ])

  const unreadByConversation = Object.fromEntries(unread.map((u) => [u.conversation_id, u.unread_count]))

  const otherIds = conversations?.map((c) => (c.participant_a === user.id ? c.participant_b : c.participant_a)) ?? []

  const { data: otherProfiles } = otherIds.length
    ? await supabase.from('profiles').select('id, first_name, last_name, avatar_url').in('id', otherIds)
    : { data: [] }

  const profileMap = Object.fromEntries((otherProfiles ?? []).map((p) => [p.id, p]))
  const total = conversations?.length ?? 0
  const unreadTotal = unread.reduce((n, u) => n + u.unread_count, 0)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Messages"
        description={
          total === 0
            ? 'Referral requests, intros, and quick questions all start here.'
            : `${total} ${total === 1 ? 'conversation' : 'conversations'}${unreadTotal ? ` · ${unreadTotal} unread` : ''}`
        }
      />

      {!conversations?.length ? (
        <Empty className="py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="size-12 rounded-xl [&_svg]:size-6">
              <MessageSquareText aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle className="heading-3">No messages yet</EmptyTitle>
            <EmptyDescription>
              Find a brother at a company you care about and ask for a referral, an intro, or advice. They expect it.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href="/members" className={buttonVariants()}>
              Find a brother to message
            </Link>
          </EmptyContent>
        </Empty>
      ) : (
        <ul className="space-y-2">
          {conversations.map((conv) => {
            const otherId = conv.participant_a === user.id ? conv.participant_b : conv.participant_a
            const other = profileMap[otherId]
            const lastMsg = (conv as { messages?: Array<{ body: string; created_at: string; sender_id: string }> }).messages?.[0]
            return (
              <li key={conv.id}>
                <ConversationRow
                  href={`/messages/${conv.id}`}
                  firstName={other?.first_name ?? 'Unknown'}
                  lastName={other?.last_name ?? ''}
                  avatarUrl={other?.avatar_url ?? null}
                  preview={lastMsg?.body ?? null}
                  mine={lastMsg?.sender_id === user.id}
                  at={conv.last_message_at ?? lastMsg?.created_at ?? null}
                  unreadCount={unreadByConversation[conv.id] ?? 0}
                />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
