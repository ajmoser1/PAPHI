'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'

interface AppShellProps {
  children: React.ReactNode
  role: string
  firstName: string
  unreadCount?: number
}

export function AppShell({ children, role, firstName, unreadCount = 0 }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-dvh overflow-hidden bg-[oklch(0.97_0.005_78)]">
      {/* Sidebar — width animates on mobile, fixed on desktop */}
      <div
        className={[
          'flex-shrink-0 overflow-hidden',
          'transition-[width] duration-300 ease-in-out',
          mobileOpen ? 'w-60' : 'w-0',
          'lg:w-60',
        ].join(' ')}
      >
        <Sidebar
          role={role}
          unreadCount={unreadCount}
          onNavClick={() => setMobileOpen(false)}
        />
      </div>

      {/* Content area — this is the scroll container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <TopNav
          firstName={firstName}
          role={role}
          mobileOpen={mobileOpen}
          onToggle={() => setMobileOpen((o) => !o)}
        />
        <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  )
}
