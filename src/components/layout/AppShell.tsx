'use client'

import { useMemo } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { UxPreviewMode } from '@/lib/ux-preview-shared'
import { AppHeader } from './AppHeader'
import type { Brand } from './BrandMark'
import { PendingApprovalBanner } from './PendingApprovalBanner'
import { PhotoRequiredDialog } from './PhotoRequiredDialog'
import { PostApprovalSetupNotice } from './PostApprovalSetupNotice'
import { SidebarNav } from './SidebarNav'
import type { UserMenuUser } from './UserMenu'
import { UxPreviewBanner } from './UxPreviewBanner'
import { buildNav } from './nav-config'

export type AppShellProps = {
  children: React.ReactNode
  user: UserMenuUser
  status: string
  brand: Brand
  showFounderLink?: boolean
  unreadCount?: number
  needsProfileSetup?: boolean
  forceVisibleContact?: boolean
  needsPhoto?: boolean
  uxPreviewMode?: UxPreviewMode | null
}

export function AppShell({
  children,
  user,
  status,
  brand,
  showFounderLink = false,
  unreadCount = 0,
  needsProfileSetup = false,
  forceVisibleContact = false,
  needsPhoto = false,
  uxPreviewMode = null,
}: AppShellProps) {
  const groups = useMemo(
    () => buildNav({ role: user.role, status, showFounderLink }),
    [user.role, status, showFounderLink]
  )
  const isPending = status === 'pending_approval'

  return (
    <TooltipProvider>
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <div className="flex min-h-dvh bg-page">
        <SidebarNav brand={brand} groups={groups} unreadCount={unreadCount} />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader brand={brand} groups={groups} user={user} status={status} unreadCount={unreadCount} />
          {uxPreviewMode && <UxPreviewBanner mode={uxPreviewMode} />}
          {isPending && <PendingApprovalBanner />}
          {needsPhoto && (
            <PhotoRequiredDialog
              initials={`${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase() || '?'}
            />
          )}
          {!needsPhoto && (forceVisibleContact || needsProfileSetup) && (
            <PostApprovalSetupNotice
              forceVisibleContact={forceVisibleContact}
              storageKey={
                uxPreviewMode === 'post_approval'
                  ? 'post-approval-setup-dismissed:preview'
                  : 'post-approval-setup-dismissed'
              }
            />
          )}
          <main id="main" tabIndex={-1} className="mx-auto w-full max-w-content flex-1 p-4 outline-none md:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}
