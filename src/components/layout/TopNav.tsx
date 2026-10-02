'use client'

import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TopNavProps {
  firstName: string
  role: string
  status: string
  brandTitle?: string
  mobileOpen: boolean
  onToggle: () => void
  unreadCount?: number
}

export function TopNav({ brandTitle = 'PA PHI', mobileOpen, onToggle }: TopNavProps) {
  return (
    <header className="lg:hidden sticky top-0 z-40 bg-sidebar flex items-center gap-3 px-4 py-3">
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={mobileOpen}
        aria-controls="app-sidebar"
        className="size-11 text-sidebar-foreground hover:bg-sidebar-accent"
      >
        {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
      </Button>
      <span
        className="text-xl text-[var(--gold)]"
        style={{ fontFamily: 'var(--font-heading)', letterSpacing: '0.0em' }}
      >
        {brandTitle.length > 16 ? brandTitle.split(' ').slice(-2).join(' ') : brandTitle}
      </span>
    </header>
  )
}
