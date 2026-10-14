'use client'

import { useTransition } from 'react'
import { ChevronDown, Eye } from 'lucide-react'
import { clearUxPreviewMode, setUxPreviewMode } from '@/actions/founder'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UX_PREVIEW_MODES, type UxPreviewMode } from '@/lib/ux-preview-shared'

/** Founder-only: preview the app as a pending or just-approved member via a cookie overlay. */
export function UxPreviewMenu({ currentMode }: { currentMode: UxPreviewMode | null }) {
  const [isPending, startTransition] = useTransition()
  const current = UX_PREVIEW_MODES.find((m) => m.id === currentMode)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" disabled={isPending} />}>
        <Eye data-icon="inline-start" aria-hidden="true" />
        {current ? `Previewing: ${current.label}` : 'Preview as…'}
        <ChevronDown data-icon="inline-end" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>See the app as a new member would. Your real role is untouched.</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {UX_PREVIEW_MODES.map((mode) => (
          <DropdownMenuItem key={mode.id} className="min-h-9 flex-col items-start gap-0 px-2" onClick={() => startTransition(() => setUxPreviewMode(mode.id))}>
            <span className="font-medium">{mode.label}</span>
            <span className="text-xs text-muted-foreground">{mode.description}</span>
          </DropdownMenuItem>
        ))}
        {current && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="min-h-9 px-2" onClick={() => startTransition(() => clearUxPreviewMode())}>
              Exit preview
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
