'use client'

import { BrandMark, type Brand } from './BrandMark'
import { NavList } from './NavList'
import type { NavGroup } from './nav-config'

export function SidebarNav({ brand, groups, unreadCount }: { brand: Brand; groups: NavGroup[]; unreadCount: number }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:sticky lg:top-0 lg:flex lg:h-dvh">
      <div className="px-4 pt-5 pb-4">
        <BrandMark brand={brand} />
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <NavList groups={groups} unreadCount={unreadCount} />
      </div>
    </aside>
  )
}
