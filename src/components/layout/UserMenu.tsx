'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { ChevronDown, LogOut, Settings, Shield, UserRound } from 'lucide-react'
import { logout } from '@/actions/auth'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { isAdminRole } from '@/lib/constants'
import { roleLabel } from '@/lib/labels'

export type UserMenuUser = {
  firstName: string
  lastName: string
  avatarUrl: string | null
  role: string
}

export function UserMenu({ user }: { user: UserMenuUser }) {
  const [isPending, startTransition] = useTransition()
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase() || '?'
  const fullName = `${user.firstName} ${user.lastName}`.trim()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" className="gap-2 pr-2 pl-1.5" aria-label={`Account menu for ${fullName}`} />
        }
      >
        <Avatar>
          {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
          <AvatarFallback className="bg-primary-soft text-primary font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-32 truncate text-sm font-medium sm:inline">{user.firstName}</span>
        <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-1.5">
            <span className="block truncate text-sm font-medium text-foreground">{fullName}</span>
            <span className="block text-xs text-muted-foreground">{roleLabel(user.role)}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href="/profile/edit" />} className="min-h-9 px-2">
            <UserRound /> My profile
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/settings" />} className="min-h-9 px-2">
            <Settings /> Settings
          </DropdownMenuItem>
          {isAdminRole(user.role) && (
            <DropdownMenuItem render={<Link href="/admin" />} className="min-h-9 px-2">
              <Shield /> Admin dashboard
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          className="min-h-9 px-2"
          disabled={isPending}
          onClick={() => startTransition(() => logout())}
        >
          <LogOut /> {isPending ? 'Signing out…' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
