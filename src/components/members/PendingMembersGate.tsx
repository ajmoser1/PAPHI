import { Clock } from 'lucide-react'
import type { ChapterAdminContactsResult } from '@/lib/chapter-admins'
import { ChapterAdminContactCard } from '@/components/layout/ChapterAdminContactCard'

// Placeholder cards only — pending members must never receive real directory
// rows (CSS blur is not access control; the HTML would still contain them).
const PLACEHOLDER_COUNT = 6

export function PendingMembersGate({ adminContacts }: { adminContacts: ChapterAdminContactsResult }) {
  return (
    <div className="relative">
      <ul
        className="pointer-events-none grid gap-3 opacity-60 blur-sm select-none sm:grid-cols-2 lg:grid-cols-3"
        aria-hidden
      >
        {Array.from({ length: PLACEHOLDER_COUNT }, (_, i) => (
          <li key={i} className="flex items-center gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
            <div className="size-14 shrink-0 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-2/3 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted/70" />
              <div className="h-3 w-1/3 rounded bg-muted/70" />
            </div>
          </li>
        ))}
      </ul>
      <div className="absolute inset-0 flex items-start justify-center p-4 sm:items-center">
        <div className="w-full max-w-lg space-y-4 rounded-2xl bg-card/95 p-5 shadow-lg ring-1 ring-foreground/10 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning-soft-foreground">
              <Clock className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="heading-3">Your account is awaiting approval</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                A chapter admin reviews every new member. Profiles and messaging unlock as soon as you are
                approved. Finishing your profile now helps them recognize you.
              </p>
            </div>
          </div>
          <ChapterAdminContactCard contacts={adminContacts} />
        </div>
      </div>
    </div>
  )
}
