'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { PartyPopper } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { VISIBLE_CONTACT_REQUIRED_MESSAGE } from '@/lib/contact'

/**
 * Two modes:
 * - forceVisibleContact: a member has no contact method brothers can see. This
 *   blocks the app (except Profile and Settings, where they fix it).
 * - otherwise: a one-time "you're approved" nudge. Dismissible with Esc,
 *   outside click, or "Later"; remembered for the session.
 */
export function PostApprovalSetupNotice({
  storageKey = 'post-approval-setup-dismissed',
  forceVisibleContact = false,
}: {
  storageKey?: string
  forceVisibleContact?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const dismissedInMemory = useRef(false)

  const onContactSetupPage = pathname === '/profile/edit' || pathname.startsWith('/settings')

  useEffect(() => {
    if (forceVisibleContact) {
      setOpen(!onContactSetupPage)
      return
    }
    if (dismissedInMemory.current) return
    try {
      if (sessionStorage.getItem(storageKey) === '1') return
    } catch {
      // storage unavailable; the in-memory flag covers this session
    }
    setOpen(true)
  }, [storageKey, forceVisibleContact, onContactSetupPage])

  function remember() {
    dismissedInMemory.current = true
    try {
      sessionStorage.setItem(storageKey, '1')
    } catch {
      // ignore
    }
  }

  function dismiss() {
    remember()
    setOpen(false)
  }

  function finishNow() {
    if (!forceVisibleContact) remember()
    setOpen(false)
    router.push(forceVisibleContact ? '/profile/edit?contact=1' : '/profile/edit?setup=1')
  }

  if (forceVisibleContact) {
    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent showCloseButton={false} role="alertdialog" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="heading-3">Add a contact method brothers can see</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-foreground/80">
              {VISIBLE_CONTACT_REQUIRED_MESSAGE}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" className="w-full sm:w-auto" onClick={finishNow}>
              Add contact info
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : dismiss())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-success-soft text-success-soft-foreground">
            <PartyPopper className="size-5" aria-hidden="true" />
          </div>
          <DialogTitle className="heading-3">You&apos;re approved</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-foreground/80">
            Brothers can now find and message you. Add your current job and career field so the right people
            find you when they search.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="ghost" onClick={dismiss}>
            Later
          </Button>
          <Button type="button" onClick={finishNow}>
            Finish my profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
