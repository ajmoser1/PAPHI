import type { ChapterAdminContactsResult } from '@/lib/chapter-admins'
import { ChapterAdminContactCard } from '@/components/layout/ChapterAdminContactCard'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type MemberCard = {
  profile_id: string
  first_name: string
  last_name: string
  avatar_url: string | null
  role: string
  current_company: string | null
  graduation_year: number | null
  chapter_name?: string | null
  school_name?: string | null
}

export function PendingMembersGate({
  members,
  isFraternityWide,
  adminContacts,
}: {
  members: MemberCard[]
  isFraternityWide: boolean
  adminContacts: ChapterAdminContactsResult
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
        <p className="font-semibold text-primary">Approval required to view members</p>
        <p className="mt-1 text-muted-foreground">
          Your account is waiting for chapter admin approval. Member profiles unlock once
          you&apos;re approved.
        </p>
      </div>

      <ChapterAdminContactCard contacts={adminContacts} />

      {members.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="font-medium">No members to preview yet</p>
        </div>
      ) : (
        <div className="relative">
          <div
            className="pointer-events-none select-none grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 blur-sm opacity-60"
            aria-hidden
          >
            {members.map((person) => {
              const isAlumni = person.role === 'alumni'
              const isAdmin = person.role === 'admin' || person.role === 'chapter_admin'
              const roleLabel = isAlumni ? 'Alumni' : isAdmin ? 'Admin' : 'Undergrad'
              return (
                <div
                  key={person.profile_id}
                  className={cn(
                    'rounded-xl overflow-hidden shadow-sm border',
                    isAlumni ? 'border-[var(--gold)]/60 ring-1 ring-[var(--gold)]/20' : 'border-border'
                  )}
                >
                  <div className="relative aspect-square bg-primary/8">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={person.avatar_url ?? '/images/default-avatar.svg'}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2">
                      <Badge
                        variant={isAlumni ? 'default' : 'secondary'}
                        className={cn(
                          'text-[10px] uppercase tracking-wide',
                          isAlumni && 'bg-[var(--gold)] text-primary hover:bg-[var(--gold)]',
                          isAdmin && 'bg-primary text-primary-foreground hover:bg-primary'
                        )}
                      >
                        {roleLabel}
                      </Badge>
                    </div>
                  </div>
                  <div className="bg-white px-3 py-2.5">
                    <p className="font-semibold text-sm truncate">
                      {person.first_name} {person.last_name}
                    </p>
                    {person.current_company ? (
                      <p className="text-xs text-muted-foreground truncate">{person.current_company}</p>
                    ) : person.graduation_year ? (
                      <p className="text-xs text-muted-foreground truncate">
                        Class of {person.graduation_year}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground/40 truncate">No company listed</p>
                    )}
                    {isFraternityWide && person.school_name && (
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {person.school_name}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="max-w-sm rounded-xl border bg-background/95 px-5 py-4 text-center shadow-sm backdrop-blur-sm">
              <p className="font-semibold text-primary">Profiles locked until approval</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Reach out to your chapter admin if you&apos;ve been waiting a while.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
