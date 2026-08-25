'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
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

  const onContactSetupPage =
    pathname === '/profile/edit' || pathname.startsWith('/settings')

  useEffect(() => {
    if (forceVisibleContact) {
      // Allow the contact forms themselves; block the rest of the app.
      setOpen(!onContactSetupPage)
      return
    }
    try {
      if (sessionStorage.getItem(storageKey) === '1') return
    } catch {
      // still show
    }
    setOpen(true)
  }, [storageKey, forceVisibleContact, onContactSetupPage])

  function remindLater() {
    try {
      sessionStorage.setItem(storageKey, '1')
    } catch {
      // ignore
    }
    setOpen(false)
  }

  function finishNow() {
    if (!forceVisibleContact) {
      try {
        sessionStorage.setItem(storageKey, '1')
      } catch {
        // ignore
      }
    }
    setOpen(false)
    router.push(forceVisibleContact ? '/profile/edit?contact=1' : '/profile/edit?setup=1')
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md"
        role="alertdialog"
      >
        <DialogHeader>
          <DialogTitle className="text-lg">
            {forceVisibleContact
              ? 'Add a contact method brothers can see'
              : 'You\u2019re approved — finish your profile'}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-foreground/80">
            {forceVisibleContact
              ? VISIBLE_CONTACT_REQUIRED_MESSAGE
              : 'Add work experience and contact details so brothers can find you. Privacy and who can see your contact info are in Settings.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button type="button" className="w-full" onClick={finishNow}>
            {forceVisibleContact ? 'Add contact info' : 'Finish profile'}
          </Button>
          {!forceVisibleContact && (
            <>
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
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
