'use client'

import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TopNavProps {
  firstName: string
  role: string
  mobileOpen: boolean
  onToggle: () => void
  unreadCount?: number
}

export function TopNav({ firstName, mobileOpen, onToggle }: TopNavProps) {
  return (
    <header className="lg:hidden sticky top-0 z-40 bg-sidebar flex items-center gap-3 px-4 py-3">
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="text-sidebar-foreground hover:bg-sidebar-accent"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>
      <span
        className="text-xl text-[var(--gold)]"
        style={{ fontFamily: 'var(--font-heading)', letterSpacing: '0.0em' }}
      >
        PA PHI
      </span>
    </header>
  )
}
