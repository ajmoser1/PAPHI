'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { BrandMark, type Brand } from './BrandMark'
import { NavList } from './NavList'
import type { NavGroup } from './nav-config'

export function MobileNav({ brand, groups, unreadCount }: { brand: Brand; groups: NavGroup[]; unreadCount: number }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close after navigation.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation" />}
      >
        <Menu className="size-5" aria-hidden="true" />
      </SheetTrigger>
      <SheetContent
        side="left"
        showCloseButton={false}
        className="w-80 max-w-[85vw] gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
      >
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <div className="flex h-16 items-center justify-between gap-3 px-4">
          <BrandMark brand={brand} />
          <SheetClose
            render={
              <Button
                variant="ghost"
                size="icon"
                className="text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-foreground focus-visible:ring-sidebar-ring"
                aria-label="Close navigation"
              />
            }
          >
            <X className="size-5" aria-hidden="true" />
          </SheetClose>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-6">
          <NavList groups={groups} unreadCount={unreadCount} onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
