'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { setSearchScope } from '@/actions/chapter-admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SEARCH_SCOPE } from '@/lib/constants'
import { buildMembersQuery, type MemberSearchSort, type SearchState } from '@/lib/member-search'
import { cn } from '@/lib/utils'

type IndustryOption = { id: string; name: string }
type CompanyOption = { id: string; name: string; industry_id: string | null }

const SORT_OPTIONS: { value: MemberSearchSort; label: string }[] = [
  { value: 'name', label: 'Name A–Z' },
  { value: 'class_desc', label: 'Class year, newest first' },
  { value: 'class_asc', label: 'Class year, oldest first' },
  { value: 'chapter', label: 'Chapter' },
]

const selectClass =
  'h-11 w-full rounded-lg border border-input bg-card px-3 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:h-10 md:text-sm'

function SegmentedScope({ scope }: { scope: string }) {
  const [isPending, startTransition] = useTransition()
  const isFraternity = scope === SEARCH_SCOPE.FRATERNITY
  function change(next: 'fraternity' | 'chapter') {
    startTransition(async () => {
      try {
        await setSearchScope(next)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not change who you search.')
      }
    })
  }
  const base =
    'h-9 rounded-md px-3 text-sm font-medium transition-colors duration-fast outline-none focus-visible:ring-2 focus-visible:ring-ring'
  return (
    <div
      role="group"
      aria-label="Who to search"
      className={cn('inline-flex shrink-0 gap-0.5 rounded-lg bg-muted p-0.5', isPending && 'opacity-60')}
    >
      <button
        type="button"
        aria-pressed={!isFraternity}
        aria-disabled={isPending}
        onClick={() => !isPending && isFraternity && change(SEARCH_SCOPE.CHAPTER)}
        className={cn(base, !isFraternity ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground')}
      >
        My chapter
      </button>
      <button
        type="button"
        aria-pressed={isFraternity}
        aria-disabled={isPending}
        onClick={() => !isPending && !isFraternity && change(SEARCH_SCOPE.FRATERNITY)}
        className={cn(base, isFraternity ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground')}
      >
        All chapters
      </button>
    </div>
  )
}

export function SearchToolbar({
  initial,
  searchScope,
  industries,
  companies,
}: {
  initial: SearchState
  searchScope: string
  industries: IndustryOption[]
  companies: CompanyOption[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [state, setState] = useState<SearchState>(initial)
  const [open, setOpen] = useState(false)
  const latest = useRef(state)
  latest.current = state
  // The last query we asked the server for. If the member has typed past it,
  // keep their text when the (older) server response lands.
  const requestedQ = useRef(initial.q)

  useEffect(() => {
    setState((s) => (s.q !== requestedQ.current ? { ...initial, q: s.q } : initial))
  }, [initial])

  const filteredCompanies = useMemo(
    () => (state.industry ? companies.filter((c) => c.industry_id === state.industry) : companies),
    [companies, state.industry]
  )

  function navigate(next: Partial<SearchState>) {
    const merged = { ...latest.current, ...next }
    requestedQ.current = merged.q
    setState(merged)
    startTransition(() => router.replace(buildMembersQuery(merged)))
  }

  // Debounce typed queries; other filters navigate immediately.
  useEffect(() => {
    if (state.q.trim() === requestedQ.current.trim()) return
    const handle = window.setTimeout(() => navigate({ q: state.q }), 300)
    return () => window.clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.q])

  const industryName = industries.find((i) => i.id === state.industry)?.name
  const companyName = companies.find((c) => c.id === state.company)?.name
  const sortLabel = SORT_OPTIONS.find((s) => s.value === state.sort)?.label
  const activeFilters = [state.industry, state.company, state.alumni, state.sort !== 'name'].filter(Boolean).length
  const hasAny = activeFilters > 0 || state.q.trim() !== ''

  return (
    <div className={cn('space-y-3 transition-opacity duration-fast', isPending && 'opacity-70')} aria-busy={isPending}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="members-search"
            type="search"
            value={state.q}
            onChange={(e) => setState((s) => ({ ...s, q: e.target.value }))}
            autoComplete="off"
            placeholder="Search by name, company, or field. Try “Goldman” or “product”."
            className="h-12 rounded-full bg-card pr-4 pl-12 shadow-xs md:h-11"
            aria-label="Search members"
          />
        </div>
        <div className="flex items-center gap-2">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger render={<Button variant="outline" className="rounded-full" />}>
              <SlidersHorizontal data-icon="inline-start" aria-hidden="true" />
              Filters
              {activeFilters > 0 && (
                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                  {activeFilters}
                </span>
              )}
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)] space-y-4 p-4">
              <div className="space-y-1.5">
                <Label htmlFor="filter-industry">Career field</Label>
                <select
                  id="filter-industry"
                  value={state.industry}
                  onChange={(e) => {
                    const value = e.target.value
                    const stillValid = value ? companies.some((c) => c.id === state.company && c.industry_id === value) : true
                    navigate({ industry: value, company: stillValid ? state.company : '' })
                  }}
                  className={selectClass}
                >
                  <option value="">Any field</option>
                  {industries.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">What a brother does, like finance or software.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="filter-company">Company</Label>
                <select
                  id="filter-company"
                  value={state.company}
                  onChange={(e) => navigate({ company: e.target.value })}
                  className={selectClass}
                >
                  <option value="">Any company</option>
                  {filteredCompanies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border px-3 text-sm">
                <input
                  type="checkbox"
                  checked={state.alumni}
                  onChange={(e) => navigate({ alumni: e.target.checked })}
                  className="size-4 accent-primary"
                />
                <span>
                  <span className="block font-medium">Alumni only</span>
                  <span className="block text-xs text-muted-foreground">Graduated brothers, usually working.</span>
                </span>
              </label>
              <div className="space-y-1.5">
                <Label htmlFor="filter-sort">Sort by</Label>
                <select
                  id="filter-sort"
                  value={state.sort}
                  onChange={(e) => navigate({ sort: e.target.value as MemberSearchSort })}
                  className={selectClass}
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-between gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={activeFilters === 0}
                  onClick={() => navigate({ industry: '', company: '', alumni: false, sort: 'name' })}
                >
                  Clear filters
                </Button>
                <Button type="button" size="sm" onClick={() => setOpen(false)}>
                  Done
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <SegmentedScope scope={searchScope} />
        </div>
      </div>

      {hasAny && (
        <ul className="flex flex-wrap items-center gap-2" aria-label="Active filters">
          {state.q.trim() && <Chip label={`“${state.q.trim()}”`} onRemove={() => navigate({ q: '' })} />}
          {industryName && <Chip label={industryName} onRemove={() => navigate({ industry: '', company: '' })} />}
          {companyName && <Chip label={companyName} onRemove={() => navigate({ company: '' })} />}
          {state.alumni && <Chip label="Alumni only" onRemove={() => navigate({ alumni: false })} />}
          {state.sort !== 'name' && sortLabel && <Chip label={`Sorted: ${sortLabel}`} onRemove={() => navigate({ sort: 'name' })} />}
          <li>
            <button
              type="button"
              onClick={() => navigate({ q: '', industry: '', company: '', alumni: false, sort: 'name' })}
              className="min-h-8 px-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Clear all
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <li className="inline-flex h-8 items-center gap-1 rounded-full bg-primary-soft pr-1 pl-3 text-sm font-medium text-primary">
      <span className="max-w-48 truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter ${label}`}
        className="flex size-6 items-center justify-center rounded-full hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-ring outline-none"
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </li>
  )
}
