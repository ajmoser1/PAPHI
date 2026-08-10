'use client'

import { clearUxPreviewMode } from '@/actions/founder'
import { Button } from '@/components/ui/button'
import type { UxPreviewMode } from '@/lib/ux-preview'

const LABELS: Record<UxPreviewMode, string> = {
  pending: 'Pending approval',
  post_approval: 'Just approved',
}

export function UxPreviewBanner({ mode }: { mode: UxPreviewMode }) {
  return (
    <div className="border-b border-violet-300 bg-violet-100 px-4 py-2 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-violet-950">
          <span className="font-semibold">Founder UX preview:</span> {LABELS[mode]} — your real
          account is unchanged.
        </p>
        <form action={clearUxPreviewMode}>
          <Button type="submit" size="sm" variant="outline" className="h-8 border-violet-400 bg-white">
            Exit preview
          </Button>
        </form>
      </div>
    </div>
  )
}
