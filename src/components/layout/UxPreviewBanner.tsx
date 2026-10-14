'use client'

import { clearUxPreviewMode } from '@/actions/founder'
import { Button } from '@/components/ui/button'
import type { UxPreviewMode } from '@/lib/ux-preview-shared'

const LABELS: Record<UxPreviewMode, string> = {
  pending: 'Pending approval',
  post_approval: 'Just approved',
}

export function UxPreviewBanner({ mode }: { mode: UxPreviewMode }) {
  return (
    <div className="border-b border-info/40 bg-info-soft px-4 py-2 sm:px-6">
      <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-info-soft-foreground">
          <span className="font-semibold">Founder UX preview:</span> {LABELS[mode]} — your real
          account is unchanged.
        </p>
        <form action={clearUxPreviewMode}>
          <Button type="submit" size="sm" variant="outline" className="bg-card">
            Exit preview
          </Button>
        </form>
      </div>
    </div>
  )
}
