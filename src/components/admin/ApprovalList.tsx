'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Camera, ExternalLink, Mail, Phone } from 'lucide-react'
import { approveUser, rejectUser } from '@/actions/admin'
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
import { MemberAvatar } from '@/components/members/MemberAvatar'
import { RoleMarker } from '@/components/members/RoleMarker'
import { CONTACT_REQUIRED_FOR_APPROVAL_MESSAGE } from '@/lib/contact'
import { cn } from '@/lib/utils'

export type PendingMember = {
  id: string
  first_name: string
  last_name: string
  role: string
  created_at: string
  avatar_url: string | null
  chapterLabel: string | null
  canApprove: boolean
  phone: string | null
  email: string | null
  linkedin: string | null
}

export function ApprovalList({ members }: { members: PendingMember[] }) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<PendingMember | null>(null)
  const [, startTransition] = useTransition()

  function approve(m: PendingMember) {
    setBusyId(m.id)
    startTransition(async () => {
      const result = await approveUser(m.id)
      setBusyId(null)
      if (result.message) toast.error(result.message)
      else toast.success(`${m.first_name} is approved and can now use the directory.`)
    })
  }

  function reject(m: PendingMember) {
    setBusyId(m.id)
    startTransition(async () => {
      const result = await rejectUser(m.id)
      setBusyId(null)
      if (result.message) toast.error(result.message)
      else toast.success(`${m.first_name}'s request was declined.`)
    })
  }

  return (
    <ul className="divide-y divide-border">
      {members.map((m) => {
        const busy = busyId === m.id
        return (
          <li key={m.id} className={cn('flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start', busy && 'opacity-60')}>
            <MemberAvatar firstName={m.first_name} lastName={m.last_name} avatarUrl={m.avatar_url} size={48} />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">
                  {m.first_name} {m.last_name}
                </p>
                <RoleMarker role={m.role} />
                {!m.avatar_url && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning-soft-foreground">
                    <Camera className="size-3" aria-hidden="true" /> No photo
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                Registered {new Date(m.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                {m.chapterLabel ? ` · ${m.chapterLabel}` : ' · No chapter assigned'}
              </p>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <li className="inline-flex items-center gap-1.5">
                  <Phone className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  {m.phone ? <span className="font-medium tabular-nums">{m.phone}</span> : <span className="text-muted-foreground italic">No phone</span>}
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <Mail className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  {m.email ? <span className="truncate">{m.email}</span> : <span className="text-muted-foreground italic">No email</span>}
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <ExternalLink className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  {m.linkedin ? (
                    <a href={m.linkedin} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline">
                      LinkedIn
                    </a>
                  ) : (
                    <span className="text-muted-foreground italic">No LinkedIn</span>
                  )}
                </li>
              </ul>
              {!m.canApprove && <p className="text-xs font-medium text-destructive">{CONTACT_REQUIRED_FOR_APPROVAL_MESSAGE}</p>}
            </div>
            <div className="flex shrink-0 gap-2">
              <Button type="button" size="sm" disabled={!m.canApprove || busy} onClick={() => approve(m)}>
                {busy ? 'Working…' : 'Approve'}
              </Button>
              <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={() => setRejecting(m)}>
                Decline
              </Button>
            </div>
          </li>
        )
      })}

      <AlertDialog open={rejecting !== null} onOpenChange={(open) => !open && setRejecting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline {rejecting?.first_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Their account is suspended and they cannot use the directory. You can ask the founder to restore it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep pending</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const t = rejecting
                setRejecting(null)
                if (t) reject(t)
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
