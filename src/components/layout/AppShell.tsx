'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'
import { SearchScopeToggle } from './SearchScopeToggle'

interface AppShellProps {
  children: React.ReactNode
  role: string
  firstName: string
  status: string
  brandTitle?: string
  searchScope?: string
  showFounderLink?: boolean
  unreadCount?: number
}

export function AppShell({
  children,
  role,
  firstName,
  status,
  brandTitle = 'PA PHI',
  searchScope = 'fraternity',
  showFounderLink = false,
  unreadCount = 0,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const isPending = status === 'pending_approval'

  return (
    <div className="flex h-dvh overflow-hidden bg-[oklch(0.97_0.005_78)]">
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
          status={status}
          brandTitle={brandTitle}
          showFounderLink={showFounderLink}
          unreadCount={unreadCount}
          onNavClick={() => setMobileOpen(false)}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <TopNav
          firstName={firstName}
          role={role}
          status={status}
          brandTitle={brandTitle}
          mobileOpen={mobileOpen}
          onToggle={() => setMobileOpen((o) => !o)}
        />
        <div className="hidden lg:flex items-center justify-end px-6 py-2 border-b bg-white/50">
          <SearchScopeToggle currentScope={searchScope} />
        </div>
        {isPending && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 text-sm text-amber-900">
            Your account is pending approval. Complete your profile below — you can browse members but
            can&apos;t message until approved.
          </div>
        )}
        <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  )
}
