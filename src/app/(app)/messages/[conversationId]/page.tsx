import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MessageThread } from '@/components/messaging/MessageThread'

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>
}) {
  const { conversationId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: conversation } = await supabase
    .from('conversations')
    .select('id, participant_a, participant_b')
    .eq('id', conversationId)
    .single()

  if (!conversation) notFound()

  // Verify current user is a participant
  const isParticipant =
    conversation.participant_a === user.id ||
    conversation.participant_b === user.id
  if (!isParticipant) notFound()

  const otherId =
    conversation.participant_a === user.id
      ? conversation.participant_b
      : conversation.participant_a

  const [{ data: messages }, { data: otherProfile }] = await Promise.all([
    supabase
      .from('messages')
      .select('id, body, sender_id, created_at, is_deleted')
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true }),
    supabase
      .from('profiles')
      .select('id, first_name, last_name, avatar_url')
      .eq('id', otherId)
      .single(),
  ])

  return (
    <MessageThread
      conversationId={conversationId}
      currentUserId={user.id}
      otherProfile={otherProfile}
      initialMessages={messages ?? []}
    />
  )
}
