'use client'

import { useState } from 'react'
import { Check, Copy, ExternalLink, Mail, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'

const ICONS = { email: Mail, phone: Phone, linkedin: ExternalLink } as const

/** One contact method with a copy button. `kind` is a string so server pages can render this client component. */
export function ContactRow({
  kind,
  label,
  value,
  href,
  external,
}: {
  kind: keyof typeof ICONS
  label: string
  value: string
  href: string
  external?: boolean
}) {
  const Icon = ICONS[kind]
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard unavailable; the link still works
    }
  }

  return (
    <li className="flex items-center gap-3 py-2">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <a
          href={href}
          target={external ? '_blank' : undefined}
          rel={external ? 'noopener noreferrer' : undefined}
          className="block truncate text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {value}
        </a>
      </div>
      <Button type="button" variant="ghost" size="icon-sm" onClick={copy} aria-label={copied ? 'Copied' : `Copy ${label}`}>
        {copied ? <Check className="text-success" aria-hidden="true" /> : <Copy aria-hidden="true" />}
      </Button>
    </li>
  )
}
