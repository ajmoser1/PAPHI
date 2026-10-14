'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { isNavItemActive, type NavGroup } from './nav-config'

type NavListProps = {
  groups: NavGroup[]
  unreadCount?: number
  onNavigate?: () => void
  className?: string
}

export function NavList({ groups, unreadCount = 0, onNavigate, className }: NavListProps) {
  const pathname = usePathname()

  return (
    <nav aria-label="Main navigation" className={cn('flex flex-col gap-1', className)}>
      {groups.map((group) => (
        <div key={group.id} className={cn(group.label && 'mt-4')}>
          {group.label && (
            <p className="eyebrow px-3 pb-1.5 text-sidebar-foreground/50">{group.label}</p>
          )}
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = isNavItemActive(item.href, pathname)
              const Icon = item.icon
              const showBadge = item.badge === 'unread' && unreadCount > 0
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium lg:min-h-10',
                      'text-sidebar-foreground/75 transition-colors duration-fast hover:bg-sidebar-hover hover:text-sidebar-foreground',
                      'outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar',
                      active && 'bg-sidebar-primary font-semibold text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground'
                    )}
                  >
                    <Icon className="size-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                    {showBadge && (
                      <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-sidebar-primary px-1.5 text-xs font-bold text-sidebar-primary-foreground ring-2 ring-sidebar">
                        <span aria-hidden="true">{unreadCount > 9 ? '9+' : unreadCount}</span>
                        <span className="sr-only">{unreadCount} unread</span>
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
