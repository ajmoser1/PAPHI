'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageSquare } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { isGhost } from '@/lib/constants'
import type { Brand } from './BrandMark'
import { MobileNav } from './MobileNav'
import { UserMenu, type UserMenuUser } from './UserMenu'
import { titleForPathname, type NavGroup } from './nav-config'

type AppHeaderProps = {
  brand: Brand
  groups: NavGroup[]
  user: UserMenuUser
  status: string
  unreadCount: number
}

export function AppHeader({ brand, groups, user, status, unreadCount }: AppHeaderProps) {
  const pathname = usePathname()
  const title = titleForPathname(groups, pathname)
  const canMessage = !isGhost(status)

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-page/90 backdrop-blur supports-backdrop-filter:bg-page/80">
      <div className="mx-auto flex h-14 w-full max-w-content items-center gap-2 px-3 md:px-6 lg:px-8">
        <MobileNav brand={brand} groups={groups} unreadCount={unreadCount} />
        <p className="min-w-0 flex-1 truncate font-heading text-base font-semibold text-foreground">
          {title || brand.title}
        </p>
        {canMessage && (
          <Link
            href="/messages"
            aria-label={unreadCount > 0 ? `Messages, ${unreadCount} unread` : 'Messages'}
            className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'relative')}
          >
            <MessageSquare className="size-5" strokeWidth={1.75} aria-hidden="true" />
            {unreadCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] font-bold text-primary-foreground ring-2 ring-page"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        )}
        <UserMenu user={user} />
      </div>
    </header>
  )
}
