import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MessageSquare } from 'lucide-react'

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: conversations } = await supabase
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
    .limit(1, { foreignTable: 'messages' })

  // Fetch other participant profiles
  const otherIds = conversations?.map((c) =>
    c.participant_a === user.id ? c.participant_b : c.participant_a
  ) ?? []

  const { data: otherProfiles } = otherIds.length
    ? await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .in('id', otherIds)
    : { data: [] }

  const profileMap = Object.fromEntries((otherProfiles ?? []).map((p) => [p.id, p]))

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-muted-foreground">{conversations?.length ?? 0} conversations</p>
      </div>

      {!conversations?.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No messages yet.</p>
          <p className="text-sm mt-1">Find an alumnus and click "Message" to start a conversation.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => {
            const otherId = conv.participant_a === user.id ? conv.participant_b : conv.participant_a
            const other = profileMap[otherId]
            const initials = other ? `${other.first_name[0]}${other.last_name[0]}`.toUpperCase() : '?'
            const lastMsg = (conv as any).messages?.[0]

            return (
              <Link key={conv.id} href={`/messages/${conv.id}`}>
                <div className="flex items-center gap-3 rounded-lg border bg-white p-4 hover:bg-zinc-50 transition-colors cursor-pointer">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={other?.avatar_url ?? undefined} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      {other ? `${other.first_name} ${other.last_name}` : 'Unknown'}
                    </p>
                    {lastMsg && (
                      <p className="text-xs text-muted-foreground truncate">
                        {lastMsg.sender_id === user.id ? 'You: ' : ''}{lastMsg.body}
                      </p>
                    )}
                  </div>
                  {conv.last_message_at && (
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(conv.last_message_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
