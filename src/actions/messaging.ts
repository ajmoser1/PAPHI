'use server'

import { revalidatePath } from 'next/cache'
import { requireActiveProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

async function requireActive() {
  const { supabase, userId } = await requireActiveProfile()
  return { supabase, userId }
}

export async function createConversation(otherUserId: string): Promise<string> {
  const { supabase, userId } = await requireActiveProfile()

  if (userId === otherUserId) throw new Error('Cannot message yourself.')

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, status, chapter_id')
    .in('id', [userId, otherUserId])

  const self = profiles?.find((p) => p.id === userId)
  const other = profiles?.find((p) => p.id === otherUserId)

  if (!self || !other || other.status !== 'active') {
    throw new Error('Cannot message this user.')
  }

  if (self.chapter_id && other.chapter_id) {
    const { data: chapters } = await supabase
      .from('chapters')
      .select('id, fraternity_id')
      .in('id', [self.chapter_id, other.chapter_id])

    const selfChapter = chapters?.find((c) => c.id === self.chapter_id)
    const otherChapter = chapters?.find((c) => c.id === other.chapter_id)

    if (
      selfChapter &&
      otherChapter &&
      selfChapter.fraternity_id !== otherChapter.fraternity_id
    ) {
      throw new Error('Cannot message users outside your fraternity.')
    }
  }

  const [a, b] = [userId, otherUserId].sort()

  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('participant_a', a)
    .eq('participant_b', b)
    .single()

  if (existing) return existing.id

  const { data: created, error } = await supabase
    .from('conversations')
    .insert({ participant_a: a, participant_b: b })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return created.id
}

export async function sendMessage(conversationId: string, body: string): Promise<void> {
  const { supabase, userId } = await requireActiveProfile()

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
