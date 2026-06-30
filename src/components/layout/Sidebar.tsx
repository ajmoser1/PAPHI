'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, MessageSquare, User, Shield, LogOut, Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { logout } from '@/actions/auth'
import { isAdminRole, isGhost } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

interface SidebarProps {
  role: string
  status: string
  brandTitle?: string
  showFounderLink?: boolean
  unreadCount?: number
  onNavClick?: () => void
}

export function Sidebar({
  role,
  status,
  brandTitle = 'PA PHI',
  showFounderLink = false,
  unreadCount = 0,
  onNavClick,
}: SidebarProps) {
  const pathname = usePathname()
  const ghost = isGhost(status)

  const navItems: NavItem[] = [
    { href: '/members', label: 'Find a Brother', icon: <Users className="h-4 w-4" /> },
    ...(!ghost
      ? [{ href: '/messages', label: 'Messages', icon: <MessageSquare className="h-4 w-4" /> }]
      : []),
    { href: '/profile/edit', label: 'Profile', icon: <User className="h-4 w-4" /> },
  ]

  if (isAdminRole(role)) {
    navItems.push({ href: '/admin', label: 'Admin', icon: <Shield className="h-4 w-4" /> })
  }

  if (showFounderLink) {
    navItems.push({ href: '/founder', label: 'Founder', icon: <Crown className="h-4 w-4" /> })
  }

  const shortTitle = brandTitle.length > 12 ? brandTitle.split(' ').slice(-2).join(' ') : brandTitle

  return (
    <aside className="flex flex-col w-60 bg-sidebar h-full p-4 gap-1">
      <div className="px-3 pt-2 pb-5">
        <span
          className="text-xl text-[var(--gold)] tracking-wide uppercase line-clamp-2"
          style={{ fontFamily: 'var(--font-heading)' }}
          title={brandTitle}
        >
          {shortTitle}
        </span>
      </div>

      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavClick}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.href === '/messages' && unreadCount > 0 && (
              <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        )
      })}

      <div className="mt-auto">
        <form action={logout}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent gap-3"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  )
}
