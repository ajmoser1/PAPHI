import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Next.js may pass repeated keys as string[]; HTML forms use "" for unselected <select>. */
function firstParam(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined
  return Array.isArray(value) ? value[0] : value
}

function uuidOrNull(value: string | undefined): string | null {
  const v = value?.trim()
  return v ? v : null
}

type MemberResult = {
  profile_id: string
  first_name: string
  last_name: string
  avatar_url: string | null
  role: string
  current_company: string | null
  graduation_year: number | null
}

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const raw = await searchParams
  const q = (firstParam(raw.q) ?? '').trim()
  const industryParam = firstParam(raw.industry)
  const companyParam = firstParam(raw.company)
  const filterIndustryId = uuidOrNull(industryParam)
  const filterCompanyId = uuidOrNull(companyParam)

  const supabase = await createClient()

  const [{ data: industries }, { data: companies }, { data: results }] = await Promise.all([
    supabase.from('industries').select('id, name').order('name'),
    supabase.from('companies').select('id, name').eq('status', 'active').order('name'),
    supabase.rpc('search_members', {
      search_query: q,
      filter_industry_id: filterIndustryId,
      filter_company_id: filterCompanyId,
      result_limit: 100,
      result_offset: 0,
    }),
  ])

  const members = (results ?? []) as MemberResult[]
  const hasFilters = !!(q || filterIndustryId || filterCompanyId)

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-5xl text-primary"
          style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.1em' }}
        >
          Find a Brother
        </h1>
        <p className="mt-2 text-muted-foreground">
          Search all members — undergrads and alumni — across the chapter.
        </p>
      </div>

      <form method="get" className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
          <Input
            key={q}
            name="q"
            defaultValue={q}
            placeholder="Search by name, company, or industry…"
            className="pl-12 pr-4 h-13 text-base rounded-full border-border shadow-sm focus-visible:ring-2 focus-visible:ring-primary/40"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <select
              name="industry"
              defaultValue={filterIndustryId ?? ''}
              className="h-9 appearance-none rounded-full border border-border bg-background pl-4 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            >
              <option value="">Industry</option>
              {industries?.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>

          <div className="relative">
            <select
              name="company"
              defaultValue={filterCompanyId ?? ''}
              className="h-9 appearance-none rounded-full border border-border bg-background pl-4 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            >
              <option value="">Company</option>
              {companies?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>

          <Button type="submit" size="sm" className="h-9 rounded-full px-5">
            Search
          </Button>

          {hasFilters && (
            <Link
              href="/members"
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                'h-9 rounded-full px-4 text-muted-foreground gap-1.5'
              )}
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </Link>
          )}
        </div>
      </form>

      {hasFilters && (
        <p className="text-sm text-muted-foreground">
          {members.length} {members.length === 1 ? 'result' : 'results'}
        </p>
      )}

      {members.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="font-medium">No members found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {members.map((person) => {
            const isAlumni = person.role === 'alumni'
            return (
              <Link key={person.profile_id} href={`/members/${person.profile_id}`}>
                <div
                  className={cn(
                    'rounded-xl overflow-hidden shadow-sm border group cursor-pointer transition-shadow hover:shadow-md',
                    isAlumni ? 'border-[var(--gold)]/60 ring-1 ring-[var(--gold)]/20' : 'border-border'
                  )}
                >
                  <div className="relative aspect-square bg-primary/8">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={person.avatar_url ?? '/images/default-avatar.svg'}
                      alt={`${person.first_name} ${person.last_name}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2">
                      <Badge
                        variant={isAlumni ? 'default' : 'secondary'}
                        className={cn(
                          'text-[10px] uppercase tracking-wide',
                          isAlumni && 'bg-[var(--gold)] text-primary hover:bg-[var(--gold)]'
                        )}
                      >
                        {isAlumni ? 'Alumni' : 'Undergrad'}
                      </Badge>
                    </div>
                    <div className="absolute inset-0 bg-primary/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <span className="text-white text-sm font-semibold tracking-wide">
                        View Profile
                      </span>
                    </div>
                  </div>

                  <div className="bg-white px-3 py-2.5">
                    <p className="font-semibold text-sm truncate">
                      {person.first_name} {person.last_name}
                    </p>
                    {person.current_company ? (
                      <p className="text-xs text-muted-foreground truncate">
                        {person.current_company}
                      </p>
                    ) : person.graduation_year ? (
                      <p className="text-xs text-muted-foreground truncate">
                        Class of {person.graduation_year}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground/40 truncate">No company listed</p>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
