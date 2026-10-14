'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Camera, Search } from 'lucide-react'
import { removeAcceptedProfile } from '@/actions/admin'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MemberAvatar } from '@/components/members/MemberAvatar'
import { RoleMarker } from '@/components/members/RoleMarker'

export type ActiveMember = {
  id: string
  first_name: string
  last_name: string
  role: string
  created_at: string
  avatar_url: string | null
  graduation_year: number | null
  chapterLabel: string | null
}

const PAGE = 25

export function MembersTable({ members }: { members: ActiveMember[] }) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [removing, setRemoving] = useState<ActiveMember | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return members
    return members.filter((m) => `${m.first_name} ${m.last_name} ${m.chapterLabel ?? ''}`.toLowerCase().includes(q))
  }, [members, query])
  const visible = filtered.slice(0, PAGE * page)

  function remove(m: ActiveMember) {
    startTransition(async () => {
      const result = await removeAcceptedProfile(m.id)
      if (result.message) toast.error(result.message)
      else toast.success(`${m.first_name} ${m.last_name} was removed.`)
    })
  }

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setPage(1)
          }}
          placeholder="Search members"
          aria-label="Search active members"
          className="bg-card pl-9"
        />
      </div>
      {filtered.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground">No members match.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Photo</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <Link href={`/members/${m.id}`} className="flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <MemberAvatar firstName={m.first_name} lastName={m.last_name} avatarUrl={m.avatar_url} size={40} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {m.first_name} {m.last_name}
                        </span>
                        {m.chapterLabel && <span className="block truncate text-xs text-muted-foreground">{m.chapterLabel}</span>}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <RoleMarker role={m.role} />
                  </TableCell>
                  <TableCell className="tabular-nums">{m.graduation_year ?? '—'}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground" suppressHydrationWarning>
                    {new Date(m.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </TableCell>
                  <TableCell>
                    {m.avatar_url ? (
                      <span className="text-success">Yes</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-warning-soft-foreground">
                        <Camera className="size-3.5" aria-hidden="true" /> Missing
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button type="button" size="sm" variant="destructive" disabled={isPending} onClick={() => setRemoving(m)}>
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {visible.length < filtered.length && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {visible.length} of {filtered.length}
          </span>
          <Button type="button" variant="outline" size="sm" onClick={() => setPage((p) => p + 1)}>
            Show more
          </Button>
        </div>
      )}

      <AlertDialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {removing?.first_name} {removing?.last_name}?
            </AlertDialogTitle>
            <AlertDialogDescription>They lose access to the directory and messaging. Their profile is suspended, not deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const t = removing
                setRemoving(null)
                if (t) remove(t)
              }}
            >
              Remove member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
