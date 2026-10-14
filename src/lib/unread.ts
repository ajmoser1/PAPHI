import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export type UnreadConversation = {
  conversation_id: string
  other_profile_id: string
  unread_count: number
  last_message_at: string | null
  last_message_preview: string | null
}

/**
 * Conversations with messages the caller hasn't read, newest first.
 * Returns [] when the RPC is missing (migration not applied yet) so the app
 * degrades to "no unread" instead of crashing.
 */
export const getUnreadConversations = cache(async function getUnreadConversations(): Promise<UnreadConversation[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_unread_conversations')
  if (error || !data) return []
  return (data as UnreadConversation[]).map((row) => ({
    ...row,
    unread_count: Number(row.unread_count),
  }))
})

export function totalUnread(rows: UnreadConversation[]): number {
  return rows.reduce((sum, r) => sum + r.unread_count, 0)
}
