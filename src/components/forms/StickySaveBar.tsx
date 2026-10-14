'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Appears at the bottom of a form only while there are unsaved changes. */
export function StickySaveBar({
  visible,
  isPending,
  onDiscard,
  saveLabel = 'Save changes',
  className,
}: {
  visible: boolean
  isPending: boolean
  onDiscard: () => void
  saveLabel?: string
  className?: string
}) {
  if (!visible) return null
  return (
    <div
      role="region"
      aria-label="Unsaved changes"
      className={cn(
        'sticky bottom-3 z-30 flex items-center justify-between gap-3 rounded-xl bg-card/95 p-3 shadow-lg ring-1 ring-foreground/10 backdrop-blur',
        'animate-in fade-in-0 slide-in-from-bottom-2 duration-base',
        className
      )}
    >
      <p className="text-sm font-medium">
        <span className="mr-2 inline-block size-2 rounded-full bg-warning align-middle" aria-hidden="true" />
        Unsaved changes
      </p>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onDiscard} disabled={isPending}>
          Discard
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : saveLabel}
        </Button>
      </div>
    </div>
  )
}
