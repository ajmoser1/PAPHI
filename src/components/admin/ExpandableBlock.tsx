'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Long lists start collapsed; one click expands them in place. */
export function ExpandableBlock({
  label,
  collapsedHint,
  children,
}: {
  label: string
  collapsedHint?: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex items-center justify-between gap-3 py-1">
        {collapsedHint && !open ? <p className="text-sm text-muted-foreground">{collapsedHint}</p> : <span />}
        <CollapsibleTrigger render={<Button variant="outline" size="sm" />}>
          {open ? 'Hide' : label}
          <ChevronDown data-icon="inline-end" aria-hidden="true" className={cn('transition-transform duration-fast', open && 'rotate-180')} />
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="pt-3">{children}</CollapsibleContent>
    </Collapsible>
  )
}
