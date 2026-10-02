'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
    <div role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-6xl items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-semibold text-amber-950">Your account is pending approval</p>
          <p className="text-sm text-amber-900/90">
            Finish your profile. Member profiles stay locked until a chapter admin approves you.
            On Find a Brother you can see who to contact if you&apos;ve been waiting.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!onProfilePage && (
            <Link
              href="/profile/edit"
              className={cn(buttonVariants({ size: 'sm' }), 'h-9 bg-primary text-primary-foreground')}
            >
              Set up profile
            </Link>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 text-amber-900 hover:bg-amber-100"
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
