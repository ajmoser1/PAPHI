'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const STORAGE_KEY = 'pending-approval-notice-dismissed'

export function PendingApprovalNotice() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === '1') return
    } catch {
      // sessionStorage unavailable — still show the dialog
    }
    setOpen(true)
  }, [])

  function dismiss() {
    try {
      sessionStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // ignore
    }
    setOpen(false)
  }

  return (
    <Dialog open={open} disablePointerDismissal onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md"
        role="alertdialog"
      >
        <DialogHeader>
          <DialogTitle className="text-lg">Your account is pending approval</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-foreground/80">
            Complete your profile below. You can browse members, but you can&apos;t send messages
            until a chapter admin approves your account.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-stretch">
          <Button type="button" className="w-full" onClick={dismiss}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
