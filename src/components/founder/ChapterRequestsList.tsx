'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { approveChapterRequest, rejectChapterRequest } from '@/actions/founder'
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

export type ChapterRequest = {
  id: string
  chapter_name: string
  school_name: string
  contact_name: string
  contact_email: string
}

export function ChapterRequestsList({ requests }: { requests: ChapterRequest[] }) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<ChapterRequest | null>(null)
  const [, startTransition] = useTransition()

  function run(id: string, fn: () => Promise<{ message?: string }>, ok: string) {
    setBusyId(id)
    startTransition(async () => {
      const result = await fn()
      setBusyId(null)
      if (result.message) toast.error(result.message)
      else toast.success(ok)
    })
  }

  return (
    <ul className="divide-y divide-border">
      {requests.map((req) => (
        <li key={req.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-semibold">{req.chapter_name}</p>
            <p className="text-sm text-muted-foreground">{req.school_name}</p>
            <p className="text-xs text-muted-foreground">
              {req.contact_name} · {req.contact_email}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button type="button" size="sm" disabled={busyId === req.id} onClick={() => run(req.id, () => approveChapterRequest(req.id), `${req.chapter_name} is live.`)}>
              {busyId === req.id ? 'Working…' : 'Approve'}
            </Button>
            <Button type="button" size="sm" variant="destructive" disabled={busyId === req.id} onClick={() => setRejecting(req)}>
              Decline
            </Button>
          </div>
        </li>
      ))}
      <AlertDialog open={rejecting !== null} onOpenChange={(open) => !open && setRejecting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline {rejecting?.chapter_name}?</AlertDialogTitle>
            <AlertDialogDescription>The request is marked rejected. {rejecting?.contact_name} keeps their account but no chapter is created.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const t = rejecting
                setRejecting(null)
                if (t) run(t.id, () => rejectChapterRequest(t.id), 'Request declined.')
              }}
            >
              Decline
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ul>
  )
}
