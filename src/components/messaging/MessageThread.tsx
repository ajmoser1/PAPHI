'use client'

import { useState, useEffect, useRef, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, RotateCcw, Send } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { markConversationRead, sendMessage } from '@/actions/messaging'
import { Button, buttonVariants } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { MemberAvatar } from '@/components/members/MemberAvatar'
import { cn } from '@/lib/utils'
import { useHydrated } from '@/lib/use-hydrated'

interface Message {
  id: string
  body: string
  sender_id: string
  created_at: string
  is_deleted: boolean
  status?: 'sending' | 'failed'
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

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  if (same(d, today)) return 'Today'
  if (same(d, yesterday)) return 'Yesterday'
  return d.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    ...(d.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
  })
}

export function MessageThread({ conversationId, currentUserId, otherProfile, initialMessages }: Props) {
  const hydrated = useHydrated()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [draft, setDraft] = useState('')
  const [, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = useMemo(() => createClient(), [])

  // Subscribe to new messages via Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev
            // Replace our optimistic copy if this is the server echo of it.
            const idx = prev.findIndex(
              (m) => m.id.startsWith('optimistic-') && m.sender_id === newMsg.sender_id && m.body === newMsg.body
            )
            if (idx >= 0) {
              const next = [...prev]
              next[idx] = newMsg
              return next
            }
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, supabase])

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    bottomRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'end' })
  }, [messages])

  // Mark the thread read when it is open and visible, and again as new
  // messages from the other participant arrive while the tab is in front.
  const lastOtherMessageId = [...messages].reverse().find((m) => m.sender_id !== currentUserId)?.id
  useEffect(() => {
    function mark() {
      if (document.visibilityState === 'visible') markConversationRead(conversationId).catch(() => {})
    }
    mark()
    document.addEventListener('visibilitychange', mark)
    return () => document.removeEventListener('visibilitychange', mark)
  }, [conversationId, lastOtherMessageId, currentUserId])

  function deliver(id: string, text: string) {
    startTransition(async () => {
      try {
        await sendMessage(conversationId, text)
        setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status: undefined } : m)))
      } catch {
        setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status: 'failed' } : m)))
        toast.error('Message not sent. Tap retry to try again.')
      }
    })
  }

  function handleSend() {
    const text = draft.trim()
    if (!text) return
    const optimistic: Message = {
      id: `optimistic-${Date.now()}`,
      body: text,
      sender_id: currentUserId,
      created_at: new Date().toISOString(),
      is_deleted: false,
      status: 'sending',
    }
    setMessages((prev) => [...prev, optimistic])
    setDraft('')
    deliver(optimistic.id, text)
  }

  function retry(msg: Message) {
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, status: 'sending' } : m)))
    deliver(msg.id, msg.body)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const name = otherProfile ? `${otherProfile.first_name} ${otherProfile.last_name}` : 'Unknown member'

  return (
    <div className="mx-auto flex h-[calc(100dvh-3.5rem-2rem)] max-w-3xl flex-col md:h-[calc(100dvh-3.5rem-3rem)] lg:h-[calc(100dvh-3.5rem-4rem)]">
      <header className="flex items-center gap-3 border-b border-border pb-3">
        <Link href="/messages" className={buttonVariants({ variant: 'ghost', size: 'icon' })} aria-label="Back to messages">
          <ArrowLeft aria-hidden="true" />
        </Link>
        {otherProfile ? (
          <Link
            href={`/members/${otherProfile.id}`}
            className="flex min-w-0 items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MemberAvatar firstName={otherProfile.first_name} lastName={otherProfile.last_name} avatarUrl={otherProfile.avatar_url} size={40} />
            <span className="min-w-0">
              <span className="block truncate font-semibold">{name}</span>
              <span className="block text-xs text-muted-foreground">View profile</span>
            </span>
          </Link>
        ) : (
          <p className="font-semibold">{name}</p>
        )}
      </header>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto py-4 pr-1" role="log" aria-live="polite" aria-label="Messages">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">No messages yet. Say hello.</p>
        )}
        {messages.map((msg, i) => {
          const isMine = msg.sender_id === currentUserId
          const prev = messages[i - 1]
          // Day labels depend on the viewer's timezone, so only render them after hydration.
          const showDay = hydrated && (!prev || dayLabel(prev.created_at) !== dayLabel(msg.created_at))
          return (
            <div key={msg.id}>
              {showDay && (
                <div className="my-4 flex items-center gap-3" role="separator" aria-label={dayLabel(msg.created_at)}>
                  <span className="h-px flex-1 bg-border" />
                  <span className="eyebrow">{dayLabel(msg.created_at)}</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
              )}
              <div className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm sm:max-w-[70%]',
                    isMine ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-card text-foreground ring-1 ring-foreground/10',
                    msg.status === 'failed' && 'bg-destructive-soft text-destructive-soft-foreground'
                  )}
                >
                  <p className="break-words whitespace-pre-wrap">{msg.body}</p>
                  <p className={cn('mt-1 flex items-center gap-1 text-[0.6875rem]', isMine ? 'justify-end text-primary-foreground/70' : 'text-muted-foreground')}>
                    {msg.status === 'sending' ? (
                      'Sending…'
                    ) : msg.status === 'failed' ? (
                      <button type="button" onClick={() => retry(msg)} className="inline-flex items-center gap-1 font-medium underline underline-offset-2">
                        <RotateCcw className="size-3" aria-hidden="true" /> Not sent. Retry
                      </button>
                    ) : (
                      <>
                        <span suppressHydrationWarning>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </span>
                        {isMine && <Check className="size-3" aria-hidden="true" />}
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form
        className="flex items-end gap-2 border-t border-border pt-3"
        onSubmit={(e) => {
          e.preventDefault()
          handleSend()
        }}
      >
        <label htmlFor="message-draft" className="sr-only">
          Message {name}
        </label>
        <Textarea
          id="message-draft"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a message. Enter sends, Shift+Enter for a new line."
          rows={1}
          maxLength={4000}
          className="max-h-40 min-h-11 flex-1 resize-none bg-card"
        />
        <Button type="submit" disabled={!draft.trim()} size="icon" aria-label="Send message">
          <Send aria-hidden="true" />
        </Button>
      </form>
    </div>
  )
}
