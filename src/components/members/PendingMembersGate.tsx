import type { ChapterAdminContactsResult } from '@/lib/chapter-admins'
import { ChapterAdminContactCard } from '@/components/layout/ChapterAdminContactCard'

// Placeholder cards only — pending members must never receive real directory
// rows (CSS blur is not access control; the HTML would still contain them).
const PLACEHOLDER_COUNT = 8

export function PendingMembersGate({
  adminContacts,
}: {
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

      <div className="relative">
        <div
          className="pointer-events-none select-none grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 blur-sm opacity-60"
          aria-hidden
        >
          {Array.from({ length: PLACEHOLDER_COUNT }, (_, i) => (
            <div key={i} className="rounded-xl overflow-hidden shadow-sm border border-border">
              <div className="relative aspect-square bg-primary/8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/default-avatar.svg" alt="" className="w-full h-full object-cover" />
              </div>
              <div className="bg-white px-3 py-2.5 space-y-1.5">
                <div className="h-3.5 w-3/4 rounded bg-muted" />
                <div className="h-3 w-1/2 rounded bg-muted/70" />
              </div>
            </div>
          ))}
        </div>
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="max-w-sm rounded-xl border bg-background/95 px-5 py-4 text-center shadow-sm backdrop-blur-sm">
            <p className="font-semibold text-primary">Profiles locked until approval</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Reach out to your chapter admin above if you&apos;ve been waiting a while.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
