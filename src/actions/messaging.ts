'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return { supabase, userId: user.id }
}

export async function createConversation(otherUserId: string): Promise<string> {
  const { supabase, userId } = await requireAuth()

  if (userId === otherUserId) throw new Error('Cannot message yourself.')

  // Canonical ordering: smaller UUID is participant_a
  const [a, b] = [userId, otherUserId].sort()

  // Check if conversation already exists
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('participant_a', a)
    .eq('participant_b', b)
    .single()

  if (existing) return existing.id

  // Create new conversation
  const { data: created, error } = await supabase
    .from('conversations')
    .insert({ participant_a: a, participant_b: b })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return created.id
}

export async function sendMessage(conversationId: string, body: string): Promise<void> {
  const { supabase, userId } = await requireAuth()

  const trimmed = body.trim()
  if (!trimmed) return

  const { error } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: userId,
    body: trimmed,
  })

  if (error) throw new Error(error.message)
  revalidatePath(`/messages/${conversationId}`)
}
