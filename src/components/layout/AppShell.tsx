'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'
import { PendingApprovalBanner } from './PendingApprovalBanner'
import { PostApprovalSetupNotice } from './PostApprovalSetupNotice'
import { UxPreviewBanner } from './UxPreviewBanner'
import type { UxPreviewMode } from '@/lib/ux-preview'

interface AppShellProps {
  children: React.ReactNode
  role: string
  firstName: string
  status: string
  brandTitle?: string
  showFounderLink?: boolean
  unreadCount?: number
  needsProfileSetup?: boolean
  forceVisibleContact?: boolean
  uxPreviewMode?: UxPreviewMode | null
}

export function AppShell({
  children,
  role,
  firstName,
  status,
  brandTitle = 'PA PHI',
  showFounderLink = false,
  unreadCount = 0,
  needsProfileSetup = false,
  forceVisibleContact = false,
  uxPreviewMode = null,
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
        {uxPreviewMode && <UxPreviewBanner mode={uxPreviewMode} />}
        {isPending && <PendingApprovalBanner />}
        {(forceVisibleContact || needsProfileSetup) && (
          <PostApprovalSetupNotice
            forceVisibleContact={forceVisibleContact}
            storageKey={
              uxPreviewMode === 'post_approval'
                ? 'post-approval-setup-dismissed:preview'
                : 'post-approval-setup-dismissed'
            }
          />
        )}
        <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  )
}
