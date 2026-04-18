'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { sendMessage } from '@/actions/messaging'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button, buttonVariants } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Message {
  id: string
  body: string
  sender_id: string
  created_at: string
  is_deleted: boolean
}

interface Profile {
  id: string
  first_name: string
  last_name: string
  avatar_url: string | null
}

interface Props {
  conversationId: string
  currentUserId: string
  otherProfile: Profile | null
  initialMessages: Message[]
}

export function MessageThread({
  conversationId,
  currentUserId,
  otherProfile,
  initialMessages,
}: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [draft, setDraft] = useState('')
  const [isPending, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Subscribe to new messages via Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend() {
    const text = draft.trim()
    if (!text) return

    // Optimistic append
    const optimistic: Message = {
      id: `optimistic-${Date.now()}`,
      body: text,
      sender_id: currentUserId,
      created_at: new Date().toISOString(),
      is_deleted: false,
    }
    setMessages((prev) => [...prev, optimistic])
    setDraft('')

    startTransition(async () => {
      try {
        await sendMessage(conversationId, text)
      } catch {
        toast.error('Failed to send message.')
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
        setDraft(text)
      }
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const initials = otherProfile
    ? `${otherProfile.first_name[0]}${otherProfile.last_name[0]}`.toUpperCase()
    : '?'

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b mb-4">
        <Link href="/messages" className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Avatar className="h-8 w-8">
          <AvatarImage src={otherProfile?.avatar_url ?? undefined} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div>
          {otherProfile ? (
            <Link
              href={`/alumni/${otherProfile.id}`}
              className="font-medium text-sm hover:underline"
            >
              {otherProfile.first_name} {otherProfile.last_name}
            </Link>
          ) : (
            <p className="font-medium text-sm">Unknown</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">
            No messages yet — send the first one!
          </p>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === currentUserId
          return (
            <div
              key={msg.id}
              className={cn('flex', isMine ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[70%] rounded-2xl px-4 py-2 text-sm',
                  isMine
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted text-foreground rounded-bl-sm'
                )}
              >
                <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                <p className={cn(
                  'text-[10px] mt-1',
                  isMine ? 'text-primary-foreground/60 text-right' : 'text-muted-foreground'
                )}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-4 flex gap-2 items-end border-t pt-4">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
          rows={1}
          className="resize-none flex-1"
        />
        <Button
          onClick={handleSend}
          disabled={isPending || !draft.trim()}
          size="icon"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
