import type { LucideIcon } from 'lucide-react'
import { Users, MessageSquare, UserRound, Settings, Shield } from 'lucide-react'
import { isAdminRole, isGhost } from '@/lib/constants'

export type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  /** Show the unread-messages count next to this item. */
  badge?: 'unread'
}

export type NavGroup = {
  id: 'chapter' | 'admin' | 'platform'
  /** Eyebrow label above the group. The first group has none. */
  label?: string
  items: NavItem[]
}

export function buildNav(opts: { role: string; status: string; showFounderLink?: boolean }): NavGroup[] {
  const ghost = isGhost(opts.status)
  const groups: NavGroup[] = [
    {
      id: 'chapter',
      items: [
        { href: '/members', label: 'Find a Brother', icon: Users },
        ...(!ghost ? [{ href: '/messages', label: 'Messages', icon: MessageSquare, badge: 'unread' as const }] : []),
        { href: '/profile/edit', label: 'My profile', icon: UserRound },
        { href: '/settings', label: 'Settings', icon: Settings },
      ],
    },
  ]

  if (isAdminRole(opts.role)) {
    groups.push({
      id: 'admin',
      label: 'Administration',
      items: [{ href: '/admin', label: 'Admin dashboard', icon: Shield }],
    })
  }

  return groups
}

const EXTRA_TITLES: Array<[RegExp, string]> = [
  [/^\/members\/[^/]+$/, 'Member profile'],
  [/^\/messages\/[^/]+$/, 'Conversation'],
]

export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === '/admin') return pathname === '/admin' || pathname.startsWith('/admin/')
  return pathname === href || pathname.startsWith(href + '/')
}

/** Header title for the current route, from the nav config. */
export function titleForPathname(groups: NavGroup[], pathname: string): string {
  for (const [re, title] of EXTRA_TITLES) {
    if (re.test(pathname)) return title
  }
  let best: NavItem | null = null
  for (const g of groups) {
    for (const item of g.items) {
      if (isNavItemActive(item.href, pathname) && (!best || item.href.length > best.href.length)) best = item
    }
  }
  return best?.label ?? ''
}
