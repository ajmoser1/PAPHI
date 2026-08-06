'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function InviteLinkCard({
  inviteUrl,
  emptyPending = false,
}: {
  inviteUrl: string
  emptyPending?: boolean
}) {
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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Invite brothers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-foreground">
          {emptyPending
            ? 'Share this link to get your first members. They register with a phone number, then appear here for approval.'
            : 'Share this link so brothers can register. They join with a phone number, then appear below for approval.'}
        </p>
        <code className="text-xs bg-muted p-2 rounded block break-all">{inviteUrl}</code>
        <Button type="button" variant="outline" size="sm" onClick={copyLink}>
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy link
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
