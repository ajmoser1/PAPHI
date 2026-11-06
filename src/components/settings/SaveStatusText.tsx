'use client'

import { Check, Loader2 } from 'lucide-react'
import type { SaveStatus } from './useAutosave'

/** Tiny inline "Saving… / Saved" next to a section heading. */
export function SaveStatusText({ status, error }: { status: SaveStatus; error: string | null }) {
  if (status === 'idle') return <span className="sr-only" aria-live="polite" />
  return (
    <span aria-live="polite" className="inline-flex items-center gap-1 text-xs font-medium">
      {status === 'saving' && (
        <>
          <Loader2 className="size-3 animate-spin text-muted-foreground" aria-hidden="true" />
          <span className="text-muted-foreground">Saving…</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <Check className="size-3 text-success" aria-hidden="true" />
          <span className="text-success-soft-foreground">Saved</span>
        </>
      )}
      {status === 'error' && <span className="text-destructive">{error ?? 'Could not save.'}</span>}
    </span>
  )
}
