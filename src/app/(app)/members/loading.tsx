import { Skeleton } from '@/components/ui/skeleton'

export default function MembersLoading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading members">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-11 w-72 max-w-full" />
        <Skeleton className="h-4 w-56" />
      </div>
      <Skeleton className="mb-4 h-11 w-full rounded-full" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
            <Skeleton className="size-14 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
