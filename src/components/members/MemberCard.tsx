import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MemberAvatar } from './MemberAvatar'
import { RoleMarker, roleKind } from './RoleMarker'

export type MemberCardData = {
  profile_id: string
  first_name: string
  last_name: string
  avatar_url: string | null
  role: string
  current_company: string | null
  graduation_year: number | null
  chapter_name: string | null
  school_name: string | null
}

function shortSchool(name: string | null): string | null {
  if (!name) return null
  return name.replace(/\s+University$/i, '').replace(/^University of\s+/i, '')
}

export function MemberCard({
  member,
  showChapter,
  backHref,
  className,
}: {
  member: MemberCardData
  showChapter: boolean
  /** Current search URL, so the profile page can return to the same results. */
  backHref?: string
  className?: string
}) {
  const meta = [
    member.graduation_year ? `Class of ${member.graduation_year}` : null,
    showChapter ? member.chapter_name : null,
    showChapter ? shortSchool(member.school_name) : null,
  ].filter(Boolean)

  return (
    <Link
      href={backHref && backHref !== '/members' ? `/members/${member.profile_id}?back=${encodeURIComponent(backHref)}` : `/members/${member.profile_id}`}
      className={cn(
        'group flex items-center gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10 outline-none',
        'transition duration-fast hover:-translate-y-px hover:shadow-md hover:ring-primary/30',
        'focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
    >
      <MemberAvatar
        firstName={member.first_name}
        lastName={member.last_name}
        avatarUrl={member.avatar_url}
        size={56}
        highlight={roleKind(member.role) === 'alumni'}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-semibold text-foreground">
            {member.first_name} {member.last_name}
          </p>
          <RoleMarker role={member.role} />
        </div>
        <p className={cn('truncate text-sm', member.current_company ? 'text-foreground/80' : 'text-muted-foreground/70')}>
          {member.current_company ?? 'No company listed yet'}
        </p>
        {meta.length > 0 && (
          <p className="truncate text-xs text-muted-foreground">{meta.join(' · ')}</p>
        )}
      </div>
      <ChevronRight
        className="size-4 shrink-0 text-muted-foreground/50 transition-colors duration-fast group-hover:text-primary"
        aria-hidden="true"
      />
    </Link>
  )
}
