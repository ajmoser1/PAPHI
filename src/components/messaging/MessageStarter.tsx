'use client'

import { useState, useTransition } from 'react'
import { Briefcase, Handshake, MessageSquareText, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { startConversationWithMessage } from '@/actions/messaging'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type Template = {
  id: 'referral' | 'advice' | 'hello'
  label: string
  hint: string
  icon: typeof Briefcase
  body: (ctx: Ctx) => string
}

type Ctx = { first: string; company: string | null; me: string }

const TEMPLATES: Template[] = [
  {
    id: 'referral',
    label: 'Referral request',
    hint: 'Ask for a referral or an intro',
    icon: Briefcase,
    body: ({ first, company, me }) =>
      `Hi ${first}, ${me ? `I'm ${me}, a brother from the chapter` : "I'm a brother from the chapter"}. I'm interested in ${company ? `a role at ${company}` : 'roles in your field'} and would love a referral or an intro to the right person if you're open to it. Happy to send my resume. Thanks!`,
  },
  {
    id: 'advice',
    label: 'Career advice',
    hint: 'Ask how they got where they are',
    icon: Sparkles,
    body: ({ first, company, me }) =>
      `Hi ${first}, ${me ? `I'm ${me} from the chapter` : "I'm a brother from the chapter"}. I'm figuring out my next step and your path${company ? ` to ${company}` : ''} stood out. Could I ask you a few questions sometime, or grab 15 minutes on a call?`,
  },
  {
    id: 'hello',
    label: 'Say hello',
    hint: 'Just connect',
    icon: Handshake,
    body: ({ first, me }) => `Hi ${first}, ${me ? `I'm ${me}, a brother from the chapter` : "I'm a brother from the chapter"}. Wanted to say hello and connect.`,
  },
]

export function MessageStarter({
  otherId,
  otherFirstName,
  otherCompany,
  viewerFirstName,
}: {
  otherId: string
  otherFirstName: string
  otherCompany: string | null
  viewerFirstName: string
}) {
  const ctx: Ctx = { first: otherFirstName, company: otherCompany, me: viewerFirstName.trim() }
  const [open, setOpen] = useState(false)
  const [template, setTemplate] = useState<Template['id']>('referral')
  const [body, setBody] = useState(() => TEMPLATES[0].body(ctx))
  const [isPending, startTransition] = useTransition()

  function pick(t: Template) {
    setTemplate(t.id)
    setBody(t.body(ctx))
  }

  function send() {
    const text = body.trim()
    if (!text) return
    startTransition(async () => {
      try {
        await startConversationWithMessage(otherId, text)
      } catch (err) {
        // redirect() throws a special error that Next handles; anything else is a real failure.
        if (err && typeof err === 'object' && 'digest' in err && String((err as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) throw err
        toast.error(err instanceof Error ? err.message : 'Could not send the message.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <MessageSquareText data-icon="inline-start" aria-hidden="true" />
        Ask {otherFirstName} for a referral or intro
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="heading-3">Message {otherFirstName}</DialogTitle>
          <DialogDescription>
            Pick a starting point and make it yours. Brothers expect these messages. That is what the directory is for.
          </DialogDescription>
        </DialogHeader>
        <div role="radiogroup" aria-label="Message type" className="grid gap-2 sm:grid-cols-3">
          {TEMPLATES.map((t) => {
            const Icon = t.icon
            const active = t.id === template
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => pick(t)}
                className={cn(
                  'flex min-h-11 flex-col items-start gap-1 rounded-lg border p-3 text-left text-sm outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-ring',
                  active ? 'border-primary bg-primary-soft text-primary' : 'border-border hover:bg-muted/60'
                )}
              >
                <span className="flex items-center gap-1.5 font-semibold">
                  <Icon className="size-4" aria-hidden="true" />
                  {t.label}
                </span>
                <span className={cn('text-xs', active ? 'text-primary/80' : 'text-muted-foreground')}>{t.hint}</span>
              </button>
            )
          })}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="starter-body">Your message</Label>
          <Textarea
            id="starter-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            maxLength={4000}
            className="resize-y"
          />
          <p className="text-xs text-muted-foreground">You can keep the conversation going in Messages.</p>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={send} disabled={isPending || !body.trim()}>
            {isPending ? 'Sending…' : 'Send message'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
