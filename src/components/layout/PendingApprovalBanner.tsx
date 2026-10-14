'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'

const STORAGE_KEY = 'pending-approval-banner-dismissed'

export function PendingApprovalBanner() {
  const [dismissed, setDismissed] = useState(true)
  const onProfilePage = usePathname() === '/profile/edit'

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(STORAGE_KEY) === '1')
    } catch {
      setDismissed(false)
    }
  }, [])

  function dismiss() {
    try {
      sessionStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // ignore
    }
    setDismissed(true)
  }

  if (dismissed) return null

  return (
    <div role="status" className="border-b border-warning/40 bg-warning-soft px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-content items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-semibold text-warning-soft-foreground">Your account is pending approval</p>
          <p className="text-sm text-warning-soft-foreground/90">
            Finish your profile. Member profiles stay locked until a chapter admin approves you.
            On Find a Brother you can see who to contact if you&apos;ve been waiting.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!onProfilePage && (
            <Link
              href="/profile/edit"
              className={buttonVariants({ size: 'sm' })}
            >
              Set up profile
            </Link>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-warning-soft-foreground hover:bg-warning/20"
            onClick={dismiss}
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  )
}
