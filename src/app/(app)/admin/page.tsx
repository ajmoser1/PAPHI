import { Suspense } from 'react'
import { requireChapterAdmin } from '@/lib/auth'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { ROLES } from '@/lib/constants'
import { ALUMNI_CONTACT_VISIBLE_SELECT, hasVisibleContact, type VisibleContactInput } from '@/lib/contact'
import { inviteRegisterUrl, getSiteOrigin } from '@/lib/site'
import { getUxPreviewModeForRole } from '@/lib/ux-preview'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { AdminSectionBar, type AdminSection } from '@/components/admin/AdminSectionBar'
import { StatTile } from '@/components/admin/StatTile'
import { ApprovalList, type PendingMember } from '@/components/admin/ApprovalList'
import { MembersTable, type ActiveMember } from '@/components/admin/MembersTable'
import { InviteLinkCard } from '@/components/admin/InviteLinkCard'
import { BrandingForm } from '@/components/admin/BrandingForm'
import { CreateCompanyForm } from '@/components/admin/CreateCompanyForm'
import { CompanyAdminList, type AdminCompany } from '@/components/admin/CompanyAdminList'
import { CreateIndustryForm } from '@/components/admin/CreateIndustryForm'
import { IndustryAdminList, type AdminIndustry } from '@/components/admin/IndustryAdminList'
import { ChapterRequestsList, type ChapterRequest } from '@/components/founder/ChapterRequestsList'
import { ChaptersList, type ChapterRow } from '@/components/founder/ChaptersList'
import { UxPreviewMenu } from '@/components/founder/UxPreviewMenu'

type ProfileRow = {
  id: string
  first_name: string
  last_name: string
  role: string
  created_at: string
  chapter_id: string | null
  avatar_url: string | null
  graduation_year: number | null
}

function SectionCard({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <Card id={id} className="scroll-mt-32">
      <CardHeader>
        <CardTitle as="h2" className="heading-3">
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export default async function AdminDashboardPage() {
  let ctx: Awaited<ReturnType<typeof requireChapterAdmin>>
  try {
    ctx = await requireChapterAdmin()
  } catch {
    return (
      <div className="space-y-6">
        <PageHeader title="Admin dashboard" />
        <Empty className="py-14">
          <EmptyHeader>
            <EmptyTitle className="heading-3">No chapter assigned to your admin account</EmptyTitle>
            <EmptyDescription>Ask the founder to assign you to a chapter from the Chapters section of their dashboard. Until then there is nothing to manage here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }
  const { profile, adminClient, userId } = ctx
  const isFounder = profile.role === ROLES.FOUNDER
  const chapterId = profile.chapter_id
  const chapterScoped = !isFounder && Boolean(chapterId)
  const uxPreviewMode = await getUxPreviewModeForRole(profile.role)

  // --- Members ---------------------------------------------------------------
  let pendingQuery = adminClient
    .from('profiles')
    .select('id, first_name, last_name, role, created_at, chapter_id, avatar_url, graduation_year')
    .eq('status', 'pending_approval')
    .order('created_at', { ascending: true })
  if (chapterScoped) pendingQuery = pendingQuery.eq('chapter_id', chapterId!)

  let activeQuery = adminClient
    .from('profiles')
    .select('id, first_name, last_name, role, created_at, chapter_id, avatar_url, graduation_year')
    .eq('status', 'active')
    .not('role', 'in', `(${ROLES.FOUNDER},${ROLES.CHAPTER_ADMIN},${ROLES.ADMIN})`)
    .order('created_at', { ascending: false })
  if (chapterScoped) activeQuery = activeQuery.eq('chapter_id', chapterId!)

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [{ data: pending }, { data: active }, { count: messagesThisMonth }, { data: companies }, { data: industries }, chapterRes] =
    await Promise.all([
      pendingQuery,
      activeQuery,
      isFounder
        ? adminClient.from('messages').select('id', { count: 'exact', head: true }).gte('created_at', monthStart.toISOString())
        : Promise.resolve({ count: null as number | null }),
      adminClient.from('companies').select('id, name, status, website, industry_id, suggested_by, industries(name)').order('name'),
      adminClient.from('industries').select('id, name, slug').order('name'),
      chapterId
        ? adminClient.from('chapters').select('id, display_title, tagline, school_name, primary_color, accent_color, invite_token').eq('id', chapterId).maybeSingle()
        : Promise.resolve({ data: null }),
    ])

  const pendingList = (pending ?? []) as ProfileRow[]
  const activeList = (active ?? []) as ProfileRow[]
  const chapter = chapterRes.data

  const pendingIds = pendingList.map((p) => p.id)
  const { data: contacts } = pendingIds.length
    ? await adminClient.from('alumni_contact').select(`profile_id, ${ALUMNI_CONTACT_VISIBLE_SELECT}`).in('profile_id', pendingIds)
    : { data: [] }
  const contactByProfile = Object.fromEntries(((contacts ?? []) as (VisibleContactInput & { profile_id: string })[]).map((c) => [c.profile_id, c]))

  const chapterIds = [...new Set([...pendingList, ...activeList].map((p) => p.chapter_id).filter((id): id is string => Boolean(id)))]
  const { data: chapterRows } = chapterIds.length
    ? await adminClient.from('chapters').select('id, name, school_name').in('id', chapterIds)
    : { data: [] }
  const chapterLabelById = Object.fromEntries(
    ((chapterRows ?? []) as { id: string; name: string; school_name: string | null }[]).map((ch) => [ch.id, ch.school_name ? `${ch.name} — ${ch.school_name}` : ch.name])
  )

  const pendingMembers: PendingMember[] = pendingList.map((p) => {
    const c = contactByProfile[p.id]
    return {
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      role: p.role,
      created_at: p.created_at,
      avatar_url: p.avatar_url,
      chapterLabel: p.chapter_id ? (chapterLabelById[p.chapter_id] ?? null) : null,
      canApprove: hasVisibleContact(c),
      phone: c?.phone?.trim() || null,
      email: c?.email?.trim() || null,
      linkedin: c?.linkedin_url?.trim() || null,
    }
  })
  const activeMembers: ActiveMember[] = activeList.map((p) => ({
    id: p.id,
    first_name: p.first_name,
    last_name: p.last_name,
    role: p.role,
    created_at: p.created_at,
    avatar_url: p.avatar_url,
    graduation_year: p.graduation_year,
    chapterLabel: p.chapter_id ? (chapterLabelById[p.chapter_id] ?? null) : null,
  }))
  const withoutPhoto = activeList.filter((p) => !p.avatar_url).length

  // --- Companies / fields ----------------------------------------------------
  const companyList = (companies ?? []) as unknown as AdminCompany[]
  const industryRows = (industries ?? []) as { id: string; name: string; slug: string }[]
  const missingField = companyList.filter((c) => !c.industry_id && c.status !== 'rejected').length
  const usage = new Map<string, { companyCount: number; positionCount: number }>()
  if (industryRows.length) {
    const ids = industryRows.map((i) => i.id)
    const [{ data: companyRows }, { data: positionRows }] = await Promise.all([
      adminClient.from('companies').select('industry_id').in('industry_id', ids),
      adminClient.from('positions').select('industry_id').in('industry_id', ids),
    ])
    for (const id of ids) usage.set(id, { companyCount: 0, positionCount: 0 })
    for (const row of companyRows ?? []) if (row.industry_id) usage.get(row.industry_id)!.companyCount += 1
    for (const row of positionRows ?? []) if (row.industry_id) usage.get(row.industry_id)!.positionCount += 1
  }
  const industryList: AdminIndustry[] = industryRows.map((i) => ({ ...i, ...(usage.get(i.id) ?? { companyCount: 0, positionCount: 0 }) }))

  // --- Founder ---------------------------------------------------------------
  let requests: ChapterRequest[] = []
  let chapters: ChapterRow[] = []
  if (isFounder) {
    const host = new URL(getSiteOrigin()).host
    const [{ data: reqs }, { data: chs }] = await Promise.all([
      adminClient.from('chapter_requests').select('id, chapter_name, school_name, contact_name, contact_email').eq('status', 'pending').order('created_at', { ascending: true }),
      adminClient.from('chapters').select('id, slug, name, school_name, status, invite_token, contact_email').order('name'),
    ])
    requests = (reqs ?? []) as ChapterRequest[]
    chapters = ((chs ?? []) as Array<Omit<ChapterRow, 'inviteUrl' | 'host'> & { invite_token: string }>).map((ch) => ({
      id: ch.id,
      slug: ch.slug,
      name: ch.name,
      school_name: ch.school_name,
      status: ch.status,
      contact_email: ch.contact_email,
      inviteUrl: inviteRegisterUrl(ch.invite_token, userId),
      host,
    }))
  }

  const inviteUrl = chapter?.invite_token ? inviteRegisterUrl(chapter.invite_token, userId) : null

  const sections: AdminSection[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'approvals', label: 'Approvals', count: pendingMembers.length },
    { id: 'members', label: 'Members' },
    ...(chapter ? [{ id: 'branding', label: 'Branding' }] : []),
    { id: 'catalog', label: 'Companies & fields' },
    ...(isFounder ? [{ id: 'chapters', label: 'Chapters', count: requests.length }] : []),
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin dashboard"
        description={
          chapter?.display_title
            ? `Everything for ${chapter.display_title}: approvals, members, branding, and the company list.`
            : 'Approvals, members, branding, and the company list in one place.'
        }
        actions={isFounder ? <UxPreviewMenu currentMode={uxPreviewMode} /> : undefined}
      />

      <AdminSectionBar sections={sections} />

      <section id="overview" aria-label="Overview" className="grid scroll-mt-32 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Pending approval" value={pendingMembers.length} href="#approvals" tone={pendingMembers.length ? 'warning' : 'neutral'} hint={pendingMembers.length ? 'Waiting on you' : 'All caught up'} />
        <StatTile label="Active members" value={activeMembers.length} href="#members" tone="brand" />
        <StatTile label="Without a photo" value={withoutPhoto} href="#members" tone={withoutPhoto ? 'warning' : 'neutral'} hint="They are asked to add one on sign-in" />
        {isFounder ? (
          <StatTile label="Messages this month" value={messagesThisMonth ?? 0} href="#members" hint="Across the whole platform" />
        ) : (
          <StatTile label="Companies missing a field" value={missingField} href="#catalog" tone={missingField ? 'warning' : 'neutral'} hint="Filters work better when every company has one" />
        )}
      </section>

      <SectionCard
        id="approvals"
        title={pendingMembers.length ? `${pendingMembers.length} waiting for approval` : 'Nobody waiting for approval'}
        description="Check the phone number and name match a real brother before approving. Members need a visible contact method first."
      >
        {pendingMembers.length ? (
          <ApprovalList members={pendingMembers} />
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">New registrations show up here. Share your invite link to bring brothers in.</p>
            {inviteUrl && <InviteLinkCard inviteUrl={inviteUrl} emptyPending />}
          </div>
        )}
        {pendingMembers.length > 0 && inviteUrl && (
          <div className="mt-6">
            <InviteLinkCard inviteUrl={inviteUrl} />
          </div>
        )}
      </SectionCard>

      <SectionCard id="members" title={`${activeMembers.length} active ${activeMembers.length === 1 ? 'member' : 'members'}`} description="Everyone approved in your chapter. Removing a member suspends their account.">
        {activeMembers.length ? <MembersTable members={activeMembers} /> : <p className="text-sm text-muted-foreground">No active members yet.</p>}
      </SectionCard>

      {chapter && (
        <SectionCard id="branding" title="Branding" description="Your chapter's name, tagline, and colors. Changes apply to every member's view.">
          <BrandingForm chapter={chapter} />
        </SectionCard>
      )}

      <SectionCard id="catalog" title="Companies and career fields" description="Keep the lists members pick from clean, so Find a Brother filters stay useful.">
        <Tabs defaultValue="companies">
          <TabsList>
            <TabsTrigger value="companies">
              Companies
              {missingField > 0 && <span className="ml-1 rounded-full bg-warning-soft px-1.5 text-xs text-warning-soft-foreground">{missingField}</span>}
            </TabsTrigger>
            <TabsTrigger value="fields">Career fields</TabsTrigger>
          </TabsList>
          <TabsContent value="companies" className="space-y-5 pt-3">
            <CreateCompanyForm industries={industryRows} />
            <Suspense fallback={<Skeleton className="h-40" />}>
              <CompanyAdminList companies={companyList} industries={industryRows} isFounder={isFounder} />
            </Suspense>
          </TabsContent>
          <TabsContent value="fields" className="space-y-5 pt-3">
            {isFounder && <CreateIndustryForm />}
            <IndustryAdminList industries={industryList} isFounder={isFounder} />
          </TabsContent>
        </Tabs>
      </SectionCard>

      {isFounder && (
        <SectionCard id="chapters" title="Chapters" description="Approve chapter requests, copy invite links, and assign chapter admins.">
          <div className="space-y-6">
            <div>
              <h3 className="heading-4 mb-3">{requests.length ? `${requests.length} chapter ${requests.length === 1 ? 'request' : 'requests'}` : 'No chapter requests'}</h3>
              {requests.length ? <ChapterRequestsList requests={requests} /> : <p className="text-sm text-muted-foreground">Requests from the Start a chapter page appear here.</p>}
            </div>
            <div>
              <h3 className="heading-4 mb-3">All chapters</h3>
              <ChaptersList chapters={chapters} />
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  )
}
