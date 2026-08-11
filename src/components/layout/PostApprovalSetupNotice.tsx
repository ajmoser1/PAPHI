'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function PostApprovalSetupNotice({
  storageKey = 'post-approval-setup-dismissed',
}: {
  storageKey?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      if (sessionStorage.getItem(storageKey) === '1') return
    } catch {
      // still show
    }
    setOpen(true)
  }, [storageKey])

  function remindLater() {
    try {
      sessionStorage.setItem(storageKey, '1')
    } catch {
      // ignore
    }
    setOpen(false)
  }

  function finishNow() {
    try {
      sessionStorage.setItem(storageKey, '1')
    } catch {
      // ignore
    }
    setOpen(false)
    router.push('/profile/edit?setup=1')
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md"
        role="alertdialog"
      >
        <DialogHeader>
          <DialogTitle className="text-lg">You&apos;re approved — finish your profile</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-foreground/80">
            Add work experience and contact details so brothers can find you. Privacy and who can
            see your contact info are in Settings.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button type="button" className="w-full" onClick={finishNow}>
            Finish profile
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              try {
                sessionStorage.setItem(storageKey, '1')
              } catch {
                // ignore
              }
              setOpen(false)
              router.push('/settings')
            }}
          >
            Open Settings
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={remindLater}>
            Remind me later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
