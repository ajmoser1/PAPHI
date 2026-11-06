'use client'

import { useState } from 'react'
import { Check, Copy, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Inline invite link with a copy button. Flat: no box. */
export function InviteLinkCard({ inviteUrl, emptyPending = false }: { inviteUrl: string; emptyPending?: boolean }) {
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <Link2 className="size-4 text-muted-foreground" aria-hidden="true" />
          Invite link
        </p>
        <p className="text-xs text-muted-foreground">Brothers register with this link and show up here for approval.</p>
        <code className="mt-1 block truncate text-xs text-muted-foreground">{inviteUrl}</code>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={copyLink} className="shrink-0">
        {copied ? <Check data-icon="inline-start" aria-hidden="true" /> : <Copy data-icon="inline-start" aria-hidden="true" />}
        {copied ? 'Copied' : 'Copy link'}
      </Button>
    </div>
  )
}
