import Link from 'next/link'
import { SearchX } from 'lucide-react'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getCurrentUserProfile, getSearchFilters } from '@/lib/tenant'
import { getChapterAdminContacts } from '@/lib/chapter-admins'
import { getUnreadConversations } from '@/lib/unread'
import { setSearchScope } from '@/actions/chapter-admin'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, buttonVariants } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { PendingMembersGate } from '@/components/members/PendingMembersGate'
import { HomeTips } from '@/components/members/HomeTips'
import { MemberCard, type MemberCardData } from '@/components/members/MemberCard'
import { SearchToolbar } from '@/components/members/SearchToolbar'
import { WaitingOnYou, type WaitingProfile } from '@/components/members/WaitingOnYou'
import { buildMembersQuery, parseMemberSearchSort, type SearchState } from '@/lib/member-search'
import { SEARCH_SCOPE, STATUS } from '@/lib/constants'

const PAGE_SIZE = 48
const MAX_PAGES = 5
/** The search RPC caps each call at 100 rows; fetch in chunks up to this many. */
const RPC_CHUNK = 100
const MAX_RESULTS = 300

function firstParam(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined
  return Array.isArray(value) ? value[0] : value
}

function uuidOrNull(value: string | undefined): string | null {
  const v = value?.trim()
  return v ? v : null
}

type SearchRow = {
  profile_id: string
  first_name: string
  last_name: string
  avatar_url: string | null
  role?: string
  current_company: string | null
  graduation_year?: number | null
  chapter_name?: string | null
  school_name?: string | null
}

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const raw = await searchParams
  const q = (firstParam(raw.q) ?? '').trim()
  const filterIndustryId = uuidOrNull(firstParam(raw.industry))
  const filterCompanyId = uuidOrNull(firstParam(raw.company))
  const alumniOnly = firstParam(raw.alumni) === '1'
  const sort = parseMemberSearchSort(firstParam(raw.sort))
  const page = Math.min(MAX_PAGES, Math.max(1, parseInt(firstParam(raw.page) ?? '1', 10) || 1))
  const shown = PAGE_SIZE * page

  const supabase = await createClient()
  const userProfile = await getCurrentUserProfile()
  const searchFilters = userProfile
    ? await getSearchFilters(userProfile)
    : { filter_fraternity_id: null, filter_chapter_id: null, viewer_chapter_id: null }

  const isPending = userProfile?.status === STATUS.PENDING_APPROVAL
  const isActive = userProfile?.status === STATUS.ACTIVE

  const rpcParams = {
    search_query: q,
    filter_industry_id: filterIndustryId,
    filter_company_id: filterCompanyId,
    filter_fraternity_id: searchFilters.filter_fraternity_id,
    filter_chapter_id: searchFilters.filter_chapter_id,
    viewer_chapter_id: searchFilters.viewer_chapter_id,
    result_limit: RPC_CHUNK,
    result_offset: 0,
    sort_by: sort,
  }

  // Members with a company come first so the directory leads with people who
  // can actually refer. The RPC sorts by name only, so collect everything (in
  // 100-row chunks) and order here.
  async function fetchAllResults(): Promise<SearchRow[]> {
    if (isPending) return []
    const rows: SearchRow[] = []
    for (let offset = 0; offset < MAX_RESULTS; offset += RPC_CHUNK) {
      const params = { ...rpcParams, result_offset: offset }
      const { data } = alumniOnly
        ? await supabase.rpc('search_alumni', params)
        : await supabase.rpc('search_members', { ...params, filter_alumni_only: alumniOnly })
      const chunk = (data ?? []) as SearchRow[]
      rows.push(...chunk)
      if (chunk.length < RPC_CHUNK) break
    }
    // Chunk boundaries can repeat a row when two members share a name.
    const seen = new Set<string>()
    return rows.filter((r) => (seen.has(r.profile_id) ? false : (seen.add(r.profile_id), true)))
  }

  // Pending members never get directory rows — not even blurred in the HTML.
  const [{ data: industries }, { data: companies }, results, unread, tipsRow] = await Promise.all([
    supabase.from('industries').select('id, name').order('name'),
    supabase.from('companies').select('id, name, industry_id').eq('status', 'active').order('name'),
    fetchAllResults(),
    isActive ? getUnreadConversations() : Promise.resolve([]),
    userProfile
      ? supabase.from('profiles').select('home_tips_dismissed_at').eq('id', userProfile.id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  // Tolerate the column not existing yet (migration pending): hide the tips rather than crash.
  const showTips = Boolean(isActive && tipsRow && !tipsRow.error && tipsRow.data && !tipsRow.data.home_tips_dismissed_at)

  // Senders may have hidden themselves from search; the viewer is still a
  // participant in the thread, so look them up with the service role.
  const waitingIds = new Set(unread.map((u) => u.other_profile_id))
  const { data: waitingProfiles } = waitingIds.size
    ? await createAdminClient()
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, role')
        .in('id', Array.from(waitingIds))
    : { data: [] as WaitingProfile[] }
  const waitingMap = Object.fromEntries(((waitingProfiles ?? []) as WaitingProfile[]).map((p) => [p.id, p]))
  const waitingCount = unread.filter((u) => waitingMap[u.other_profile_id]).length

  const byName = (a: MemberCardData, b: MemberCardData) =>
    a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name)

  const allMembers: MemberCardData[] = results
    .map((person) => ({
      profile_id: person.profile_id,
      first_name: person.first_name,
      last_name: person.last_name,
      avatar_url: person.avatar_url,
      role: alumniOnly ? 'alumni' : (person.role ?? 'undergrad'),
      current_company: person.current_company,
      graduation_year: person.graduation_year ?? null,
      chapter_name: person.chapter_name ?? null,
      school_name: person.school_name ?? null,
    }))
    .filter((m) => !waitingIds.has(m.profile_id))

  if (sort === 'name') {
    const withCompany = allMembers.filter((m) => m.current_company).sort(byName)
    const withoutCompany = allMembers.filter((m) => !m.current_company).sort(byName)
    allMembers.splice(0, allMembers.length, ...withCompany, ...withoutCompany)
  }
  const members = allMembers.slice(0, shown)

  const isFraternityWide = userProfile?.search_scope !== SEARCH_SCOPE.CHAPTER
  const adminContacts = isPending ? await getChapterAdminContacts(userProfile?.chapter_id) : null

  const searchState: SearchState = {
    q,
    industry: filterIndustryId ?? '',
    company: filterCompanyId ?? '',
    alumni: alumniOnly,
    sort,
  }
  const hasFilters = Boolean(q || filterIndustryId || filterCompanyId || alumniOnly || sort !== 'name')
  const hasMore = allMembers.length > shown && page < MAX_PAGES
  const baseHref = buildMembersQuery(searchState)
  const moreHref = `${baseHref}${baseHref.includes('?') ? '&' : '?'}page=${page + 1}`

  return (
    <div className="space-y-6">
      <PageHeader
        size="display"
        title="Find a Brother"
        description={
          isPending
            ? 'Member profiles unlock after a chapter admin approves your account.'
            : isFraternityWide
              ? 'Search every chapter in the fraternity by name, company, or career field.'
              : 'Search your chapter by name, company, or career field.'
        }
      />

      {isActive && <WaitingOnYou unread={unread} profiles={waitingMap} />}
      {showTips && <HomeTips canMessage />}

      {!isPending && (
        <SearchToolbar
          initial={searchState}
          searchScope={userProfile?.search_scope ?? SEARCH_SCOPE.FRATERNITY}
          industries={industries ?? []}
          companies={companies ?? []}
        />
      )}

      {isPending && adminContacts ? (
        <PendingMembersGate adminContacts={adminContacts} />
      ) : members.length === 0 ? (
        <Empty className="py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="size-12 rounded-xl [&_svg]:size-6">
              <SearchX aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle className="heading-3">{alumniOnly ? 'No alumni match' : 'No brothers match'}</EmptyTitle>
            <EmptyDescription>
              {hasFilters
                ? 'Try fewer filters or a broader search.'
                : isFraternityWide
                  ? 'Nobody is in the directory yet. Invite brothers from the admin dashboard.'
                  : 'Your chapter has no other members in the directory yet.'}
              {!isFraternityWide && ' Searching all chapters usually finds someone.'}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row flex-wrap justify-center">
            {hasFilters && (
              <Link href="/members" className={buttonVariants({ variant: 'outline' })}>
                Clear filters
              </Link>
            )}
            {!isFraternityWide && (
              <form action={setSearchScope.bind(null, SEARCH_SCOPE.FRATERNITY)}>
                <Button type="submit">Search all chapters</Button>
              </form>
            )}
          </EmptyContent>
        </Empty>
      ) : (
        <section aria-labelledby="results-heading" className="space-y-3">
          <p id="results-heading" className="text-sm text-muted-foreground" aria-live="polite">
            {hasMore ? `${members.length} of ${allMembers.length} brothers` : `${allMembers.length} ${allMembers.length === 1 ? 'brother' : 'brothers'}`}
            {waitingCount > 0 ? ` · ${waitingCount} waiting on you above` : ''}
          </p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((person) => (
              <li key={person.profile_id}>
                <MemberCard member={person} showChapter={isFraternityWide} backHref={page > 1 ? `${baseHref}${baseHref.includes('?') ? '&' : '?'}page=${page}` : baseHref} />
              </li>
            ))}
          </ul>
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Link href={moreHref} className={buttonVariants({ variant: 'outline' })} scroll={false}>
                Show more
              </Link>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
