'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronDown, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { buttonVariants } from '@/components/ui/button'
import { SearchScopeToggle } from '@/components/layout/SearchScopeToggle'
import { cn } from '@/lib/utils'

export type MemberSearchSort = 'name' | 'class_asc' | 'class_desc' | 'chapter'

type IndustryOption = { id: string; name: string }
type CompanyOption = { id: string; name: string; industry_id: string | null }

const SORT_OPTIONS: { value: MemberSearchSort; label: string }[] = [
  { value: 'name', label: 'Name A–Z' },
  { value: 'class_asc', label: 'Class year (oldest first)' },
  { value: 'class_desc', label: 'Class year (newest first)' },
  { value: 'chapter', label: 'Chapter' },
]

function buildMembersQuery(params: {
  q: string
  industry: string
  company: string
  alumni: boolean
  sort: MemberSearchSort
}): string {
  const sp = new URLSearchParams()
  const q = params.q.trim()
  if (q) sp.set('q', q)
  if (params.industry) sp.set('industry', params.industry)
  if (params.company) sp.set('company', params.company)
  if (params.alumni) sp.set('alumni', '1')
  if (params.sort && params.sort !== 'name') sp.set('sort', params.sort)
  const qs = sp.toString()
  return qs ? `/members?${qs}` : '/members'
}

export function MembersSearchBar({
  initialQ,
  initialIndustry,
  initialCompany,
  initialAlumniOnly,
  initialSort,
  searchScope,
  industries,
  companies,
}: {
  initialQ: string
  initialIndustry: string
  initialCompany: string
  initialAlumniOnly: boolean
  initialSort: MemberSearchSort
  searchScope: string
  industries: IndustryOption[]
  companies: CompanyOption[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [q, setQ] = useState(initialQ)
  const [industry, setIndustry] = useState(initialIndustry)
  const [company, setCompany] = useState(initialCompany)
  const [alumniOnly, setAlumniOnly] = useState(initialAlumniOnly)
  const [sort, setSort] = useState<MemberSearchSort>(initialSort)

  useEffect(() => {
    setQ(initialQ)
    setIndustry(initialIndustry)
    setCompany(initialCompany)
    setAlumniOnly(initialAlumniOnly)
    setSort(initialSort)
  }, [initialQ, initialIndustry, initialCompany, initialAlumniOnly, initialSort])

  const filteredCompanies = useMemo(() => {
    if (!industry) return companies
    return companies.filter((c) => c.industry_id === industry)
  }, [companies, industry])

  const suggestionOptions = useMemo(() => {
    const names = new Set<string>()
    for (const i of industries) {
      if (i.name.trim()) names.add(i.name.trim())
    }
    for (const c of companies) {
      if (c.name.trim()) names.add(c.name.trim())
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b))
  }, [industries, companies])

  function navigate(next: {
    q?: string
    industry?: string
    company?: string
    alumni?: boolean
    sort?: MemberSearchSort
  }) {
    const href = buildMembersQuery({
      q: next.q ?? q,
      industry: next.industry ?? industry,
      company: next.company ?? company,
      alumni: next.alumni ?? alumniOnly,
      sort: next.sort ?? sort,
    })
    startTransition(() => {
      router.replace(href)
    })
  }

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (q.trim() === initialQ.trim()) return
      navigate({ q })
    }, 300)
    return () => window.clearTimeout(handle)
    // Only debounce text changes; other filters navigate immediately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const hasFilters = !!(q.trim() || industry || company || alumniOnly || sort !== 'name')

  function onIndustryChange(value: string) {
    setIndustry(value)
    const nextCompanies = value
      ? companies.filter((c) => c.industry_id === value)
      : companies
    const nextCompany = nextCompanies.some((c) => c.id === company) ? company : ''
    if (nextCompany !== company) setCompany(nextCompany)
    navigate({ industry: value, company: nextCompany })
  }

  return (
    <div className={cn('space-y-3', isPending && 'opacity-80')}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          list="members-search-suggestions"
          autoComplete="off"
          placeholder="Search by name, company, or career field…"
          className="pl-12 pr-4 h-13 text-base rounded-full border-border shadow-sm focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label="Search members"
        />
        <datalist id="members-search-suggestions">
          {suggestionOptions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <select
            value={industry}
            onChange={(e) => onIndustryChange(e.target.value)}
            className="h-9 appearance-none rounded-full border border-border bg-background pl-4 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            aria-label="Filter by career field"
          >
            <option value="">Career field</option>
            {industries.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>

        <div className="relative">
          <select
            value={company}
            onChange={(e) => {
              const value = e.target.value
              setCompany(value)
              navigate({ company: value })
            }}
            className="h-9 appearance-none rounded-full border border-border bg-background pl-4 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            aria-label="Filter by company"
          >
            <option value="">Company</option>
            {filteredCompanies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>

        <label
          className={cn(
            'inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm transition-colors select-none',
            alumniOnly
              ? 'border-[var(--gold)]/60 bg-[var(--gold)]/10 text-primary'
              : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
          )}
        >
          <input
            type="checkbox"
            checked={alumniOnly}
            onChange={(e) => {
              const checked = e.target.checked
              setAlumniOnly(checked)
              navigate({ alumni: checked })
            }}
            className="h-3.5 w-3.5 rounded border-border accent-[var(--gold)]"
          />
          Alumni only
        </label>

        <div className="relative">
          <select
            value={sort}
            onChange={(e) => {
              const value = e.target.value as MemberSearchSort
              setSort(value)
              navigate({ sort: value })
            }}
            className="h-9 appearance-none rounded-full border border-border bg-background pl-4 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            aria-label="Sort members"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>

        {hasFilters && (
          <Link
            href="/members"
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              'h-9 rounded-full px-4 text-muted-foreground gap-1.5'
            )}
            onClick={() => {
              setQ('')
              setIndustry('')
              setCompany('')
              setAlumniOnly(false)
              setSort('name')
            }}
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Link>
        )}
      </div>

      <div className="flex items-center gap-3">
        <SearchScopeToggle currentScope={searchScope} />
        <span className="text-xs text-muted-foreground">
          Switch between your chapter and all chapters
        </span>
      </div>
    </div>
  )
}

export function parseMemberSearchSort(value: string | undefined): MemberSearchSort {
  if (value === 'class_asc' || value === 'class_desc' || value === 'chapter' || value === 'name') {
    return value
  }
  return 'name'
}
