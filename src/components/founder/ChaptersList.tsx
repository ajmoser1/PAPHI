'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Check, Copy } from 'lucide-react'
import { assignChapterAdminFromForm, suspendChapter } from '@/actions/founder'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { statusLabel } from '@/lib/labels'
import { cn } from '@/lib/utils'

export type ChapterRow = {
  id: string
  slug: string
  name: string
  school_name: string | null
  status: string
  contact_email: string | null
  inviteUrl: string
  host: string
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        } catch {
          toast.error('Could not copy. Select the text instead.')
        }
      }}
    >
      {copied ? <Check data-icon="inline-start" aria-hidden="true" /> : <Copy data-icon="inline-start" aria-hidden="true" />}
      {copied ? 'Copied' : label}
    </Button>
  )
}

export function ChaptersList({ chapters }: { chapters: ChapterRow[] }) {
  const [suspending, setSuspending] = useState<ChapterRow | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  return (
    <ul className="space-y-3">
      {chapters.map((ch) => (
        <li key={ch.id} className={cn('space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10', ch.status !== 'active' && 'opacity-75')}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{ch.name}</p>
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', ch.status === 'active' ? 'bg-success-soft text-success-soft-foreground' : 'bg-secondary text-secondary-foreground')}>
                  {statusLabel(ch.status)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{ch.school_name}</p>
              <p className="text-xs text-muted-foreground">
                <code>
                  {ch.slug}.{ch.host}
                </code>
              </p>
            </div>
            {ch.status === 'active' && (
              <Button type="button" size="sm" variant="outline" disabled={busyId === ch.id} onClick={() => setSuspending(ch)}>
                Suspend
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/50 p-2">
            <code className="min-w-0 flex-1 truncate text-xs">{ch.inviteUrl}</code>
            <CopyButton value={ch.inviteUrl} label="Copy invite link" />
          </div>

          <form
            className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              setBusyId(ch.id)
              startTransition(async () => {
                const result = await assignChapterAdminFromForm(ch.id, fd)
                setBusyId(null)
                if (result.message) toast.error(result.message)
                else toast.success('Chapter admin assigned.')
              })
            }}
          >
            <FormField
              id={`admin-email-${ch.id}`}
              name="email"
              type="email"
              label="Chapter admin email"
              hint={ch.contact_email ? `Current contact: ${ch.contact_email}. They must have registered first.` : 'They must have registered first.'}
              defaultValue={ch.contact_email ?? ''}
              required
            />
            <Button type="submit" size="sm" variant="secondary" disabled={busyId === ch.id} className="sm:mb-6">
              {busyId === ch.id ? 'Assigning…' : 'Assign admin'}
            </Button>
          </form>
        </li>
      ))}

      <AlertDialog open={suspending !== null} onOpenChange={(open) => !open && setSuspending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend {suspending?.name}?</AlertDialogTitle>
            <AlertDialogDescription>Its members can no longer sign in to the directory and its subdomain stops resolving to a chapter.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const t = suspending
                setSuspending(null)
                if (!t) return
                setBusyId(t.id)
                startTransition(async () => {
                  const result = await suspendChapter(t.id)
                  setBusyId(null)
                  if (result.message) toast.error(result.message)
                  else toast.success(`${t.name} suspended.`)
                })
              }}
            >
              Suspend chapter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ul>
  )
}
