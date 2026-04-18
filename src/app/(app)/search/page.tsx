import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchParams {
  q?: string
  industry?: string
  company?: string
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { q, industry, company } = await searchParams
  const supabase = await createClient()

  const [{ data: industries }, { data: companies }, { data: results }] = await Promise.all([
    supabase.from('industries').select('id, name').order('name'),
    supabase.from('companies').select('id, name').eq('status', 'active').order('name'),
    supabase.rpc('search_alumni', {
      search_query: q ?? '',
      filter_industry_id: industry ?? null,
      filter_company_id: company ?? null,
      result_limit: 100,
      result_offset: 0,
    }),
  ])

  const alumni = results ?? []
  const hasFilters = !!(q || industry || company)

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-5xl text-primary" style={{ fontFamily: 'var(--font-heading)', letterSpacing: '0.0em' }}>
          Find a Brother
        </h1>
      </div>

      {/* Search & filters */}
      <form className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
          <Input
            key={q ?? ''}
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
              defaultValue={industry ?? ''}
              className="h-9 appearance-none rounded-full border border-border bg-background pl-4 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            >
              <option value="">Industry</option>
              {industries?.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>

          <div className="relative">
            <select
              name="company"
              defaultValue={company ?? ''}
              className="h-9 appearance-none rounded-full border border-border bg-background pl-4 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            >
              <option value="">Company</option>
              {companies?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>

          <Button type="submit" size="sm" className="h-9 rounded-full px-5">
            Search
          </Button>

          {hasFilters && (
            <Link
              href="/search"
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-9 rounded-full px-4 text-muted-foreground gap-1.5')}
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </Link>
          )}
        </div>
      </form>

      {/* Results count */}
      {hasFilters && (
        <p className="text-sm text-muted-foreground">
          {alumni.length} {alumni.length === 1 ? 'result' : 'results'}
        </p>
      )}

      {/* Alumni grid */}
      {alumni.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="font-medium">No alumni found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {alumni.map((person: any) => (
              <Link key={person.profile_id} href={`/alumni/${person.profile_id}`}>
                <div className="rounded-xl overflow-hidden shadow-sm border border-border group cursor-pointer transition-shadow hover:shadow-md">
                  {/* Photo */}
                  <div className="relative aspect-square bg-primary/8">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={person.avatar_url ?? '/images/default-avatar.svg'}
                      alt={`${person.first_name} ${person.last_name}`}
                      className="w-full h-full object-cover"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-primary/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <span className="text-white text-sm font-semibold tracking-wide">View Profile</span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="bg-white px-3 py-2.5">
                    <p className="font-semibold text-sm truncate">
                      {person.first_name} {person.last_name}
                    </p>
                    {person.current_company ? (
                      <p className="text-xs text-muted-foreground truncate">{person.current_company}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground/40 truncate">No company listed</p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
    </div>
  )
}
